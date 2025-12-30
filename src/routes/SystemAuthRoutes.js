import express from 'express';
import rateLimit from 'express-rate-limit';
import SystemAuthController from '../controllers/systemAuthControllers.js';
import { authenticateToken, systemAuthorizeRoles } from '../middleware/systemAuthMiddleware.js';
import { SystemRegisterValidator, SystemLoginValidator, } from '../validators/systemAuthValidators.js';
import validateRequest from '../middleware/validationMiddleware.js';

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Public routes
router.post('/register',
  authLimiter,
  SystemRegisterValidator,
  validateRequest,
  SystemAuthController.register
);

router.post('/login',
  authLimiter,
  SystemLoginValidator,
  validateRequest,
  SystemAuthController.login
);

// Protected routes
router.get('/profile',
  authenticateToken,
  SystemAuthController.getProfile
);

// Admin only route example
router.get('/admin-only',
  authenticateToken,
  systemAuthorizeRoles('SA', 'AD'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Welcome admin!'
    });
  }
);

export default router;