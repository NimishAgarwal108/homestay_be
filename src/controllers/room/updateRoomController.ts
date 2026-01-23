import { Request, Response } from 'express';
import Room from '../../models/Room';

/**
 * @desc    Update room
 * @route   PUT /api/rooms/:id
 * @access  Private (Admin only)
 */
export const updateRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      data: { room }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};