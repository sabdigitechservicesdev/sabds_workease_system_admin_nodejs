import express from 'express';
import { authRateLimiter } from '../config/rateLimitConfig.js';
import SystemAuthController from '../controllers/systemAuthControllers.js';
import { authenticateToken, systemAuthorizeRoles } from '../middleware/systemAuthMiddleware.js';
import { SystemRegisterValidator, SystemLoginValidator } from '../validators/systemAuthValidators.js';
import validateRequest from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public routes with strict rate limiting
router.post('/register',
  authRateLimiter,
  SystemRegisterValidator,
  validateRequest,
  SystemAuthController.register
);

router.post('/login',
  authRateLimiter,
  SystemLoginValidator,
  validateRequest,
  SystemAuthController.login
);


router.post('/forgot-password', SystemAuthController.forgotPassword);




export default router;