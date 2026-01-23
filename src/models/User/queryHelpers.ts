import { Query } from 'mongoose';
import { IUser, IUserQueryHelpers } from './interfaces';
import { userSchema } from './schema';

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
