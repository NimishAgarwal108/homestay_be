import { Request, Response } from 'express';
import Room from '../../models/Room';

/**
 * @desc    Get single room by ID (PUBLIC - only if available)
 * @route   GET /api/rooms/:id
 * @access  Public
 */
export const getRoomById = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await Room.findOne({ 
      _id: req.params.id,
      isAvailable: true 
    });

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found or not available'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { room }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * @desc    Get single room by ID (ADMIN - any room)
 * @route   GET /api/admin/rooms/:id
 * @access  Private (Admin only)
 */
export const getRoomByIdAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { room }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};