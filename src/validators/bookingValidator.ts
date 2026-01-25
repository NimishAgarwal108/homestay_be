import Joi from 'joi';

// Room type capacity limits - CORRECTED: All rooms = 3 guests each
const ROOM_CAPACITY = {
  "Family Suite": 9,             // 3 guests/room × 3 rooms max
  "Deluxe Mountain View": 6,     // 3 guests/room × 2 rooms max
  "Cozy Mountain Cabin": 3,      // 3 guests/room × 1 room max
} as const;

const MAX_ROOMS_PER_TYPE = {
  "Family Suite": 3,
  "Deluxe Mountain View": 2,
  "Cozy Mountain Cabin": 1,
} as const;

const CAPACITY_PER_ROOM = {
  "Family Suite": 3,
  "Deluxe Mountain View": 3,
  "Cozy Mountain Cabin": 3,
} as const;

export const createBookingSchema = Joi.object({
  room: Joi.string()
    .required()
    .regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.empty': 'Room is required',
      'string.pattern.base': 'Invalid room ID format',
      'any.required': 'Room is required'
    }),

  checkIn: Joi.alternatives()
    .try(
      Joi.date().iso(),
      Joi.string().isoDate()
    )
    .required()
    .messages({
      'alternatives.match': 'Check-in must be a valid date',
      'any.required': 'Check-in date is required'
    }),

  checkOut: Joi.alternatives()
    .try(
      Joi.date().iso(),
      Joi.string().isoDate()
    )
    .required()
    .messages({
      'alternatives.match': 'Check-out must be a valid date',
      'any.required': 'Check-out date is required'
    }),

  guests: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .required()
    .messages({
      'number.base': 'Number of guests must be a number',
      'number.min': 'At least 1 guest is required',
      'number.max': 'Maximum 20 guests allowed',
      'number.integer': 'Number of guests must be a whole number',
      'any.required': 'Number of guests is required'
    }),

  children: Joi.number()
    .integer()
    .min(0)
    .max(Joi.ref('guests'))
    .optional()
    .messages({
      'number.base': 'Number of children must be a number',
      'number.min': 'Children cannot be negative',
      'number.max': 'Children cannot exceed total guests',
      'number.integer': 'Number of children must be a whole number'
    }),

  numberOfRooms: Joi.number()
    .integer()
    .min(1)
    .max(6)
    .required()
    .custom((value, helpers) => {
      const { guests } = helpers.state.ancestors[0];
      
      // Check if enough rooms for guests (3 per room)
      const requiredRooms = Math.ceil(guests / 3);
      if (value < requiredRooms) {
        return helpers.message({
          custom: `You need at least ${requiredRooms} room(s) for ${guests} guests (3 guests per room)`
        });
      }
      
      return value;
    })
    .messages({
      'number.base': 'Number of rooms must be a number',
      'number.min': 'At least 1 room is required',
      'number.max': 'Maximum 6 rooms allowed',
      'number.integer': 'Number of rooms must be a whole number',
      'any.required': 'Number of rooms is required'
    }),

  adults: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.base': 'Number of adults must be a number',
      'number.min': 'At least 1 adult is required',
      'number.integer': 'Number of adults must be a whole number'
    }),

  guestName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .pattern(/^[a-zA-Z\s'-]+$/)
    .messages({
      'string.empty': 'Guest name is required',
      'string.min': 'Guest name must be at least 2 characters',
      'string.max': 'Guest name cannot exceed 100 characters',
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens and apostrophes',
      'any.required': 'Guest name is required'
    }),

  guestEmail: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Guest email is required',
      'string.email': 'Please enter a valid email address',
      'any.required': 'Guest email is required'
    }),

  guestPhone: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.empty': 'Guest phone is required',
      'string.pattern.base': 'Phone number must be exactly 10 digits and start with 6-9',
      'any.required': 'Guest phone is required'
    }),

  nights: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Nights must be a number',
      'number.min': 'Booking must be for at least 1 night',
      'number.integer': 'Number of nights must be a whole number',
      'any.required': 'Number of nights is required'
    }),

  pricePerNight: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Price per night must be a number',
      'number.min': 'Price per night cannot be negative',
      'any.required': 'Price per night is required'
    }),

  totalPrice: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Total price must be a number',
      'number.min': 'Total price cannot be negative',
      'any.required': 'Total price is required'
    }),

  taxAmount: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Tax amount must be a number',
      'number.min': 'Tax amount cannot be negative'
    }),

  discountAmount: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Discount amount must be a number',
      'number.min': 'Discount amount cannot be negative'
    }),

  specialRequests: Joi.string()
    .trim()
    .allow('')
    .optional()
    .custom((value, helpers) => {
      if (value && value.trim()) {
        const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > 30) {
          return helpers.message({
            custom: `Special requests must be 30 words or less (currently ${wordCount} words)`
          });
        }
      }
      return value;
    })
    .messages({
      'string.base': 'Special requests must be a string'
    }),

  paymentStatus: Joi.string()
    .valid('pending', 'paid', 'refunded')
    .default('pending')
    .messages({
      'any.only': 'Payment status must be pending, paid, or refunded'
    }),

  status: Joi.string()
    .valid('pending', 'confirmed', 'cancelled', 'completed')
    .default('confirmed')
    .messages({
      'any.only': 'Status must be pending, confirmed, cancelled, or completed'
    })
});

