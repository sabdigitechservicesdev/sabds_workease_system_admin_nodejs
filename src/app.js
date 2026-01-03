import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
dotenv.config();

import SystemAuthRoutes from './routes/systemAuth.routes.js';
import { errorHandler } from './utils/errorHandler.js';
import peakListRoutes from './routes/pickList.routes.js'
import profileRoutes from './routes/profile.routes.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - MOVED TO TOP
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173', // Vite dev server
      process.env.CORS_ORIGIN
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Scheduler Auth API'
  });
});

// API routes
app.use('/api/peak-list', peakListRoutes);
app.use('/api/system-admin/auth', SystemAuthRoutes);
app.use('/api/profile-details/',profileRoutes);


// ✅ FIX: 404 handler - Use a function instead of '*'
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

export default app;