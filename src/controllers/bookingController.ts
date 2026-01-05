import { Request, Response } from 'express';
import Booking from '../models/Booking';

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 * @access  Public (can be changed to Protected later)
 */
export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      room,
      checkIn,
      checkOut,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      nights,
      pricePerNight,
      totalPrice,
      taxAmount,
      discountAmount
    } = req.body;

    // Validation
    if (!room || !checkIn || !checkOut || !guests || !guestName || !guestEmail || !guestPhone) {
      res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
      return;
    }

    // Check for overlapping bookings
    const overlappingBooking = await Booking.findOverlapping(
      room,
      new Date(checkIn),
      new Date(checkOut)
    );

    if (overlappingBooking) {
      res.status(400).json({
        success: false,
        message: 'Room is not available for selected dates'
      });
      return;
    }

    // Calculate nights if not provided
    let calculatedNights = nights;
    if (!calculatedNights) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      calculatedNights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Create booking
    const booking = await Booking.create({
      user: (req as any).user?.id, // If user is authenticated
      room,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      guests,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      nights: calculatedNights,
      taxAmount: taxAmount || 0,
      discountAmount: discountAmount || 0,
      status: 'pending',
      paymentStatus: 'pending'
    });

    // Populate room details
    await booking.populate('room', 'name type price images');

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking
      }
    });
  } catch (error: any) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get all bookings
 * @route   GET /api/bookings
 * @access  Private (Admin/Host only)
 */
export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = '1', limit = '10', sortBy = '-createdAt' } = req.query;

    const query: any = {};
    if (status) query.status = status;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const bookings = await Booking.find(query)
      .populate('room', 'name type price images')
      .populate('user', 'name email')
      .sort(sortBy as string)
      .skip(skip)
      .limit(limitNum);

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get booking by ID
 * @route   GET /api/bookings/:id
 * @access  Private
 */
export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('room', 'name type price images amenities')
      .populate('user', 'name email phone');

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        booking
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Update booking
 * @route   PUT /api/bookings/:id
 * @access  Private (Admin/Host only)
 */
export const updateBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, paymentStatus, checkIn, checkOut, guests } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // Update fields
    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (checkIn) booking.checkIn = new Date(checkIn);
    if (checkOut) booking.checkOut = new Date(checkOut);
    if (guests) booking.guests = guests;

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: {
        booking
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Cancel booking
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private
 */
export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cancellationReason } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    // Check if booking can be cancelled
    if (!booking.canBeCancelled()) {
      res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled (less than 24 hours before check-in or already completed/cancelled)'
      });
      return;
    }

    booking.status = 'cancelled';
    booking.cancellationReason = cancellationReason;
    booking.cancelledAt = new Date();
    booking.cancelledBy = (req as any).user?.id;

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Delete booking
 * @route   DELETE /api/bookings/:id
 * @access  Private (Admin only)
 */
export const deleteBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
      return;
    }

    await booking.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get my bookings (for authenticated users)
 * @route   GET /api/bookings/my-bookings
 * @access  Private
 */
export const getMyBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
      return;
    }

    const bookings = await Booking.find({ user: userId })
      .populate('room', 'name type price images')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: {
        bookings,
        count: bookings.length
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Check room availability
 * @route   POST /api/bookings/check-availability
 * @access  Public
 */
export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId, checkIn, checkOut } = req.body;

    if (!roomId || !checkIn || !checkOut) {
      res.status(400).json({
        success: false,
        message: 'Please provide roomId, checkIn, and checkOut dates'
      });
      return;
    }

    const overlapping = await Booking.findOverlapping(
      roomId,
      new Date(checkIn),
      new Date(checkOut)
    );

    res.status(200).json({
      success: true,
      data: {
        available: !overlapping,
        message: overlapping 
          ? 'Room is not available for selected dates' 
          : 'Room is available'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};