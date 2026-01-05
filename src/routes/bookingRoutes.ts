import express from 'express';
import {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  deleteBooking,
  getMyBookings,
  checkAvailability
} from '../controllers/bookingController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @route   POST /api/bookings/check-availability
 * @desc    Check room availability
 * @access  Public
 */
router.post('/check-availability', checkAvailability);

/**
 * @route   GET /api/bookings/my-bookings
 * @desc    Get logged-in user's bookings
 * @access  Private
 */
router.get('/my-bookings', protect, getMyBookings);

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Public (guests can book without login)
 */
router.post('/', createBooking);

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings with filters
 * @access  Private (Admin/Host only)
 */
router.get('/', protect, authorize('admin', 'host'), getAllBookings);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get single booking by ID
 * @access  Private
 */
router.get('/:id', protect, getBookingById);

/**
 * @route   PUT /api/bookings/:id
 * @desc    Update booking
 * @access  Private (Admin/Host only)
 */
router.put('/:id', protect, authorize('admin', 'host'), updateBooking);

/**
 * @route   PATCH /api/bookings/:id/cancel
 * @desc    Cancel a booking
 * @access  Private
 */
router.patch('/:id/cancel', protect, cancelBooking);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Delete a booking
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, authorize('admin'), deleteBooking);

export default router;