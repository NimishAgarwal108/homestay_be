// src/services/bookingValidationService.ts
import { Response } from 'express';
import Room from '../models/Room';
import Booking from '../models/Booking';

interface ValidationResult {
  isValid: boolean;
  error?: string;
  statusCode?: number;
}

interface DateValidationParams {
  checkIn: string;
  checkOut: string;
}

interface BookingConflictParams {
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  excludeBookingId?: string;
}

// Room type capacity mapping - CORRECTED: All rooms = 3 guests per room
const ROOM_CAPACITY: { [key: string]: number } = {
  "Family Suite": 9,             // 3 guests/room × 3 rooms max
  "Deluxe Mountain View": 6,     // 3 guests/room × 2 rooms max
  "Cozy Mountain Cabin": 3,      // 3 guests/room × 1 room max
};

const MAX_ROOMS_PER_TYPE: { [key: string]: number } = {
  "Family Suite": 3,
  "Deluxe Mountain View": 2,
  "Cozy Mountain Cabin": 1,
};

const CAPACITY_PER_ROOM: { [key: string]: number } = {
  "Family Suite": 3,
  "Deluxe Mountain View": 3,
  "Cozy Mountain Cabin": 3,
};

export class BookingValidationService {
  /**
   * Validate required booking fields
   */
  static validateRequiredFields(data: any): ValidationResult {
    const requiredFields = [
      'room', 'checkIn', 'checkOut', 'guests', 'numberOfRooms',
      'guestName', 'guestEmail', 'guestPhone'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      return {
        isValid: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        statusCode: 400
      };
    }

    return { isValid: true };
  }

  /**
   * Validate room exists and is available
   */
  static async validateRoom(roomId: string): Promise<ValidationResult & { room?: any }> {
    const room = await Room.findById(roomId);

    if (!room) {
      return {
        isValid: false,
        error: 'Room not found',
        statusCode: 404
      };
    }

    if (!room.isAvailable) {
      return {
        isValid: false,
        error: 'This room is currently unavailable',
        statusCode: 400
      };
    }

    return { isValid: true, room };
  }

  /**
   * Validate guest name (no numbers allowed)
   */
  static validateGuestName(name: string): ValidationResult {
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    
    if (!nameRegex.test(name)) {
      return {
        isValid: false,
        error: 'Guest name can only contain letters, spaces, hyphens and apostrophes',
        statusCode: 400
      };
    }

    if (name.length < 2) {
      return {
        isValid: false,
        error: 'Guest name must be at least 2 characters',
        statusCode: 400
      };
    }

    if (name.length > 100) {
      return {
        isValid: false,
        error: 'Guest name cannot exceed 100 characters',
        statusCode: 400
      };
    }

    return { isValid: true };
  }

  /**
   * Validate phone number (exactly 10 digits)
   */
  static validatePhoneNumber(phone: string): ValidationResult {
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length !== 10) {
      return {
        isValid: false,
        error: 'Phone number must be exactly 10 digits',
        statusCode: 400
      };
    }

