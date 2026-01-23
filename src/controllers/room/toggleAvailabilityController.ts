import { Request, Response } from 'express';
import Room from '../../models/Room';

/**
 * @desc    Toggle room availability (enable/disable)
 * @route   PATCH /api/rooms/:id/toggle-availability
 * @access  Private (Admin only)
 */
export const toggleRoomAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    room.isAvailable = !room.isAvailable;
    await room.save();

    console.log(`✅ Room ${room.name} availability toggled to: ${room.isAvailable}`);

    res.status(200).json({
      success: true,
      message: `Room ${room.isAvailable ? 'enabled' : 'disabled'} successfully`,
      data: { room }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
