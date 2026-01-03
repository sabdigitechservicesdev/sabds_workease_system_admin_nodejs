import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    console.log('EmailService initializing with SMTP config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      fromEmail: process.env.SMTP_FROM_EMAIL
    });
    
    // Create transporter with error handling
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
      console.log('Email transporter created successfully');
    } catch (error) {
      console.error('Failed to create email transporter:', error);
      this.transporter = null;
    }
  }

  async sendOTP(email, otp, deviceName = 'your device') {
    try {
      console.log('sendOTP called:', { email, otp, deviceName });
      
      if (!this.transporter) {
        console.error('Email transporter not available');
        throw new Error('Email service not configured');
      }

      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || 'WorkEase System',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
        },
        to: email,
        subject: process.env.EMAIL_OTP_SUBJECT || 'Your OTP Code - WorkEase',
        html: this.getOTPTemplate(otp, deviceName),
        text: `Your OTP code is: ${otp}. This code was generated for ${deviceName} and will expire in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes.`
      };

      console.log('Sending email with options:', mailOptions);
      
      // Verify connection first
      await this.transporter.verify();
      console.log('SMTP connection verified');
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${email}:`, info.messageId);
      console.log('SMTP response:', info.response);
      
      return true;
    } catch (error) {
      console.error('Email sending failed:', error.message);
      console.error('Full error:', error);
      
      // Specific error handling
      if (error.code === 'EAUTH') {
        console.error('SMTP Authentication failed. Check username/password.');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('SMTP Connection refused. Check host/port.');
      } else if (error.code === 'ENOTFOUND') {
        console.error('SMTP Host not found.');
      }
      
      throw new Error('Failed to send OTP email');
    }
  }

  getOTPTemplate(otp, deviceName) {
    // Keep your existing template
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>OTP Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">WorkEase</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">OTP Verification</p>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
            <h2 style="color: #333;">Your OTP Code</h2>
            <p>This OTP was generated for <strong>${deviceName}</strong>. Please use it only on this device.</p>
            
            <div style="background: white; padding: 20px; border-radius: 5px; text-align: center; margin: 30px 0; border: 2px dashed #667eea;">
              <h1 style="font-size: 48px; letter-spacing: 10px; color: #667eea; margin: 0;">${otp}</h1>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; margin: 0;">
                <strong>⚠️ Security Notice:</strong> This OTP is device-specific. If you requested this from a different device, please request a new OTP from that device.
              </p>
            </div>
            
            <p>This OTP will expire in <strong>${process.env.OTP_EXPIRY_MINUTES || 5} minutes</strong>.</p>
            
            <p>If you didn't request this OTP, please ignore this email.</p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
              <p>Best regards,<br>The WorkEase Team</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export default new EmailService();