    // Indian mobile number format (starts with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(digitsOnly)) {
      return {
        isValid: false,
        error: 'Please enter a valid 10-digit phone number starting with 6-9',
        statusCode: 400
      };
    }

    return { isValid: true };
  }

  /**
   * Validate children count
   */
  static validateChildren(children: number, totalGuests: number): ValidationResult {
    if (children < 0) {
      return {
        isValid: false,
        error: 'Number of children cannot be negative',
        statusCode: 400
      };
    }

    if (children > totalGuests) {
      return {
        isValid: false,
        error: 'Number of children cannot exceed total guests',
        statusCode: 400
      };
    }

    if (children === totalGuests && totalGuests > 0) {
      return {
        isValid: false,
        error: 'At least 1 adult is required (children cannot book alone)',
        statusCode: 400
      };
    }

    return { isValid: true };
  }

  /**
   * Validate special requests word count
   */
  static validateSpecialRequests(specialRequests?: string): ValidationResult {
    if (!specialRequests || specialRequests.trim() === '') {
      return { isValid: true };
    }

    const wordCount = specialRequests.trim().split(/\s+/).filter(Boolean).length;
    
    if (wordCount > 30) {
      return {
        isValid: false,
        error: `Special requests must be 30 words or less (currently ${wordCount} words)`,
        statusCode: 400
      };
    }

    return { isValid: true };
  }

  /**
   * Validate guest capacity based on room type
   */
  static validateGuestCapacityByRoomType(
    guests: number, 
    roomType: string
  ): ValidationResult {
    const maxCapacity = ROOM_CAPACITY[roomType];
    
    if (!maxCapacity) {
      // Fallback to generic validation
      if (guests > 20) {
        return {
          isValid: false,
          error: 'Maximum 20 guests allowed',
          statusCode: 400
        };
      }
      return { isValid: true };
    }

    if (guests > maxCapacity) {
      return {
        isValid: false,
        error: `${roomType} can accommodate maximum ${maxCapacity} guests`,
        statusCode: 400
      };
    }

    return { isValid: true };
  }

  /**
   * Validate number of rooms by room type
   */
  static validateNumberOfRoomsByType(
    numberOfRooms: number,
    roomType: string
  ): ValidationResult {
    const maxRooms = MAX_ROOMS_PER_TYPE[roomType];
    
    if (!maxRooms) {
      // Fallback to generic validation
      if (numberOfRooms > 6) {
        return {
          isValid: false,
          error: 'Maximum 6 rooms allowed',
          statusCode: 400
        };
      }
      return { isValid: true };
    }

    if (numberOfRooms > maxRooms) {
      return {
        isValid: false,
        error: `Maximum ${maxRooms} ${roomType} room${maxRooms > 1 ? 's' : ''} available`,
        statusCode: 400
      };
    }

    return { isValid: true };
  }

  /**
   * Validate guest capacity matches room selection
   */
  static validateGuestsMatchRooms(
    guests: number,
    numberOfRooms: number,
    roomType: string
  ): ValidationResult {
    const capacityPerRoom = CAPACITY_PER_ROOM[roomType];
    
    if (!capacityPerRoom) {
      return { isValid: true }; // Skip validation if room type not found
    }

    const totalCapacity = capacityPerRoom * numberOfRooms;

    if (guests > totalCapacity) {
      const recommendedRooms = Math.ceil(guests / capacityPerRoom);
      const maxRooms = MAX_ROOMS_PER_TYPE[roomType] || 6;
      
      if (recommendedRooms > maxRooms) {
        return {
          isValid: false,
          error: `${guests} guests exceed capacity. ${roomType} can accommodate maximum ${totalCapacity} guests with ${maxRooms} rooms (3 guests per room)`,
          statusCode: 400
        };
      }

      return {
        isValid: false,
        error: `${guests} guests require at least ${recommendedRooms} rooms (3 guests per room)`,
        statusCode: 400
      };
    }

    return { isValid: true };
  }

  /**
   * Validate guest capacity (legacy method for backward compatibility)
   */
  static validateGuestCapacity(guests: number, roomCapacity: number): ValidationResult {
    if (guests > roomCapacity) {
      return {
        isValid: false,
        error: `This room can accommodate maximum ${roomCapacity} guests`,
        statusCode: 400
      };
    }

    return { isValid: true };
  }

  /**
   * Parse and validate dates
   */
  static validateDates(params: DateValidationParams): ValidationResult & { 
    checkInDate?: Date;
    checkOutDate?: Date;
  } {
    const checkInDate = new Date(params.checkIn + 'T00:00:00.000Z');
    const checkOutDate = new Date(params.checkOut + 'T00:00:00.000Z');

    // Check if checkout is after checkin
    if (checkOutDate <= checkInDate) {
      return {
        isValid: false,
        error: 'Check-out date must be after check-in date',
        statusCode: 400
      };
    }

    // Check if dates are not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
      return {
        isValid: false,
        error: 'Check-in date cannot be in the past',
        statusCode: 400
      };
    }

    return {
      isValid: true,
      checkInDate,
      checkOutDate
    };
  }

  /**
   * Check for booking conflicts
   * Note: Checkout day is available for new checkin
   */
  static async checkBookingConflict(params: BookingConflictParams): Promise<{
    hasConflict: boolean;
    conflictingBooking?: any;
  }> {
    const query: any = {
      room: params.roomId,
      status: { $in: ['pending', 'confirmed'] },
      checkIn: { $lt: params.checkOutDate },
      checkOut: { $gt: params.checkInDate }
    };

    // Exclude specific booking (for updates)
    if (params.excludeBookingId) {
      query._id = { $ne: params.excludeBookingId };
    }

    const conflictingBooking = await Booking.findOne(query);

    if (conflictingBooking) {
      console.log('❌ Conflicting booking found:', {
        bookingId: conflictingBooking._id,
        existingCheckIn: conflictingBooking.checkIn,
        existingCheckOut: conflictingBooking.checkOut,
        requestedCheckIn: params.checkInDate,
        requestedCheckOut: params.checkOutDate
      });

      return {
        hasConflict: true,
        conflictingBooking
      };
    }

    console.log('✅ No booking conflicts found');
    return { hasConflict: false };
  }

  /**
   * Send validation error response
   */
  static sendValidationError(res: Response, result: ValidationResult): void {
    res.status(result.statusCode || 400).json({
      success: false,
      message: result.error
    });
  }
}