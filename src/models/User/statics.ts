import { IUser } from './interfaces';
import { userSchema } from './schema';

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
