import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Import routes
import adminAuthRoutes from './routes/adminAuthRoutes';
console.log('🔴 adminAuthRoutes imported:', typeof adminAuthRoutes); 
import bookingRoutes from './routes/bookingRoutes';

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (optional, for development)
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Welcome route
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Aamantran Homestay Booking API',
    version: '1.0.0',
    endpoints: {
      adminAuth: '/api/admin/auth',
      rooms: '/api/rooms',
      bookings: '/api/bookings',
      gallery: '/api/gallery',
      contact: '/api/contact',
      health: '/api/health'
    }
  });
});

// Health check route
app.get('/api/health', (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({ 
    success: true,
    status: 'OK', 
    message: 'Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes - REGISTERED BEFORE ERROR HANDLERS
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/bookings', bookingRoutes);

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homestay_db';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Error:', err.message);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      details: Object.values(err.errors).map((e: any) => e.message)
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate Entry',
      message: 'A record with this data already exists'
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'Authentication token is invalid'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired',
      message: 'Authentication token has expired'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler - MUST BE LAST
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested route does not exist'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM signal received: closing HTTP server');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT signal received: closing HTTP server');
  mongoose.connection.close();
  process.exit(0);
});

// Start server FIRST, then connect DB
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('🚀 =============================');
  console.log(`🏠 Aamantran Homestay API Server`);
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`👤 Admin Login: POST http://localhost:${PORT}/api/admin/auth/login`);
  console.log('🚀 =============================');
  
  // Connect DB after server starts (non-blocking)
  connectDB();
});