export const updateBookingSchema = Joi.object({
  checkIn: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'Check-in must be a valid date'
    }),

  checkOut: Joi.date()
    .iso()
    .when('checkIn', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('checkIn')),
      otherwise: Joi.date()
    })
    .optional()
    .messages({
      'date.base': 'Check-out must be a valid date',
      'date.greater': 'Check-out date must be after check-in date'
    }),

  guests: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .optional()
    .messages({
      'number.base': 'Number of guests must be a number',
      'number.min': 'At least 1 guest is required',
      'number.max': 'Maximum 20 guests allowed',
      'number.integer': 'Number of guests must be a whole number'
    }),

  children: Joi.number()
    .integer()
    .min(0)
    .max(Joi.ref('guests'))
    .optional()
    .messages({
      'number.base': 'Number of children must be a number',
      'number.min': 'Children cannot be negative',
      'number.max': 'Children cannot exceed total guests',
      'number.integer': 'Number of children must be a whole number'
    }),

  numberOfRooms: Joi.number()
    .integer()
    .min(1)
    .max(6)
    .optional()
    .custom((value, helpers) => {
      const { guests } = helpers.state.ancestors[0];
      
      if (guests && value) {
        const requiredRooms = Math.ceil(guests / 3);
        if (value < requiredRooms) {
          return helpers.message({
            custom: `You need at least ${requiredRooms} room(s) for ${guests} guests (3 guests per room)`
          });
        }
      }
      
      return value;
    })
    .messages({
      'number.base': 'Number of rooms must be a number',
      'number.min': 'At least 1 room is required',
      'number.max': 'Maximum 6 rooms allowed',
      'number.integer': 'Number of rooms must be a whole number'
    }),

  status: Joi.string()
    .valid('pending', 'confirmed', 'cancelled', 'completed')
    .optional()
    .messages({
      'any.only': 'Status must be pending, confirmed, cancelled, or completed'
    }),

  paymentStatus: Joi.string()
    .valid('pending', 'paid', 'refunded')
    .optional()
    .messages({
      'any.only': 'Payment status must be pending, paid, or refunded'
    }),

  specialRequests: Joi.string()
    .trim()
    .allow('')
    .optional()
    .custom((value, helpers) => {
      if (value && value.trim()) {
        const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > 30) {
          return helpers.message({
            custom: `Special requests must be 30 words or less (currently ${wordCount} words)`
          });
        }
      }
      return value;
    })
    .messages({
      'string.base': 'Special requests must be a string'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const checkAvailabilitySchema = Joi.object({
  roomId: Joi.string()
    .required()
    .regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.empty': 'Room ID is required',
      'string.pattern.base': 'Invalid room ID format',
      'any.required': 'Room ID is required'
    }),

  checkIn: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.base': 'Check-in must be a valid date',
      'date.min': 'Check-in date cannot be in the past',
      'any.required': 'Check-in date is required'
    }),

  checkOut: Joi.date()
    .iso()
    .greater(Joi.ref('checkIn'))
    .required()
    .messages({
      'date.base': 'Check-out must be a valid date',
      'date.greater': 'Check-out date must be after check-in date',
      'any.required': 'Check-out date is required'
    }),

  excludeBookingId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid booking ID format'
    })
});

// Export constants for use in controllers
export { ROOM_CAPACITY, MAX_ROOMS_PER_TYPE, CAPACITY_PER_ROOM };