import express from 'express';
import rateLimit from 'express-rate-limit';
import AuthController from '../controllers/authControllers.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { 
  registerValidator, 
  loginValidator, 
 
} from '../validators/authValidators.js';
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
  registerValidator,
  validateRequest,
  AuthController.register
);

router.post('/login',
  authLimiter,
  loginValidator,
  validateRequest,
  AuthController.login
);


// Protected routes
router.get('/profile',
  authenticateToken,
  AuthController.getProfile
);

router.post('/logout',
  authenticateToken,
  AuthController.logout
);

// Admin only route example
router.get('/admin-only',
  authenticateToken,
  authorizeRoles('SA', 'AD'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Welcome admin!'
    });
  }
);

export default router;