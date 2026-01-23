import { Request, Response } from 'express';
import Room from '../../models/Room';

/**
 * @desc    Create new room
 * @route   POST /api/rooms
 * @access  Private (Admin only)
 */
export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, type, description, price, capacity, amenities, images, features } = req.body;

    if (!name || !price || !capacity) {
      res.status(400).json({
        success: false,
        message: 'Please provide name, price, and capacity'
      });
      return;
    }

    const room = await Room.create({
      name,
      type,
      description,
      price,
      capacity,
      amenities: amenities || [],
      images: images || [],
      features: features || [],
      isAvailable: true
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { room }
    });
  } catch (error: any) {
    console.error('Create room error:', error);
    
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'A room with this name already exists'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};