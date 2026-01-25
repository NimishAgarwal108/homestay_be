import mongoose, { Document, Schema, Model, HydratedDocument } from 'mongoose';

// Interface for Booking Document
export interface IBooking extends Document {
  user?: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  children: number; // ✅ ADDED - Optional field
  numberOfRooms: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  specialRequests?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'upi' | 'online';
  bookingReference: string;
  nights: number;
  pricePerNight: number;
  taxAmount?: number;
  discountAmount?: number;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  checkInTime?: Date;
  checkOutTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  canBeCancelled(): boolean;
  calculateTotalPrice(pricePerNight: number): number;
  getBookingDuration(): string;
}

// Interface for Booking Model (static methods)
interface IBookingModel extends Model<IBooking> {
  findOverlapping(
    roomId: string, 
    checkIn: Date, 
    checkOut: Date, 
    excludeBookingId?: string
  ): Promise<IBooking | null>;
  getBookingsByDateRange(startDate: Date, endDate: Date): Promise<IBooking[]>;
  getRevenueByDateRange(startDate: Date, endDate: Date): Promise<number>;
}

const bookingSchema = new Schema<IBooking, IBookingModel>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required']
  },
  checkIn: {
    type: Date,
    required: [true, 'Check-in date is required']
  },
  checkOut: {
    type: Date,
    required: [true, 'Check-out date is required']
  },
  guests: {
    type: Number,
    required: [true, 'Number of guests is required'],
    min: [1, 'At least 1 guest is required'],
    max: [20, 'Maximum 20 guests allowed']
  },
  children: { // ✅ ADDED - Optional field
    type: Number,
    default: 0,
    min: [0, 'Children cannot be negative'],
    validate: {
      validator: function(this: IBooking, value: number) {
        return value <= this.guests;
      },
      message: 'Children cannot exceed total guests'
    }
  },
  numberOfRooms: {
    type: Number,
    required: [true, 'Number of rooms is required'],
    min: [1, 'At least 1 room is required'],
    max: [6, 'Maximum 6 rooms allowed']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Price cannot be negative']
  },
  pricePerNight: {
    type: Number,
    required: [true, 'Price per night is required'],
    min: [0, 'Price per night cannot be negative']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'cancelled', 'completed'],
      message: '{VALUE} is not a valid status'
    },
    default: 'confirmed'
  },
  specialRequests: {
    type: String,
    maxlength: [1000, 'Special requests cannot exceed 1000 characters'],
    trim: true,
    validate: {
      validator: function(value: string) {
        if (!value || value.trim() === '') return true;
        const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
        return wordCount <= 30;
      },
      message: 'Special requests must be 30 words or less'
    }
  },
  guestName: {
    type: String,
    required: [true, 'Guest name is required'],
    trim: true,
    minlength: [2, 'Guest name must be at least 2 characters'],
    maxlength: [100, 'Guest name cannot exceed 100 characters'],
    validate: {
      validator: function(value: string) {
        return /^[a-zA-Z\s'-]+$/.test(value);
      },
      message: 'Guest name can only contain letters, spaces, hyphens and apostrophes'
    }
  },
  guestEmail: {
    type: String,
    required: [true, 'Guest email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  guestPhone: {
    type: String,
    required: [true, 'Guest phone is required'],
    trim: true,
    validate: {
      validator: function(value: string) {
        const digitsOnly = value.replace(/\D/g, '');
        return /^[6-9]\d{9}$/.test(digitsOnly);
      },
      message: 'Phone number must be exactly 10 digits starting with 6-9'
    }
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'refunded'],
      message: '{VALUE} is not a valid payment status'
    },
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: {
      values: ['cash', 'card', 'upi', 'online'],
      message: '{VALUE} is not a valid payment method'
    }
  },
  bookingReference: {
    type: String,
    unique: true,
    uppercase: true
  },
  nights: {
    type: Number,
    required: true,
    min: [1, 'Booking must be for at least 1 night']
  },
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ room: 1, status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ bookingReference: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ guestEmail: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================

