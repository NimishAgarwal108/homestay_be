import { Request, Response } from 'express';
import Room from '../../models/Room';

/**
 * @desc    Get all rooms (PUBLIC - only available rooms)
 * @route   GET /api/rooms
 * @access  Public
 */
export const getAllRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { available, minPrice, maxPrice, capacity } = req.query;

    // Build query - ALWAYS filter for available rooms on public endpoint
    const query: any = { isAvailable: true };
    
    if (available === 'false') {
      delete query.isAvailable;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    if (capacity) {
      query.capacity = { $gte: Number(capacity) };
    }

    const rooms = await Room.find(query).sort({ price: 1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
      data: rooms
    });
  } catch (error: any) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get ALL rooms (ADMIN - including unavailable)
 * @route   GET /api/admin/rooms
 * @access  Private (Admin only)
 */
export const getAllRoomsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { available, minPrice, maxPrice, capacity } = req.query;

    const query: any = {};
    
    if (available === 'true') {
      query.isAvailable = true;
    } else if (available === 'false') {
      query.isAvailable = false;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    if (capacity) {
      query.capacity = { $gte: Number(capacity) };
    }

    const rooms = await Room.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
      data: rooms
    });
  } catch (error: any) {
    console.error('Get all rooms (admin) error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};