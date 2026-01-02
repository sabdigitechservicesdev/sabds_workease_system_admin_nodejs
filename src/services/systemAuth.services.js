import { SystemAdminDetails, SystemAdminCredentials, SystemAdminAddress } from "../models/index.js"
import TokenService from './token.service.js';
import OTPService from './otp.service.js';
import EmailService from './email.service.js';
import pool from '../config/database.js';

class systemAuthService {
  static async register(adminData) {
    const {
      admin_name, first_name, middle_name, last_name, email,
      password, area, city, state, pincode, role_code
    } = adminData;

    // Check if email already exists
    const existingAdmin = await SystemAdminDetails.findByEmail(email);
    if (existingAdmin) {
      throw new Error('Email already registered');
    }

    // Check if admin_name already exists
    const existingAdminName = await SystemAdminDetails.findByAdminName(admin_name);
    if (existingAdminName) {
      throw new Error('Admin name already taken');
    }

    // Hash password
    const hashedPassword = await TokenService.hashPassword(password);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Create admin details
      const adminResult = await SystemAdminDetails.create({
        admin_name,
        first_name,
        middle_name,
        last_name,
        email,
        role_code: role_code || 'AD',
        is_email_verified: false // Initially not verified
      });

      const adminId = adminResult.adminId;

      // Create credentials
      await SystemAdminCredentials.create(adminId, {
        admin_name,
        email,
        password: hashedPassword
      });

      // Create address if provided
      if (area && city && state && pincode) {
        await SystemAdminAddress.create(adminId, {
          area, city, state, pincode
        });
      }

      await connection.commit();

      // Generate tokens
      const tokens = this.generateTokens(adminId, email, admin_name, role_code);

      // Send verification OTP
      try {
        await OTPService.generateOTP(adminId, email, 'verification');
        await EmailService.sendOTP(email, 'verification');
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't throw error - registration succeeded, just email failed
      }

      return {
        success: true,
        message: 'Registration successful. Please check your email for verification OTP.',
        data: {
          adminId,
          admin_name,
          email,
          isEmailVerified: false,
          tokens
        }
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async login(identifier, password) {
    const admin = await SystemAdminDetails.findByLoginIdentifier(identifier);

    // 1️⃣ User not found OR soft deleted
    if (!admin || admin.is_deleted === 1) {
      throw new Error('User not found');
    }

    if (admin.is_deactivated === 1) {
      throw new Error('Account is deactivated');
    }

    // 2️⃣ Status check
    if (admin.status_code !== 'ACT') {
      throw new Error(`Account is ${admin.status_name.toLowerCase()}`);
    }

    // 3️⃣ Check email verification (optional - you can make this mandatory)
    if (!admin.is_email_verified) {
      // Option 1: Allow login but with warning
      // Option 2: Require verification first (uncomment below)
      // throw new Error('Please verify your email first');
    }

    // 4️⃣ Password verify
    const isValidPassword = await TokenService.comparePassword(
      password,
      admin.password
    );

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // 5️⃣ Generate tokens
    const tokens = this.generateTokens(
      admin.admin_id,
      admin.email,
      admin.admin_name,
      admin.role_code
    );

    return {
      success: true,
      message: 'Login successful',
      data: {
        adminId: admin.admin_id,
        admin_name: admin.admin_name,
        first_name: admin.first_name,
        last_name: admin.last_name,
        email: admin.email,
        role: admin.role_code,
        role_name: admin.role_name,
        status: admin.status_code,
        isEmailVerified: admin.is_email_verified || false,
        emailVerifiedAt: admin.email_verified_at,
        tokens
      }
    };
  }

  static generateTokens(adminId, email, adminName, role) {
    const accessToken = TokenService.generateAccessToken({
      adminId,
      email,
      adminName,
      role
    });

    return {
      accessToken,
      tokenType: 'Bearer'
    };
  }

  static async generateResetToken(adminId) {
    return TokenService.generateAccessToken(
      { adminId, type: 'reset' },
      '15m' // Short-lived reset token
    );
  }

  static async forgotPassword(identifier, newPassword) {
    // Find user
    const admin = await SystemAdminDetails.findByLoginIdentifier(identifier);

    // Validate user
    if (!admin || admin.is_deleted === 1) {
      throw new Error('User not found');
    }

    if (admin.is_deactivated === 1) {
      throw new Error('Account is deactivated');
    }

    if (admin.status_code !== 'ACT') {
      throw new Error(`Account is ${admin.status_name.toLowerCase()}`);
    }

    // Verify email if not verified (optional - you can remove this)
    if (!admin.is_email_verified) {
      throw new Error('Please verify your email first');
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new Error('Password must contain at least 8 characters including uppercase, lowercase, number and special character');
    }

    // Hash new password and update
    const hashedPassword = await TokenService.hashPassword(newPassword);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [updateResult] = await connection.execute(
        `UPDATE system_admin_credentials 
         SET password = ?, updated_at = NOW() 
         WHERE admin_id = ?`,
        [hashedPassword, admin.admin_id]
      );

      if (updateResult.affectedRows === 0) {
        throw new Error('Failed to update password');
      }

      // Invalidate all existing OTPs for this user
      await connection.execute(
        `UPDATE system_otps 
         SET expires_at = NOW() 
         WHERE admin_id = ? AND purpose IN ('reset', 'verification')`,
        [admin.admin_id]
      );

      // Send password change notification
      try {
        await EmailService.sendOTP(admin.email, 'Password changed successfully', 'reset');
      } catch (emailError) {
        console.error('Password change notification email failed:', emailError);
        // Continue even if email fails
      }

      await connection.commit();

      return {
        success: true,
        message: 'Password reset successful'
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async sendOTP(identifier, purpose = 'verification') {
    // Validate purpose
    const validPurposes = ['verification', 'reset', 'login', 'general'];
    if (!validPurposes.includes(purpose)) {
      throw new Error('Invalid purpose');
    }

    // Find user by identifier (email or username)
    const admin = await SystemAdminDetails.findByLoginIdentifier(identifier);

    // Validate user
    if (!admin || admin.is_deleted === 1) {
      throw new Error('User not found');
    }

    if (admin.is_deactivated === 1) {
      throw new Error('Account is deactivated');
    }

    // Status check
    if (admin.status_code !== 'ACT') {
      throw new Error(`Account is ${admin.status_name.toLowerCase()}`);
    }

    // Additional checks based on purpose
    if (purpose === 'verification' && admin.is_email_verified) {
      throw new Error('Email is already verified');
    }

    if (purpose === 'reset' && !admin.is_email_verified) {
      throw new Error('Please verify your email first');
    }

    // Generate OTP
    const otp = await OTPService.generateOTP(admin.admin_id, admin.email, purpose);

    // Send email
    await EmailService.sendOTP(admin.email, otp, purpose);

    // For login OTP, also store in session (optional)
    if (purpose === 'login') {
      const connection = await pool.getConnection();
      try {
        await connection.execute(
          `INSERT INTO system_login_otp_sessions (admin_id, otp_code, expires_at) 
           VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
           ON DUPLICATE KEY UPDATE 
           otp_code = ?, expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)`,
          [admin.admin_id, otp, process.env.OTP_EXPIRY_MINUTES || 5,
            otp, process.env.OTP_EXPIRY_MINUTES || 5]
        );
      } finally {
        connection.release();
      }
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      adminId: admin.admin_id,
      email: admin.email,
      purpose,
      expiresIn: process.env.OTP_EXPIRY_MINUTES || 5
    };
  }

  static async verifyOTP(identifier, otp, purpose = 'verification') {
    // Validate purpose
    const validPurposes = ['verification', 'reset', 'login', 'general'];
    if (!validPurposes.includes(purpose)) {
      throw new Error('Invalid purpose');
    }

    // Find user by identifier
    const admin = await SystemAdminDetails.findByLoginIdentifier(identifier);

    // Validate user
    if (!admin || admin.is_deleted === 1) {
      throw new Error('User not found');
    }

    if (admin.is_deactivated === 1) {
      throw new Error('Account is deactivated');
    }

    // Status check
    if (admin.status_code !== 'ACT') {
      throw new Error(`Account is ${admin.status_name.toLowerCase()}`);
    }

    // Verify OTP
    const result = await OTPService.verifyOTP(admin.admin_id, admin.email, otp, purpose);

    // Additional actions based on purpose
    if (purpose === 'verification') {
      // Mark email as verified in database
      const connection = await pool.getConnection();
      try {
        await connection.execute(
          `UPDATE system_admin_details 
           SET is_email_verified = 1, email_verified_at = NOW() 
           WHERE admin_id = ?`,
          [admin.admin_id]
        );
      } finally {
        connection.release();
      }
    } else if (purpose === 'login') {
      // Clear login OTP session
      const connection = await pool.getConnection();
      try {
        await connection.execute(
          `DELETE FROM system_login_otp_sessions WHERE admin_id = ?`,
          [admin.admin_id]
        );
      } finally {
        connection.release();
      }
    } else if (purpose === 'reset') {
      // Mark that password reset is authorized (optional)
      const connection = await pool.getConnection();
      try {
        await connection.execute(
          `INSERT INTO system_password_reset_auth (admin_id, authorized_at, expires_at) 
           VALUES (?, NOW(), DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
          [admin.admin_id]
        );
      } finally {
        connection.release();
      }
    }

    return {
      success: true,
      message: 'OTP verified successfully',
      adminId: admin.admin_id,
      email: admin.email,
      purpose
    };
  }
}

export default systemAuthService;