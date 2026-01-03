import OTPService from './otp.service.js';
import EmailService from './email.service.js';
import { SystemAdminDetails, SystemAdminCredentials, SystemAdminAddress } from "../models/index.js"

class authServices{
      static async sendOTP(identifier, deviceInfo = null) {
    try {
      console.log('sendOTP called with:', { identifier, deviceInfo });

      // Find user by identifier (email or username)
      const admin = await SystemAdminDetails.findByLoginIdentifier(identifier);
      console.log('Admin found:', admin ? 'Yes' : 'No');

      // Validate user exists and is active
      if (!admin || admin.is_deleted === 1) {
        throw new Error('User not found');
      }

      if (admin.is_deactivated === 1) {
        throw new Error('Account is deactivated');
      }

      if (admin.status_code !== 'ACT') {
        throw new Error(`Account is ${admin.status_name.toLowerCase()}`);
      }

      console.log('Generating OTP...');
      // Generate OTP with device info
      const otpResult = await OTPService.generateOTP(admin.admin_id, admin.email, deviceInfo);
      console.log('OTP generated successfully:', {
        processId: otpResult.processId,
        otp: otpResult.otp,
        deviceId: otpResult.deviceId,
        deviceName: otpResult.deviceName
      });

      console.log('Attempting to send email to:', admin.email);
      // Send email with device info
      await EmailService.sendOTP(admin.email, otpResult.otp, deviceInfo?.deviceName);
      console.log('Email sent successfully');

      return {
        success: true,
        message: 'OTP sent successfully',
        adminId: admin.admin_id,
        email: admin.email,
        processId: otpResult.processId,
        expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES || 5)  // Remove deviceId and deviceName
      };
    } catch (error) {
      console.error('Error in sendOTP:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  static async verifyOTP(identifier, otp, processId = null, deviceInfo = null) {
    try {
      console.log('verifyOTP called with:', { identifier, otp, processId, deviceInfo });

      // Find user by identifier
      const admin = await SystemAdminDetails.findByLoginIdentifier(identifier);
      console.log('Admin found:', admin ? 'Yes' : 'No');

      // Validate user exists and is active
      if (!admin || admin.is_deleted === 1) {
        throw new Error('User not found');
      }

      if (admin.is_deactivated === 1) {
        throw new Error('Account is deactivated');
      }

      if (admin.status_code !== 'ACT') {
        throw new Error(`Account is ${admin.status_name.toLowerCase()}`);
      }

      console.log('Verifying OTP with params:', {
        adminId: admin.admin_id,
        email: admin.email,
        otp,
        processId
      });

      // Verify OTP with process ID and device info
      const result = await OTPService.verifyOTP(
        admin.admin_id,
        admin.email,
        otp,
        processId,
        deviceInfo
      );

      console.log('OTP verification result:', result);

      return {
        success: true,
        message: result.message,
        adminId: admin.admin_id,
        email: admin.email,
        processId: result.processId  // Remove deviceId and deviceName
      };
    } catch (error) {
      console.error('Error in verifyOTP service:', error.message);
      console.error('Error stack:', error.stack);
      throw error; // This will be caught by the controller
    }
  }
}

export default authServices;