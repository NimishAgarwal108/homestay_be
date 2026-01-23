import { HydratedDocument } from 'mongoose';
import { IUser } from './interfaces';
import { userSchema } from './schema';

// Virtual for display name
userSchema.virtual('displayName').get(function(this: HydratedDocument<IUser>) {
  return this.name;
});

// Virtual for account age
userSchema.virtual('accountAge').get(function(this: HydratedDocument<IUser>) {
  if (!this.createdAt) return null;
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''}`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) !== 1 ? 's' : ''}`;
});

// Virtual for account status
userSchema.virtual('accountStatus').get(function(this: HydratedDocument<IUser>) {
  if (!this.isActive) return 'Inactive';
  if (this.isLocked()) return 'Locked';
  if (!this.isVerified) return 'Unverified';
  return 'Active';
});

// Virtual for initials
userSchema.virtual('initials').get(function(this: HydratedDocument<IUser>) {
  const names = this.name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
});