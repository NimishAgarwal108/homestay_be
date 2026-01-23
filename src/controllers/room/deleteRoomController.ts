import { Request, Response } from 'express';
import Room from '../../models/Room';

/**
 * @desc    Delete room
 * @route   DELETE /api/rooms/:id
 * @access  Private (Admin only)
 */
export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    await room.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};