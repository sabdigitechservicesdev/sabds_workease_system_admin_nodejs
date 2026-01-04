// routes/systemAuth.routes.js
import express from 'express';
import { authRateLimiter } from '../config/rateLimitConfig.js';
import { SendOTPValidator, VerifyOTPValidator } from '../validators/otp.validators.js';
import validateRequest from '../middleware/validation.middleware.js';
import deviceInfoMiddleware from '../middleware/deviceInfo.middleware.js';
import authController from '../controllers/auth.controller.js';

const router = express.Router();



// Add deviceInfoMiddleware to OTP routes
router.post('/send-otp',
  authRateLimiter,
  deviceInfoMiddleware, 
  SendOTPValidator,
  validateRequest,
  authController.sendOTP
);

router.post('/verify-otp',
  authRateLimiter,
  deviceInfoMiddleware, 
  VerifyOTPValidator,
  validateRequest,
  authController.verifyOTP
);

export default router;