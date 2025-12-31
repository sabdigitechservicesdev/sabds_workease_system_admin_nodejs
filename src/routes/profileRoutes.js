import express from 'express';
import { authenticateToken } from '../middleware/SystemAuthMiddleware.js';
import profileController from '../controllers/profileController.js';

const router = express.Router();



// Protected routes
router.get('/system',
  authenticateToken,
  profileController.getProfile
);

export default router;