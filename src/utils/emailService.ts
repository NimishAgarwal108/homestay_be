export {
  transporter,
  verifyEmailConfig,
  sendBookingNotificationToAdmin,
  sendPasswordResetOTP,
  resendPasswordResetOTP
} from './email/index';

export type { BookingEmailData, OTPEmailData } from './email/index';