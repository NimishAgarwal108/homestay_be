import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { HydratedDocument } from 'mongoose';
import { IUser } from './interfaces';
import { userSchema } from './schema';

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
  if (this.lockUntil && this.lockUntil < new Date()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
    
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
