// services/otp.service.js
import crypto from 'crypto';
import pool from '../config/database.js';

class OTPService {
  constructor() {
    this.otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || 5);
    this.otpLength = parseInt(process.env.OTP_LENGTH) || 6;
    this.maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
    this.resendCooldown = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;
  }

  async generateOTP(adminId, email, purpose = 'verification') {
    const connection = await pool.getConnection();

    try {
      // Generate OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

      // Check if OTP exists and is still valid
      const [existingOTPs] = await connection.execute(
        `SELECT * FROM system_otps 
         WHERE admin_id = ? AND email = ? AND purpose = ? 
         AND expires_at > NOW() AND is_verified = 0`,
        [adminId, email, purpose]
      );

      if (existingOTPs.length > 0) {
        const lastOTP = existingOTPs[0];
        const timeSinceLast = Date.now() - new Date(lastOTP.created_at).getTime();

        // Check resend cooldown
        if (timeSinceLast < this.resendCooldown * 1000) {
          const waitTime = Math.ceil((this.resendCooldown * 1000 - timeSinceLast) / 1000);
          throw new Error(`Please wait ${waitTime} seconds before requesting new OTP`);
        }

        // Mark old OTPs as expired
        await connection.execute(
          `UPDATE system_otps SET expires_at = NOW() 
           WHERE admin_id = ? AND email = ? AND purpose = ? AND is_verified = 0`,
          [adminId, email, purpose]
        );
      }

      // Check attempt count
      const [attempts] = await connection.execute(
        `SELECT COUNT(*) as count FROM system_otps 
         WHERE admin_id = ? AND email = ? AND purpose = ? 
         AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [adminId, email, purpose]
      );

      if (attempts[0].count >= this.maxAttempts) {
        throw new Error('Too many OTP attempts. Please try again later.');
      }

      // Insert new OTP
      await connection.execute(
        `INSERT INTO system_otps (admin_id, email, otp_code, purpose, expires_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, email, otp, purpose, expiresAt]
      );

      return otp;
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async verifyOTP(adminId, email, otp, purpose = 'verification') {
    const connection = await pool.getConnection();

    try {
      // Find valid OTP
      const [otps] = await connection.execute(
        `SELECT * FROM system_otps 
         WHERE admin_id = ? AND email = ? AND otp_code = ? 
         AND purpose = ? AND expires_at > NOW() AND is_verified = 0`,
        [adminId, email, otp, purpose]
      );

      if (otps.length === 0) {
        throw new Error('Invalid or expired OTP');
      }

      const otpRecord = otps[0];

      // Mark OTP as verified
      await connection.execute(
        `UPDATE system_otps SET is_verified = 1, verified_at = NOW() 
         WHERE id = ?`,
        [otpRecord.id]
      );

      return {
        success: true,
        message: 'OTP verified successfully',
        adminId,
        email,
        purpose
      };
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async cleanExpiredOTPs() {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `DELETE FROM system_otps WHERE expires_at < NOW()`
      );
    } finally {
      connection.release();
    }
  }
}

export default new OTPService();