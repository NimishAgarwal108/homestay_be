import mongoose, { Document, Schema, Model, HydratedDocument } from 'mongoose';

// Interface for Booking Document
export interface IBooking extends Document {
  user?: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  guests: number;
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
    required: [true, 'Check-in date is required'],
    validate: {
      validator: function(value: Date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return value >= today;
      },
      message: 'Check-in date cannot be in the past'
    }
  },
  checkOut: {
    type: Date,
    required: [true, 'Check-out date is required']
  },
  guests: {
    type: Number,
    required: [true, 'Number of guests is required'],
    min: [1, 'At least 1 guest is required'],
    max: [10, 'Maximum 10 guests allowed']
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
    default: 'pending'
  },
  specialRequests: {
    type: String,
    maxlength: [500, 'Special requests cannot exceed 500 characters'],
    trim: true
  },
  guestName: {
    type: String,
    required: [true, 'Guest name is required'],
    trim: true,
    minlength: [2, 'Guest name must be at least 2 characters'],
    maxlength: [100, 'Guest name cannot exceed 100 characters']
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
    match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number (10-15 digits)']
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
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ bookingReference: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ guestEmail: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================

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
  // Generate booking reference if not exists
  if (!this.bookingReference) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.bookingReference = `BK${timestamp}${random}`;
  }
  
  // Calculate nights if not provided
  if (!this.nights) {
    const diffTime = Math.abs(this.checkOut.getTime() - this.checkIn.getTime());
    this.nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // Calculate total price if not provided
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

// Method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function(this: HydratedDocument<IBooking>): boolean {
  const now = new Date();
  const checkInDate = new Date(this.checkIn);
  const hoursDiff = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  return this.status !== 'completed' && 
         this.status !== 'cancelled' && 
         hoursDiff > 24;
};

// Method to calculate total price
bookingSchema.methods.calculateTotalPrice = function(this: HydratedDocument<IBooking>, pricePerNight: number): number {
  const basePrice = pricePerNight * this.nights;
  const tax = this.taxAmount || 0;
  const discount = this.discountAmount || 0;
  return basePrice + tax - discount;
};

// Method to get booking duration
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

// Static method to find overlapping bookings
bookingSchema.statics.findOverlapping = function(
  roomId: string, 
  checkIn: Date, 
  checkOut: Date, 
  excludeBookingId?: string
): Promise<IBooking | null> {
  const query: any = {
    room: roomId,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      { checkIn: { $lte: checkOut, $gte: checkIn } },
      { checkOut: { $lte: checkOut, $gte: checkIn } },
      { checkIn: { $lte: checkIn }, checkOut: { $gte: checkOut } }
    ]
  };
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  return this.findOne(query);
};

// Static method to get bookings by date range
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

// Static method to calculate revenue by date range
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

// Export the model
export default mongoose.model<IBooking, IBookingModel>('Booking', bookingSchema);