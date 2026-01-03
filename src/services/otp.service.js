import crypto from 'crypto';
import pool from '../config/database.js';

class OTPService {
  constructor() {
    this.otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || 5);
    this.otpLength = parseInt(process.env.OTP_LENGTH) || 6;
    this.maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
    this.resendCooldown = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;
  }

  // Extract device info from request headers - REMOVE static keyword
  extractDeviceInfo(req) {
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown IP';

    // Create a device fingerprint
    const deviceFingerprint = crypto
      .createHash('md5')
      .update(`${userAgent}-${ipAddress}`)
      .digest('hex')
      .substring(0, 16);

    return {
      deviceId: `device_${deviceFingerprint}`,
      userAgent,
      ipAddress,
      deviceName: this.detectDeviceName(userAgent)
    };
  }

  detectDeviceName(userAgent) {
    const ua = userAgent.toLowerCase();

    // iOS Devices
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('ipad')) return 'iPad';
    if (ua.includes('ipod')) return 'iPod';

    // Android Devices
    if (ua.includes('android')) {
      if (ua.includes('mobile')) return 'Android Phone';
      return 'Android Tablet';
    }

    // Windows Devices
    if (ua.includes('windows')) {
      if (ua.includes('phone')) return 'Windows Phone';
      if (ua.includes('tablet')) return 'Windows Tablet';
      return 'Windows PC';
    }

    // macOS Devices
    if (ua.includes('macintosh') || ua.includes('mac os') || ua.includes('macos')) {
      return 'Mac';
    }

    // Linux Devices
    if (ua.includes('linux')) {
      if (ua.includes('android')) return 'Android'; // Some Android devices report Linux
      return 'Linux PC';
    }

    // Common browsers/devices
    if (ua.includes('postman')) return 'Postman';
    if (ua.includes('insomnia')) return 'Insomnia';
    if (ua.includes('curl')) return 'cURL';
    if (ua.includes('wget')) return 'Wget';

    // Check for common mobile browsers
    if (ua.includes('mobile') || ua.includes('mobi')) return 'Mobile Device';

    return 'Unknown Device';
  }

  async generateOTP(adminId, email, deviceInfo = null) {
    const connection = await pool.getConnection();

    try {
      // Generate OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

      // If device info provided, create device identifier
      const deviceId = deviceInfo?.deviceId || null;
      const deviceName = deviceInfo?.deviceName || null;

      // Check if OTP exists for same device
      const [existingOTPs] = await connection.execute(
        `SELECT * FROM system_otps 
         WHERE admin_id = ? AND email = ? AND device_id = ?
         AND expires_at > NOW() AND is_verified = 0`,
        [adminId, email, deviceId]
      );

      if (existingOTPs.length > 0) {
        const lastOTP = existingOTPs[0];
        const timeSinceLast = Date.now() - new Date(lastOTP.created_at).getTime();

        // Check resend cooldown
        if (timeSinceLast < this.resendCooldown * 1000) {
          const waitTime = Math.ceil((this.resendCooldown * 1000 - timeSinceLast) / 1000);
          throw new Error(`Please wait ${waitTime} seconds before requesting new OTP`);
        }

        // Mark old OTPs for same device as expired
        await connection.execute(
          `UPDATE system_otps SET expires_at = NOW() 
           WHERE admin_id = ? AND email = ? AND device_id = ? AND is_verified = 0`,
          [adminId, email, deviceId]
        );
      }

      // Check attempt count for this device
      const [deviceAttempts] = await connection.execute(
        `SELECT COUNT(*) as count FROM system_otps 
         WHERE admin_id = ? AND email = ? AND device_id = ?
         AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [adminId, email, deviceId]
      );

      if (deviceAttempts[0].count >= this.maxAttempts) {
        throw new Error('Too many OTP attempts from this device. Please try again later.');
      }

      // Check global attempt count (all devices)
      const [globalAttempts] = await connection.execute(
        `SELECT COUNT(*) as count FROM system_otps 
         WHERE admin_id = ? AND email = ? 
         AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [adminId, email]
      );

      if (globalAttempts[0].count >= this.maxAttempts * 3) {
        throw new Error('Too many OTP attempts from all devices. Please try again later.');
      }

      // Insert new OTP with device info
      await connection.execute(
        `INSERT INTO system_otps 
         (admin_id, email, otp_code, device_id, device_name, expires_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [adminId, email, otp, deviceId, deviceName, expiresAt]
      );

      return {
        otp,
        deviceId,
        deviceName
      };
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  }

  async verifyOTP(adminId, email, otp, deviceInfo = null) {
    const connection = await pool.getConnection();

    try {
      const deviceId = deviceInfo?.deviceId || null;

      // Find valid OTP for this specific device
      const [otps] = await connection.execute(
        `SELECT * FROM system_otps 
         WHERE admin_id = ? AND email = ? AND otp_code = ? 
         AND device_id = ? AND expires_at > NOW() AND is_verified = 0`,
        [adminId, email, otp, deviceId]
      );

      if (otps.length === 0) {
        // Check if OTP exists but for different device
        const [otherDeviceOTP] = await connection.execute(
          `SELECT device_name FROM system_otps 
           WHERE admin_id = ? AND email = ? AND otp_code = ? 
           AND expires_at > NOW() AND is_verified = 0`,
          [adminId, email, otp]
        );

        if (otherDeviceOTP.length > 0) {
          throw new Error(`This OTP was generated for ${otherDeviceOTP[0].device_name}. Please use the OTP sent to your current device.`);
        }

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
        deviceId: otpRecord.device_id,
        deviceName: otpRecord.device_name
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