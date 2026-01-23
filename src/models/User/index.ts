import mongoose from 'mongoose';
import { IUser, IUserModel } from './interfaces';
import { userSchema } from './schema';

// Import all modules to attach methods, virtuals, etc.
import './virtuals';
import './middleware';
import './methods';
import './statics';
import './queryHelpers';
import './validators';

// Export interfaces for use in other files
export { IUser, IUserModel } from './interfaces';

// Export the model
export default mongoose.model<IUser, IUserModel>('User', userSchema);