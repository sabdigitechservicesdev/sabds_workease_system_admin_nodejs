// routes/systemAuth.routes.js
import express from 'express';
import { authRateLimiter } from '../config/rateLimitConfig.js';
import systemAuthController from '../controllers/systemAuth.controllers.js';
import { SystemRegisterValidator, SystemLoginValidator } from '../validators/systemAuth.validators.js';
import { SendOTPValidator, VerifyOTPValidator } from '../validators/otp.validators.js';
import validateRequest from '../middleware/validation.middleware.js';
import deviceInfoMiddleware from '../middleware/deviceInfo.middleware.js';

const router = express.Router();

// Public routes with strict rate limiting
router.post('/register',
  authRateLimiter,
  SystemRegisterValidator,
  validateRequest,
  systemAuthController.register
);

router.post('/login',
  authRateLimiter,
  SystemLoginValidator,
  validateRequest,
  systemAuthController.login
);

router.post('/forgot-password', systemAuthController.forgotPassword);

// Add deviceInfoMiddleware to OTP routes
router.post('/send-otp',
  authRateLimiter,
  deviceInfoMiddleware, // Add this
  SendOTPValidator,
  validateRequest,
  systemAuthController.sendOTP
);

router.post('/verify-otp',
  authRateLimiter,
  deviceInfoMiddleware, // Add this
  VerifyOTPValidator,
  validateRequest,
  systemAuthController.verifyOTP
);

export default router;