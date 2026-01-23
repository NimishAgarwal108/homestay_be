import { Document, Model, Query } from 'mongoose';

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

export interface IUserQueryHelpers {
  active(): Query<any, IUser, IUserQueryHelpers> & IUserQueryHelpers;
  verified(): Query<any, IUser, IUserQueryHelpers> & IUserQueryHelpers;
  byRole(role: string): Query<any, IUser, IUserQueryHelpers> & IUserQueryHelpers;
}

export interface IUserModel extends Model<IUser, IUserQueryHelpers> {
  findByEmail(email: string): Promise<IUser | null>;
  findVerifiedUsers(): Promise<IUser[]>;
  getUsersByRole(role: string): Promise<IUser[]>;
  searchUsers(query: string): Promise<IUser[]>;
  getUserStats(): Promise<any>;
}