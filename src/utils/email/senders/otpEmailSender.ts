import { transporter } from '../config';
import { otpTemplate, OTPEmailData } from '../templates/otpTemplate';

export const sendPasswordResetOTP = async (
  email: string,
  name: string,
  otp: string
): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP - Aamantran Homestay Admin',
    html: otpTemplate({ name, otp, isResend: false })
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset OTP email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw error;
  }
};

export const resendPasswordResetOTP = async (
  email: string,
  name: string,
  otp: string
): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP (Resent) - Aamantran Homestay Admin',
    html: otpTemplate({ name, otp, isResend: true })
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset OTP resent to ${email}`);
  } catch (error) {
    console.error('❌ Error resending OTP email:', error);
    throw error;
  }
};
