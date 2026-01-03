import express from 'express';
import { authenticateToken } from '../middleware/systemAuth.middleware.js';
import profileController from '../controllers/profile.controller.js';

const router = express.Router();



// Protected routes
router.get('/system',
  authenticateToken,
  profileController.getProfile
);

export default router;