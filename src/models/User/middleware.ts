import bcrypt from 'bcryptjs';
import { HydratedDocument } from 'mongoose';
import { IUser } from './interfaces';
import { userSchema } from './schema';

// Hash password before saving
userSchema.pre('save', async function(this: HydratedDocument<IUser>) {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Update email to lowercase before saving
userSchema.pre('save', function(this: HydratedDocument<IUser>) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
});

// Clear reset token fields if password is changed
userSchema.pre('save', function(this: HydratedDocument<IUser>) {
  if (this.isModified('password') && !this.isNew) {
    this.resetPasswordToken = undefined;
    this.resetPasswordExpiry = undefined;
  }
});

// Log user creation
userSchema.post('save', function(doc: HydratedDocument<IUser>) {
  console.log(`New user registered: ${doc.email} with role: ${doc.role}`);
});

// Log user deletion
userSchema.post('deleteOne', { document: true, query: false }, function(doc: HydratedDocument<IUser>) {
  console.log(`User deleted: ${doc.email}`);
});
