import systemAuthService from '../services/systemAuth.services.js';
import OTPService from '../services/otp.service.js';
import { errorResponse } from '../utils/responseFormatter.js';

class systemAuthController {
  static async register(req, res) {
    try {
      const result = await systemAuthService.register(req.body);

      // Extract data from result
      const userData = result.user || result.data;
      const tokens = userData?.tokens || {};
      const { tokens: _, ...userWithoutTokens } = userData;

      // Always include all fields even if null
      const response = {
        status: 1,
        message: 'Registration successful',
        error: null,
        data: userWithoutTokens,
        token: tokens.accessToken ? {
          accessToken: tokens.accessToken,
          tokenType: tokens.tokenType || 'Bearer'
        } : null
      };

      return res.status(201).json(response);
    } catch (error) {
      console.error('Registration error:', error);

      let statusCode = 500;
      let errorMessage = 'Registration failed';
      let technicalError = process.env.NODE_ENV === 'development' ? error.message : null;

      if (error.message.includes('already')) {
        statusCode = 409;
        errorMessage = error.message;
      }

      return res.status(statusCode).json(
        errorResponse(errorMessage, technicalError, null)
      );
    }
  }

  static async login(req, res) {
    try {
      const { identifier, password } = req.body;
      const result = await systemAuthService.login(identifier, password);

      // Extract data from result
      const userData = result.user || result.data;
      const tokens = userData?.tokens || result.tokens || {};
      const { tokens: _, ...userWithoutTokens } = userData || {};

      // Always include all fields even if null
      const response = {
        status: 1,
        message: 'Login successful',
        error: null,
        data: userWithoutTokens,
        token: tokens.accessToken ? {
          accessToken: tokens.accessToken,
          tokenType: tokens.tokenType || 'Bearer',
          ...(tokens.refreshToken && { refreshToken: tokens.refreshToken }),
          ...(tokens.expiresIn && { expiresIn: tokens.expiresIn })
        } : null
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Login error:', error.message);

      let statusCode = 500;
      let errorMessage = 'Login failed';
      let technicalError = process.env.NODE_ENV === 'development' ? error.message : null;

      if (
        error.message === 'Invalid credentials' ||
        error.message === 'User not found' ||
        error.message.startsWith('Account is')
      ) {
        statusCode = 401;
        errorMessage = error.message;
      }

      return res.status(statusCode).json(
        errorResponse(errorMessage, technicalError, null)
      );
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { identifier, new_password } = req.body;

      if (!identifier || !new_password) {
        return res.status(400).json(
          errorResponse('Email or username and new password are required', null, null)
        );
      }

      const result = await systemAuthService.forgotPassword(identifier, new_password);

      const response = {
        status: 1,
        message: result.message,
        error: null,
        data: null
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Forgot password error:', error.message);

      let statusCode = 500;
      let errorMessage = 'Password reset failed';
      let technicalError = process.env.NODE_ENV === 'development' ? error.message : null;

      if (error.message === 'User not found' ||
        error.message === 'Account is deactivated' ||
        error.message === 'Account is deleted') {
        statusCode = 404;
        errorMessage = error.message;
      } else if (error.message.includes('not active')) {
        statusCode = 403;
        errorMessage = error.message;
      }

      return res.status(statusCode).json(
        errorResponse(errorMessage, technicalError, null)
      );
    }
  }

  static async sendOTP(req, res) {
    try {
      const result = await systemAuthService.sendOTP(
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
      const result = await systemAuthService.verifyOTP(
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

export default systemAuthController;