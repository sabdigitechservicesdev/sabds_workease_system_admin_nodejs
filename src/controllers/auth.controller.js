import authServices from "../services/auth.services.js";
import { errorResponse } from '../utils/responseFormatter.js';

class authController{
    
      static async sendOTP(req, res) {
    try {
      const result = await authServices.sendOTP(
        req.body.identifier,
        req.deviceInfo // Make sure you're passing device info from middleware
      );

      return res.status(200).json({
        status: 1,
        message: result.message,
        data: {
          adminId: result.adminId,
          email: result.email,
          processId: result.processId,
          deviceId: result.deviceId,
          deviceName: result.deviceName
        }
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      return res.status(400).json({
        status: 0,
        message: error.message || 'Failed to send OTP',
        error: null,
        data: null,
        token: null
      });
    }
  }

  static async verifyOTP(req, res) {
    try {
      const result = await authServices.verifyOTP(
        req.body.identifier,
        req.body.otp,
        req.body.processId,
        req.deviceInfo // Make sure you're passing device info
      );

      return res.status(200).json({
        status: 1,
        message: result.message,
        data: {
          adminId: result.adminId,
          email: result.email,
          processId: result.processId
        }
      });
    } catch (error) {
      console.error('Verify OTP error:', error);

      // Return specific error messages
      return res.status(400).json({
        status: 0,
        message: error.message || 'OTP verification failed',
        error: null,
        data: null,
        token: null
      });
    }
  }
}

export default authController;