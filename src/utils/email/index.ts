export { transporter, verifyEmailConfig } from './config';

// Export templates
export { bookingNotificationTemplate, type BookingEmailData } from './templates/bookingNotificationTemplate';
export { otpTemplate, type OTPEmailData } from './templates/otpTemplate';

// Export email senders
export { sendBookingNotificationToAdmin } from './senders/bookingEmailSender';
export { sendPasswordResetOTP, resendPasswordResetOTP } from './senders/otpEmailSender';

