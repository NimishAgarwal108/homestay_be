export interface OTPEmailData {
  name: string;
  otp: string;
  isResend?: boolean;
}

export const otpTemplate = (data: OTPEmailData): string => {
  const { name, otp, isResend = false } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #e0e0e0;
        }
        .otp-box {
          background-color: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
        }
        .otp-code {
          margin: 10px 0;
          color: #2563eb;
          font-size: 32px;
          letter-spacing: 5px;
          font-weight: bold;
        }
        .warning {
          color: #ef4444;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          border-radius: 0 0 10px 10px;
          color: #666;
          font-size: 12px;
        }
        .info-text {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔐 Password Reset ${isResend ? 'OTP (Resent)' : 'Request'}</h1>
      </div>
      
      <div class="content">
        <p>Hello <strong>${name}</strong>,</p>
        <p>${isResend ? 'Here is your new OTP for password reset:' : 'You have requested to reset your password for Aamantran Homestay Admin Panel.'}</p>
        
        <div class="otp-box">
          ${!isResend ? '<p style="margin: 0; font-size: 14px; color: #6b7280;">Your OTP is:</p>' : ''}
          <h1 class="otp-code">${otp}</h1>
        </div>
        
        <p class="warning">⏰ This OTP will expire in 10 minutes.</p>
        
        ${!isResend ? `
          <p class="info-text">
            If you didn't request this, please ignore this email and your password will remain unchanged.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
            This is an automated email from Aamantran Homestay Admin System.
          </p>
        ` : ''}
      </div>
      
      <div class="footer">
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} Aamantran Homestay. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};
