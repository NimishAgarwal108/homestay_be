import express from 'express';
import {
  getAllRooms,
  getAllRoomsAdmin,
  getRoomById,
  getRoomByIdAdmin,
  createRoom,
  updateRoom,
  deleteRoom,
  toggleRoomAvailability,
  getRoomAvailability,
  checkDateAvailability
} from '../controllers/room';
import { adminAuth } from '../middleware/adminAuth';

const router = express.Router();

/**
 * IMPORTANT: Specific routes MUST come before generic /:id routes
 * Admin routes are now at the router level, not nested
 */

// ========================================
// ADMIN ROUTES (Protected) - at /rooms level
// ========================================

/**
 * @route   GET /api/rooms/admin/all
 * @desc    Get ALL rooms (including unavailable) - ADMIN ONLY
 * @access  Private (Admin only)
 */
router.get('/admin/all', adminAuth, getAllRoomsAdmin);

/**
 * @route   GET /api/rooms/admin/:id
 * @desc    Get single room by ID (any room) - ADMIN ONLY
 * @access  Private (Admin only)
 */
router.get('/admin/:id', adminAuth, getRoomByIdAdmin);

// ========================================
// PUBLIC ROUTES
// ========================================

/**
 * @route   GET /api/rooms
 * @desc    Get all AVAILABLE rooms (with optional filters)
 * @access  Public
 */
router.get('/', getAllRooms);

/**
 * @route   POST /api/rooms
 * @desc    Create new room
 * @access  Private (Admin only)
 */
router.post('/', adminAuth, createRoom);

/**
 * @route   GET /api/rooms/:id/availability-calendar
 * @desc    Get room availability calendar (30 days)
 * @access  Public
 */
router.get('/:id/availability-calendar', getRoomAvailability);

/**
 * @route   GET /api/rooms/:id/check-dates
 * @desc    Check if specific dates are available
 * @access  Public
 */
router.get('/:id/check-dates', checkDateAvailability);

/**
 * @route   PATCH /api/rooms/:id/toggle-availability
 * @desc    Toggle room availability (enable/disable)
 * @access  Private (Admin only)
 */
router.patch('/:id/toggle-availability', adminAuth, toggleRoomAvailability);

/**
 * @route   GET /api/rooms/:id
 * @desc    Get single AVAILABLE room by ID
 * @access  Public
 */
router.get('/:id', getRoomById);

/**
 * @route   PUT /api/rooms/:id
 * @desc    Update room
 * @access  Private (Admin only)
 */
router.put('/:id', adminAuth, updateRoom);

/**
 * @route   DELETE /api/rooms/:id
 * @desc    Delete room
 * @access  Private (Admin only)
 */
router.delete('/:id', adminAuth, deleteRoom);

export default router;