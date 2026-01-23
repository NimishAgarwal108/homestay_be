import { Request, Response } from 'express';
import Room from '../../models/Room';
import Booking from '../../models/Booking';

/**
 * @desc    Get room availability calendar (30 days)
 * @route   GET /api/rooms/:id/availability-calendar
 * @access  Public
 */
export const getRoomAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: roomId } = req.params;
    const { startDate } = req.query;

    const room = await Room.findOne({ 
      _id: roomId,
      isAvailable: true 
    });
    
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found or not available'
      });
      return;
    }

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 30);

    const bookings = await Booking.find({
      room: roomId,
      status: { $in: ['pending', 'confirmed'] },
      checkIn: { $lt: end },
      checkOut: { $gt: start }
    }).select('checkIn checkOut status');

    console.log(`📅 Found ${bookings.length} bookings for room ${roomId}`);

    const bookedDates = new Set<string>();

    bookings.forEach(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        bookedDates.add(d.toISOString().split('T')[0]);
      }
    });

    console.log(`🔴 Total booked dates: ${bookedDates.size}`);

    const availability = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      availability.push({
        date: dateString,
        available: !bookedDates.has(dateString)
      });
    }

    res.status(200).json({
      success: true,
      roomId,
      roomName: room.name,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      availability
    });

  } catch (error: any) {
    console.error('❌ Error fetching room availability:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching room availability'
    });
  }
};

/**
 * @desc    Check if specific dates are available for a room
 * @route   GET /api/rooms/:id/check-dates
 * @access  Public
 */
export const checkDateAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: roomId } = req.params;
    const { checkInDate, checkOutDate } = req.query;

    console.log('🔍 Checking availability:', { roomId, checkInDate, checkOutDate });

    if (!checkInDate || !checkOutDate) {
      res.status(400).json({
        success: false,
        message: 'Check-in and check-out dates are required'
      });
      return;
    }

    const room = await Room.findOne({ 
      _id: roomId,
      isAvailable: true 
    });
    
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found or not available'
      });
      return;
    }

    const checkInStr = checkInDate as string;
    const checkOutStr = checkOutDate as string;

    console.log('📅 Date strings:', {
      checkIn: checkInStr,
      checkOut: checkOutStr
    });

    if (checkOutStr <= checkInStr) {
      res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
      return;
    }

    const checkInDateObj = new Date(checkInStr + 'T00:00:00.000Z');
    const checkOutDateObj = new Date(checkOutStr + 'T00:00:00.000Z');

    const conflictingBooking = await Booking.findOne({
      room: roomId,
      status: { $in: ['pending', 'confirmed'] },
      checkIn: { $lt: checkOutDateObj },
      checkOut: { $gt: checkInDateObj }
    });

    if (conflictingBooking) {
      console.log('❌ Found conflicting booking:', {
        id: conflictingBooking._id,
        checkIn: conflictingBooking.checkIn,
        checkOut: conflictingBooking.checkOut,
        status: conflictingBooking.status
      });
    } else {
      console.log('✅ No conflicts found - dates are available');
    }

    const isAvailable = !conflictingBooking;

    res.status(200).json({
      success: true,
      data: {
        available: isAvailable,
        message: isAvailable 
          ? 'Room is available for selected dates' 
          : 'Room is not available for selected dates',
        conflictingBooking: conflictingBooking ? {
          checkIn: conflictingBooking.checkIn,
          checkOut: conflictingBooking.checkOut,
          status: conflictingBooking.status
        } : null
      }
    });

  } catch (error: any) {
    console.error('❌ Error checking date availability:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking availability'
    });
  }
};