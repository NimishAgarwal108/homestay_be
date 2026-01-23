import { transporter } from '../config';
import { bookingNotificationTemplate, BookingEmailData } from '../templates/bookingNotificationTemplate';

const ADMIN_EMAIL = 'findmyroom1@gmail.com';

export const sendBookingNotificationToAdmin = async (
  bookingDetails: BookingEmailData
): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: ADMIN_EMAIL,
    subject: `🔔 New Booking Received - ${bookingDetails.bookingReference}`,
    html: bookingNotificationTemplate(bookingDetails)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification email sent successfully to:', ADMIN_EMAIL);
  } catch (error) {
    console.error('❌ Error sending admin notification email:', error);
    throw error;
  }
};