// Virtual for adults count
bookingSchema.virtual('adults').get(function(this: HydratedDocument<IBooking>) {
  return this.guests - (this.children || 0);
});

// Virtual for booking duration
bookingSchema.virtual('duration').get(function(this: HydratedDocument<IBooking>) {
  return `${this.nights} night${this.nights > 1 ? 's' : ''}`;
});

// Virtual for formatted dates
bookingSchema.virtual('formattedCheckIn').get(function(this: HydratedDocument<IBooking>) {
  return this.checkIn.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

bookingSchema.virtual('formattedCheckOut').get(function(this: HydratedDocument<IBooking>) {
  return this.checkOut.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Generate booking reference before saving
bookingSchema.pre('save', function(this: HydratedDocument<IBooking>) {
  if (!this.bookingReference) {
    const prefix = 'BK';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.bookingReference = `${prefix}-${timestamp}-${random}`;
  }
  
  if (!this.nights) {
    const diffTime = Math.abs(this.checkOut.getTime() - this.checkIn.getTime());
    this.nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  if (this.pricePerNight && !this.totalPrice) {
    const basePrice = this.pricePerNight * this.nights;
    const tax = this.taxAmount || 0;
    const discount = this.discountAmount || 0;
    this.totalPrice = basePrice + tax - discount;
  }
});

// Update cancelled fields when status changes to cancelled
bookingSchema.pre('save', function(this: HydratedDocument<IBooking>) {
  if (this.isModified('status') && this.status === 'cancelled' && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }
});

// Custom validation for checkOut after checkIn
bookingSchema.pre('validate', function(this: HydratedDocument<IBooking>) {
  if (this.checkOut && this.checkIn && this.checkOut <= this.checkIn) {
    throw new Error('Check-out date must be after check-in date');
  }
});

// ============================================
// INSTANCE METHODS
// ============================================

bookingSchema.methods.canBeCancelled = function(this: HydratedDocument<IBooking>): boolean {
  const now = new Date();
  const checkInDate = new Date(this.checkIn);
  const hoursDiff = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  return this.status !== 'completed' && 
         this.status !== 'cancelled' && 
         hoursDiff > 24;
};

bookingSchema.methods.calculateTotalPrice = function(this: HydratedDocument<IBooking>, pricePerNight: number): number {
  const basePrice = pricePerNight * this.nights;
  const tax = this.taxAmount || 0;
  const discount = this.discountAmount || 0;
  return basePrice + tax - discount;
};

bookingSchema.methods.getBookingDuration = function(this: HydratedDocument<IBooking>): string {
  const checkIn = new Date(this.checkIn);
  const checkOut = new Date(this.checkOut);
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
};

// ============================================
// STATIC METHODS
// ============================================

bookingSchema.statics.findOverlapping = function(
  roomId: string, 
  checkIn: Date, 
  checkOut: Date, 
  excludeBookingId?: string
): Promise<IBooking | null> {
  const query: any = {
    room: roomId,
    status: { $in: ['pending', 'confirmed'] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn }
  };
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  return this.findOne(query);
};

bookingSchema.statics.getBookingsByDateRange = function(
  startDate: Date, 
  endDate: Date
): Promise<IBooking[]> {
  return this.find({
    checkIn: { $gte: startDate, $lte: endDate },
    status: { $in: ['pending', 'confirmed', 'completed'] }
  })
  .populate('room', 'name type price')
  .populate('user', 'name email')
  .sort({ checkIn: 1 });
};

bookingSchema.statics.getRevenueByDateRange = async function(
  startDate: Date, 
  endDate: Date
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        checkIn: { $gte: startDate, $lte: endDate },
        paymentStatus: 'paid',
        status: { $in: ['confirmed', 'completed'] }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalPrice' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0].totalRevenue : 0;
};

export default mongoose.model<IBooking, IBookingModel>('Booking', bookingSchema);