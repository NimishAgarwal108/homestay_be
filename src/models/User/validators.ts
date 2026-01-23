import { userSchema } from './schema';

// Validate phone number only if provided
userSchema.path('phone').validate(function(value: string) {
  if (!value) return true;
  return /^[0-9]{10,15}$/.test(value);
}, 'Invalid phone number format');
