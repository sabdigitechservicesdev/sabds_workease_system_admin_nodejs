import systemAuthService from '../services/systemAuth.services.js';
import { formatResponse, successResponse, errorResponse } from '../utils/responseFormatter.js';

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
      } else if (error.message === 'Please verify your email first') {
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
      const { identifier, purpose = 'verification' } = req.body;

      if (!identifier) {
        return res.status(400).json(
          errorResponse('Email or username is required', null, null)
        );
      }

      // Validate purpose
      const validPurposes = ['verification', 'reset', 'login', 'general'];
      if (!validPurposes.includes(purpose)) {
        return res.status(400).json(
          errorResponse('Invalid purpose. Must be one of: verification, reset, login, general', null, null)
        );
      }

      const result = await systemAuthService.sendOTP(identifier, purpose);

      const response = {
        status: 1,
        message: result.message,
        error: null,
        data: {
          email: result.email,
          purpose: result.purpose,
          expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES || 5),
          expiresInMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || 5)
        }
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Send OTP error:', error.message);

      let statusCode = 500;
      let errorMessage = 'Failed to send OTP';
      let technicalError = process.env.NODE_ENV === 'development' ? error.message : null;

      if (error.message.includes('Please wait')) {
        statusCode = 429;
        errorMessage = error.message;
      } else if (error.message.includes('Too many OTP attempts')) {
        statusCode = 429;
        errorMessage = error.message;
      } else if (error.message === 'User not found') {
        statusCode = 404;
        errorMessage = error.message;
      } else if (error.message.includes('Account is')) {
        statusCode = 403;
        errorMessage = error.message;
      } else if (error.message === 'Failed to send OTP email') {
        statusCode = 502;
        errorMessage = 'Failed to send email. Please try again later.';
      } else if (error.message === 'Invalid email or username format') {
        statusCode = 400;
        errorMessage = error.message;
      }

      return res.status(statusCode).json(
        errorResponse(errorMessage, technicalError, null)
      );
    }
  }

  static async verifyOTP(req, res) {
    try {
      const { identifier, otp, purpose = 'verification' } = req.body;

      if (!identifier || !otp) {
        return res.status(400).json(
          errorResponse('Identifier and OTP are required', null, null)
        );
      }

      // Validate purpose
      const validPurposes = ['verification', 'reset', 'login', 'general'];
      if (!validPurposes.includes(purpose)) {
        return res.status(400).json(
          errorResponse('Invalid purpose. Must be one of: verification, reset, login, general', null, null)
        );
      }

      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json(
          errorResponse('OTP must be exactly 6 digits', null, null)
        );
      }

      const result = await systemAuthService.verifyOTP(identifier, otp, purpose);

      const response = {
        status: 1,
        message: result.message,
        error: null,
        data: {
          adminId: result.adminId,
          email: result.email,
          purpose: result.purpose,
          verified: true,
          verifiedAt: new Date().toISOString()
        }
      };

      // If purpose is reset, return a reset token
      if (purpose === 'reset') {
        // Generate a short-lived reset token
        const resetToken = await systemAuthService.generateResetToken(result.adminId);
        response.data.resetToken = resetToken;
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error('Verify OTP error:', error.message);

      let statusCode = 400;
      let errorMessage = 'OTP verification failed';
      let technicalError = process.env.NODE_ENV === 'development' ? error.message : null;

      if (error.message === 'Invalid or expired OTP') {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.message === 'User not found') {
        statusCode = 404;
        errorMessage = error.message;
      } else if (error.message.includes('Account is')) {
        statusCode = 403;
        errorMessage = error.message;
      } else if (error.message === 'Invalid email or username format') {
        statusCode = 400;
        errorMessage = error.message;
      }

      return res.status(statusCode).json(
        errorResponse(errorMessage, technicalError, null)
      );
    }
  }
}

export default systemAuthController;