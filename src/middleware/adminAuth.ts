// src/middleware/adminAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';

interface JwtPayload {
  adminId: string;
  email: string;
  role: string;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      adminId?: string;
      admin?: any;
    }
  }
}

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🔐 ========== ADMIN AUTH MIDDLEWARE ==========');
    console.log('🔐 Path:', req.path);
    console.log('🔐 Method:', req.method);
    
    // Get token from header
    const authHeader = req.header('Authorization');
    console.log('🔐 Auth Header:', authHeader ? 'Present' : 'Missing');
    
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'No authentication token, access denied'
      });
    }

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as JwtPayload;
      console.log('✅ Token verified:', decoded.email);
    } catch (error: any) {
      console.log('❌ Token verification failed:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          authenticated: false,
          message: 'Invalid token'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          authenticated: false,
          message: 'Token expired'
        });
      }

      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Token verification failed'
      });
    }

    // Check if it's an admin
    if (decoded.role !== 'admin') {
      console.log('❌ Not an admin role:', decoded.role);
      return res.status(403).json({
        success: false,
        authenticated: false,
        message: 'Access denied. Admin only.'
      });
    }

    // Find admin
    const admin = await Admin.findById(decoded.adminId);

    if (!admin) {
      console.log('❌ Admin not found:', decoded.adminId);
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Admin not found'
      });
    }

    if (!admin.isActive) {
      console.log('❌ Admin account is deactivated:', admin.email);
      return res.status(403).json({
        success: false,
        authenticated: false,
        message: 'Admin account is deactivated'
      });
    }

    console.log('✅ Admin authenticated:', admin.email);

    // Add admin info to request
    req.adminId = decoded.adminId;
    req.admin = admin;

    next();
  } catch (error: any) {
    console.error('❌ Admin auth middleware error:', error);

    res.status(500).json({
      success: false,
      authenticated: false,
      message: 'Server error during authentication'
    });
  }
};