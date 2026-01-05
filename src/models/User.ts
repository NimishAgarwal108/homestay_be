import mongoose, { Document, Schema, Model, HydratedDocument, Query } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Interface for User Document
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'user' | 'host' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  avatar?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  preferences?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    newsletter: boolean;
  };
  otp?: string;
  otpExpiry?: Date;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateOTP(): string;
  generatePasswordResetToken(): string;
  generateEmailVerificationToken(): string;
  isLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  updateLastLogin(): Promise<void>;
}

// Interface for query helpers
interface IUserQueryHelpers {
  active(): Query<any, IUser, IUserQueryHelpers> & IUserQueryHelpers;
  verified(): Query<any, IUser, IUserQueryHelpers> & IUserQueryHelpers;
  byRole(role: string): Query<any, IUser, IUserQueryHelpers> & IUserQueryHelpers;
}

// Interface for User Model (static methods)
interface IUserModel extends Model<IUser, IUserQueryHelpers> {
  findByEmail(email: string): Promise<IUser | null>;
  findVerifiedUsers(): Promise<IUser[]>;
  getUsersByRole(role: string): Promise<IUser[]>;
  searchUsers(query: string): Promise<IUser[]>;
  getUserStats(): Promise<any>;
}

const userSchema = new Schema<IUser, IUserModel, {}, IUserQueryHelpers>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10,15}$/, 'Please enter a valid phone number (10-15 digits)']
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'host', 'admin'],
      message: '{VALUE} is not a valid role'
    },
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  avatar: {
    type: String,
    default: null
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: { type: String, trim: true }
  },
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    newsletter: { type: Boolean, default: false }
  },
  otp: {
    type: String,
    select: false
  },
  otpExpiry: {
    type: Date,
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpiry: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpiry: {
    type: Date,
    select: false
  },
  refreshToken: {
    type: String,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from the returned object
      const obj = ret as any;
      delete obj.password;
      delete obj.otp;
      delete obj.otpExpiry;
      delete obj.resetPasswordToken;
      delete obj.resetPasswordExpiry;
      delete obj.emailVerificationToken;
      delete obj.emailVerificationExpiry;
      delete obj.refreshToken;
      return obj;
    }
  },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isVerified: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Text index for search
userSchema.index({ name: 'text', email: 'text' });

// ============================================
// VIRTUALS
// ============================================

// Virtual for full name (if you want to split name later)
userSchema.virtual('displayName').get(function(this: HydratedDocument<IUser>) {
  return this.name;
});

// Virtual for account age
userSchema.virtual('accountAge').get(function(this: HydratedDocument<IUser>) {
  if (!this.createdAt) return null;
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''}`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) !== 1 ? 's' : ''}`;
});

// Virtual for account status
userSchema.virtual('accountStatus').get(function(this: HydratedDocument<IUser>) {
  if (!this.isActive) return 'Inactive';
  if (this.isLocked()) return 'Locked';
  if (!this.isVerified) return 'Unverified';
  return 'Active';
});

// Virtual for initials
userSchema.virtual('initials').get(function(this: HydratedDocument<IUser>) {
  const names = this.name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Hash password before saving
userSchema.pre('save', async function(this: HydratedDocument<IUser>) {
  // Only hash if password is modified
  if (!this.isModified('password')) return;
  
  // Generate salt and hash password
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Update email to lowercase before saving
userSchema.pre('save', function(this: HydratedDocument<IUser>) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
});

// Clear reset token fields if password is changed
userSchema.pre('save', function(this: HydratedDocument<IUser>) {
  if (this.isModified('password') && !this.isNew) {
    this.resetPasswordToken = undefined;
    this.resetPasswordExpiry = undefined;
  }
});

// ============================================
// INSTANCE METHODS
// ============================================

// Compare password method
userSchema.methods.comparePassword = async function(this: HydratedDocument<IUser>, candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Generate OTP
userSchema.methods.generateOTP = function(this: HydratedDocument<IUser>): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function(this: HydratedDocument<IUser>): string {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  return resetToken;
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function(this: HydratedDocument<IUser>): string {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  this.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return verificationToken;
};

// Check if account is locked
userSchema.methods.isLocked = function(this: HydratedDocument<IUser>): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function(this: HydratedDocument<IUser>): Promise<void> {
  // If previous lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < new Date()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts >= 5 && !this.isLocked()) {
      this.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
    }
  }
  
  await this.save();
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function(this: HydratedDocument<IUser>): Promise<void> {
  if (this.loginAttempts > 0 || this.lockUntil) {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    await this.save();
  }
};

// Update last login
userSchema.methods.updateLastLogin = async function(this: HydratedDocument<IUser>): Promise<void> {
  this.lastLogin = new Date();
  await this.save();
};

// ============================================
// STATIC METHODS
// ============================================

// Find user by email
userSchema.statics.findByEmail = function(email: string): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

// Find all verified users
userSchema.statics.findVerifiedUsers = function(): Promise<IUser[]> {
  return this.find({ isVerified: true, isActive: true })
    .sort({ createdAt: -1 });
};

// Get users by role
userSchema.statics.getUsersByRole = function(role: string): Promise<IUser[]> {
  return this.find({ role, isActive: true })
    .sort({ createdAt: -1 });
};

// Search users
userSchema.statics.searchUsers = function(query: string): Promise<IUser[]> {
  return this.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } }
    ],
    isActive: true
  })
  .limit(20)
  .sort({ createdAt: -1 });
};

// Get user statistics
userSchema.statics.getUserStats = async function(): Promise<any> {
  const [totalUsers, verifiedUsers, roleStats, recentUsers] = await Promise.all([
    this.countDocuments({ isActive: true }),
    this.countDocuments({ isVerified: true, isActive: true }),
    this.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]),
    this.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt')
  ]);

  return {
    totalUsers,
    verifiedUsers,
    unverifiedUsers: totalUsers - verifiedUsers,
    roleDistribution: roleStats.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    recentUsers
  };
};

// ============================================
// QUERY HELPERS
// ============================================

// Query helper to find active users
userSchema.query.active = function(this: Query<any, IUser, IUserQueryHelpers> & IUserQueryHelpers) {
  return this.where({ isActive: true });
};

// Query helper to find verified users
userSchema.query.verified = function(this: Query<any, IUser, IUserQueryHelpers> & IUserQueryHelpers) {
  return this.where({ isVerified: true });
};

// Query helper to find by role
userSchema.query.byRole = function(this: Query<any, IUser, IUserQueryHelpers> & IUserQueryHelpers, role: string) {
  return this.where({ role });
};

// ============================================
// POST MIDDLEWARE
// ============================================

// Log user creation
userSchema.post('save', function(doc: HydratedDocument<IUser>) {
  console.log(`New user registered: ${doc.email} with role: ${doc.role}`);
});

// Log user deletion
userSchema.post('deleteOne', { document: true, query: false }, function(doc: HydratedDocument<IUser>) {
  console.log(`User deleted: ${doc.email}`);
});

// ============================================
// CUSTOM VALIDATION
// ============================================

// Validate phone number only if provided
userSchema.path('phone').validate(function(value: string) {
  if (!value) return true; // Allow empty/null
  return /^[0-9]{10,15}$/.test(value);
}, 'Invalid phone number format');

// Export the model
export default mongoose.model<IUser, IUserModel>('User', userSchema);