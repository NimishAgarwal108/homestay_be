import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/homestay');
    console.log('MongoDB Connected');

    await User.deleteMany({});
    console.log('Cleared existing data');

    // Create Admin User
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@homestay.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true
    });
    console.log('Admin user created');
    console.log('Seed data inserted successfully!');
    console.log('\nAdmin Credentials:');
    console.log('Email: admin@homestay.com');
    console.log('Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();