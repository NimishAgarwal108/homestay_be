import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../models/Admin';

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/homestay';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'agarwalnimish428@gmail.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin already exists!');
      console.log('========================');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name);
      console.log('========================');
      console.log('If you want to reset the password, delete this admin from MongoDB first.');
      process.exit(0);
    }

    // Create admin
    const admin = await Admin.create({
      name: 'Nimish Agarwal',
      email: 'agarwalnimish428@gmail.com',
      password: '123456',
      role: 'admin',
      isActive: true
    });

    console.log('✅ Admin created successfully!');
    console.log('========================');
    console.log('Name:', admin.name);
    console.log('Email:', admin.email);
    console.log('Password: 123456');
    console.log('Role:', admin.role);
    console.log('========================');
    console.log('🔐 You can now login at: POST /api/admin/auth/login');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

// Run the script
createAdmin();