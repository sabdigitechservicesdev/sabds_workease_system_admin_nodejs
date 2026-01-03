import crypto from 'crypto';
import pool from '../config/database.js';

class OTPService {
  constructor() {
    this.otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || 5);
    this.otpLength = parseInt(process.env.OTP_LENGTH) || 6;
    this.maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
    this.resendCooldown = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;
  }

  // Generate unique process ID
  generateProcessId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `proc_${timestamp}_${random}`;
  }

  // Extract device info from request headers
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
      if (ua.includes('android')) return 'Android';
      return 'Linux PC';
    }

    // Common tools
    if (ua.includes('postman')) return 'Postman';
    if (ua.includes('insomnia')) return 'Insomnia';
    if (ua.includes('curl')) return 'cURL';
    if (ua.includes('wget')) return 'Wget';

    // Mobile devices
    if (ua.includes('mobile') || ua.includes('mobi')) return 'Mobile Device';

    return 'Unknown Device';
  }

  async generateOTP(adminId, email, deviceInfo = null) {
    const connection = await pool.getConnection();

    try {
      // Generate OTP and unique process ID
      const otp = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);
      const processId = this.generateProcessId();

      // If device info provided, create device identifier
      const deviceId = deviceInfo?.deviceId || null;
      const deviceName = deviceInfo?.deviceName || null;

      // Check resend cooldown for this device
      const [recentOTPs] = await connection.execute(
        `SELECT created_at FROM system_otps 
         WHERE admin_id = ? AND email = ? AND device_id = ?
         AND is_verified = 0 AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [adminId, email, deviceId]
      );

      if (recentOTPs.length > 0) {
        const lastOTP = recentOTPs[0];
        const timeSinceLast = Date.now() - new Date(lastOTP.created_at).getTime();

        if (timeSinceLast < this.resendCooldown * 1000) {
          const waitTime = Math.ceil((this.resendCooldown * 1000 - timeSinceLast) / 1000);
          throw new Error(`Please wait ${waitTime} seconds before requesting new OTP`);
        }
      }

      // Check attempt count for this device in last hour
      const [deviceAttempts] = await connection.execute(
        `SELECT COUNT(*) as count FROM system_otps 
         WHERE admin_id = ? AND email = ? AND device_id = ?
         AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [adminId, email, deviceId]
      );

      if (deviceAttempts[0].count >= this.maxAttempts) {
        throw new Error('Too many OTP attempts from this device. Please try again later.');
      }

      // Check global attempt count (all devices) in last hour
      const [globalAttempts] = await connection.execute(
        `SELECT COUNT(*) as count FROM system_otps 
         WHERE admin_id = ? AND email = ? 
         AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [adminId, email]
      );

      if (globalAttempts[0].count >= this.maxAttempts * 3) {
        throw new Error('Too many OTP attempts from all devices. Please try again later.');
      }

      // Insert new OTP with unique process ID
      await connection.execute(
        `INSERT INTO system_otps 
         (process_id, admin_id, email, otp_code, device_id, device_name, expires_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [processId, adminId, email, otp, deviceId, deviceName, expiresAt]
      );

      return {
        processId,
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

  async verifyOTP(adminId, email, otp, processId = null, deviceInfo = null) {
    const connection = await pool.getConnection();

    try {
      const deviceId = deviceInfo?.deviceId || null;

      // ALWAYS require processId for verification
      if (!processId) {
        throw new Error('Process ID is required for OTP verification');
      }

      // First, check if this processId exists and get its status
      const [otpRecords] = await connection.execute(
        `SELECT * FROM system_otps 
       WHERE admin_id = ? AND email = ? AND process_id = ?
       ORDER BY created_at DESC LIMIT 1`,
        [adminId, email, processId]
      );

      if (otpRecords.length === 0) {
        throw new Error('Invalid Process ID. Please request a new OTP.');
      }

      const otpRecord = otpRecords[0];

      // Check if OTP is already verified
      if (otpRecord.is_verified === 1) {
        throw new Error('This OTP has already been used. Please request a new OTP.');
      }

      // Check if OTP is expired
      const currentTime = new Date();
      const expiresAt = new Date(otpRecord.expires_at);

      if (currentTime > expiresAt) {
        throw new Error('OTP has expired. Please request a new OTP.');
      }

      // Now verify the OTP code
      if (otpRecord.otp_code !== otp) {
        throw new Error('Invalid OTP code. Please check and try again.');
      }

      // OTP is valid - mark as verified
      await connection.execute(
        `UPDATE system_otps 
       SET is_verified = 1, verified_at = NOW() 
       WHERE id = ?`,
        [otpRecord.id]
      );

      return {
        success: true,
        message: 'OTP verified successfully',
        adminId,
        email,
        processId: otpRecord.process_id,
        deviceId: otpRecord.device_id,
        deviceName: otpRecord.device_name
      };
    } catch (error) {
      throw error; // Re-throw the error so controller can see the specific message
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