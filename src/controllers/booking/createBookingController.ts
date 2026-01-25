import { Request, Response } from 'express';
import { BookingValidationService } from '../../services/bookingValidationService';
import { BookingService } from '../../services/bookingService';
import { MAX_ROOMS_PER_TYPE } from '../../validators/bookingValidator';

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      room: roomId,
      checkIn,
      checkOut,
      guests,
      children = 0, // Optional field with default
      numberOfRooms,
      guestName,
      guestEmail,
      guestPhone,
      nights,
      pricePerNight,
      totalPrice,
      taxAmount,
      discountAmount,
      paymentStatus,
      status,
      specialRequests
    } = req.body;

    console.log('📥 Received booking request:', {
      ...req.body,
      guestPhone: guestPhone ? '***' + guestPhone.slice(-4) : undefined // Mask phone for logs
    });

    // ✅ Validate guest name (no numbers)
    const nameValidation = BookingValidationService.validateGuestName(guestName);
    if (!nameValidation.isValid) {
      BookingValidationService.sendValidationError(res, nameValidation);
      return;
    }

    // ✅ Validate phone number (exactly 10 digits)
    const phoneValidation = BookingValidationService.validatePhoneNumber(guestPhone);
    if (!phoneValidation.isValid) {
      BookingValidationService.sendValidationError(res, phoneValidation);
      return;
    }

    // ✅ Validate children count
    if (children !== undefined) {
      const childrenValidation = BookingValidationService.validateChildren(children, guests);
      if (!childrenValidation.isValid) {
        BookingValidationService.sendValidationError(res, childrenValidation);
        return;
      }
    }

    // ✅ Validate special requests word count
    if (specialRequests) {
      const specialRequestsValidation = BookingValidationService.validateSpecialRequests(specialRequests);
      if (!specialRequestsValidation.isValid) {
        BookingValidationService.sendValidationError(res, specialRequestsValidation);
        return;
      }
    }

    // ✅ Validate room exists and is available
    const roomValidation = await BookingValidationService.validateRoom(roomId);
    if (!roomValidation.isValid) {
      BookingValidationService.sendValidationError(res, roomValidation);
      return;
    }

    const room = roomValidation.room;

    // ✅ Validate guest capacity based on room type
    const capacityValidation = BookingValidationService.validateGuestCapacityByRoomType(
      guests,
      room.name // Room name is the type (e.g., "Family Suite")
    );
    if (!capacityValidation.isValid) {
      BookingValidationService.sendValidationError(res, capacityValidation);
      return;
    }

    // ✅ Validate number of rooms by room type
    const roomCountValidation = BookingValidationService.validateNumberOfRoomsByType(
      numberOfRooms,
      room.name
    );
    if (!roomCountValidation.isValid) {
      BookingValidationService.sendValidationError(res, roomCountValidation);
      return;
    }

    // ✅ NEW: Validate sufficient rooms for guests (3 guests per room)
    const requiredRooms = Math.ceil(guests / 3);
    if (numberOfRooms < requiredRooms) {
      res.status(400).json({
        success: false,
        message: `You need at least ${requiredRooms} room(s) for ${guests} guests (3 guests per room). You selected ${numberOfRooms} room(s).`,
        error: 'Insufficient rooms for number of guests'
      });
      return;
    }

    // ✅ NEW: Validate doesn't exceed max rooms for this type
    const roomType = room.name as keyof typeof MAX_ROOMS_PER_TYPE;
    const maxRoomsForType = MAX_ROOMS_PER_TYPE[roomType];
    
    if (maxRoomsForType && numberOfRooms > maxRoomsForType) {
      res.status(400).json({
        success: false,
        message: `Maximum ${maxRoomsForType} room(s) available for ${room.name}. You requested ${numberOfRooms} room(s).`,
        error: 'Exceeds maximum available rooms for this room type'
      });
      return;
    }

    // Parse and validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // ✅ Check for booking conflicts
    const conflictCheck = await BookingValidationService.checkBookingConflict({
      roomId,
      checkInDate,
      checkOutDate
    });

    if (conflictCheck.hasConflict) {
      res.status(400).json({
        success: false,
        message: 'Room is not available for selected dates. Please choose different dates.',
        conflictingBooking: {
          checkIn: conflictCheck.conflictingBooking.checkIn,
          checkOut: conflictCheck.conflictingBooking.checkOut,
          bookingReference: conflictCheck.conflictingBooking.bookingReference
        }
      });
      return;
    }

    // ✅ Create booking with all validated data
    const booking = await BookingService.createBooking({
      user: (req as any).user?.id,
      room: roomId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      children,
      numberOfRooms,
      guestName,
      guestEmail,
      guestPhone,
      nights,
      pricePerNight,
      totalPrice,
      taxAmount,
      discountAmount,
      paymentStatus,
      status: 'confirmed',
      specialRequests: specialRequests || ''
    });

    // Send notification email
    await BookingService.sendBookingNotification(booking, room);

    console.log('✅ Booking created successfully:', {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      guests,
      children,
      numberOfRooms,
      roomType: room.name,
      requiredRooms,
      maxRoomsForType
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking
    });

  } catch (error: any) {
    console.error('❌ Create booking error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
      return;
    }

    // Handle duplicate booking reference
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Duplicate booking reference. Please try again.'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating booking'
    });
  }
};