// src/routes/adminAuthRoutes.ts
import express from 'express';
import {
  adminLogin,
  getAdminProfile,
  changeAdminPassword,
  forgotPassword,
  verifyOTP,
  resetPassword,
  resendOTP,
  verifySession,
  logoutAdmin,
} from '../controllers/adminAuthController';
import { adminAuth } from '../middleware/adminAuth';

const router = express.Router();

console.log('🟢 adminAuthRoutes.ts loaded');

// ========== PUBLIC ROUTES (No authentication required) ==========

// Login
router.post('/login', adminLogin);

// Forgot Password Flow
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/resend-otp', resendOTP);

// ========== PROTECTED ROUTES (Authentication required) ==========

// Verify Session
router.get('/verify', adminAuth, verifySession);

// Get Profile
router.get('/profile', adminAuth, getAdminProfile);

// Change Password (when logged in)
router.post('/change-password', adminAuth, changeAdminPassword);

// Logout
router.post('/logout', adminAuth, logoutAdmin);

export default router;