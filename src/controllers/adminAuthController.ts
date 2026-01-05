// src/controllers/adminAuthController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import Admin from '../models/Admin';

console.log('🟢 adminAuthController.ts loaded');

// Store OTPs temporarily (use Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ============= EXISTING FUNCTIONS (YOUR CODE) =============

// Admin Login
export const adminLogin = async (req: Request, res: Response) => {
  console.log('🟢 ========== ADMIN LOGIN CALLED ==========');
  console.log('🟢 Method:', req.method);
  console.log('🟢 Path:', req.path);
  console.log('🟢 Body:', req.body);
  console.log('🟢 =====================================');
  
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find admin and include password field
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated'
      });
    }

    // Compare password
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin._id, 
        email: admin.email,
        role: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin login'
    });
  }
};

// Get Admin Profile
export const getAdminProfile = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - adminId is added by auth middleware
    const admin = await Admin.findById(req.adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error: any) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Change Admin Password
export const changeAdminPassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // @ts-ignore
    const admin = await Admin.findById(req.adminId).select('+password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ============= NEW FORGOT PASSWORD FUNCTIONS =============

// Forgot Password - Send OTP
export const forgotPassword = async (req: Request, res: Response) => {
  console.log('🟢 ========== FORGOT PASSWORD CALLED ==========');
  console.log('🟢 Body:', req.body);
  
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Check if admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent',
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated. Contact system administrator.',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(email, { otp, expiresAt });

    console.log(`🔑 OTP Generated for ${email}: ${otp}`); // For development

    // Send OTP via email
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset OTP - Aamantran Homestay Admin',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>Hello ${admin.name},</p>
            <p>You have requested to reset your password for Aamantran Homestay Admin Panel.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Your OTP is:</p>
              <h1 style="margin: 10px 0; color: #2563eb; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p style="color: #ef4444; font-weight: bold;">This OTP will expire in 10 minutes.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px;">This is an automated email from Aamantran Homestay Admin System.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

// Verify OTP
export const verifyOTP = async (req: Request, res: Response) => {
  console.log('🟢 ========== VERIFY OTP CALLED ==========');
  console.log('🟢 Body:', req.body);
  
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    // Get stored OTP
    const storedData = otpStore.get(email);

    if (!storedData) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP not found or expired. Please request a new one.' 
      });
    }

    // Check if OTP expired
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP. Please check and try again.' 
      });
    }

    console.log(`✅ OTP verified for ${email}`);

    // Generate temporary token for password reset
    const resetToken = jwt.sign(
      { email, purpose: 'password-reset' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' }
    );

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken,
    });
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

// Reset Password
export const resetPassword = async (req: Request, res: Response) => {
  console.log('🟢 ========== RESET PASSWORD CALLED ==========');
  console.log('🟢 Body:', req.body);
  
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reset token and new password are required' 
      });
    }

    // Verify reset token
    let decoded: any;
    try {
      decoded = jwt.verify(
        resetToken, 
        process.env.JWT_SECRET || 'your-secret-key'
      );
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token. Please start the process again.' 
      });
    }

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reset token' 
      });
    }

    // Find admin
    const admin = await Admin.findOne({ email: decoded.email });
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Update password (will be hashed by pre-save hook in model)
    admin.password = newPassword;
    await admin.save();

    // Clear OTP from store
    otpStore.delete(decoded.email);

    console.log(`✅ Password reset successful for ${decoded.email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response) => {
  console.log('🟢 ========== RESEND OTP CALLED ==========');
  console.log('🟢 Body:', req.body);
  
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Check if admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent',
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated',
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store new OTP
    otpStore.set(email, { otp, expiresAt });

    console.log(`🔑 OTP Resent for ${email}: ${otp}`); // For development

    // Send OTP via email
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset OTP (Resent) - Aamantran Homestay Admin',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Password Reset OTP</h2>
            <p>Hello ${admin.name},</p>
            <p>Here is your new OTP for password reset:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h1 style="margin: 10px 0; color: #2563eb; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p style="color: #ef4444; font-weight: bold;">This OTP will expire in 10 minutes.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ OTP resent email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
    });
  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.' 
    });
  }
};

// Verify Session (for protected routes)
export const verifySession = async (req: Request, res: Response) => {
  try {
    // Admin info is added by middleware
    // @ts-ignore
    const admin = await Admin.findById(req.adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        authenticated: false,
        message: 'Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      authenticated: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('❌ Verify session error:', error);
    res.status(500).json({
      success: false,
      authenticated: false,
      message: 'Server error'
    });
  }
};

// Logout Admin
export const logoutAdmin = async (req: Request, res: Response) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But you can add token to blacklist here if needed
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};