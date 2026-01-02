/**
 * Rate Limiting Configuration
 * Centralized configuration for rate limiting across the application
 */
import rateLimit from 'express-rate-limit';

// Rate limit configurations for different routes
export const authRateLimiter = rateLimit({
  windowMs: process.env.AUTH_RATE_LIMIT_WINDOW_MS
    ? parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS)
    : 5 * 60 * 1000, // 5 minutes default
  max: process.env.AUTH_RATE_LIMIT_MAX_REQUESTS
    ? parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS)
    : 5, // 5 requests per window
  message: {
    status: 0,
    message: 'Too many authentication attempts from this IP, please try again later',
    error: null,
    data: null,
    token: null
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const apiRateLimiter = rateLimit({
  windowMs: process.env.API_RATE_LIMIT_WINDOW_MS
    ? parseInt(process.env.API_RATE_LIMIT_WINDOW_MS)
    : 15 * 60 * 1000, // 15 minutes default
  max: process.env.API_RATE_LIMIT_MAX_REQUESTS
    ? parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS)
    : 100, // 100 requests per window
  message: {
    status: 0,
    message: 'Too many requests from this IP, please try again later',
    error: null,
    data: null,
    token: null
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const publicRateLimiter = rateLimit({
  windowMs: process.env.PUBLIC_RATE_LIMIT_WINDOW_MS
    ? parseInt(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS)
    : 60 * 60 * 1000, // 1 hour default
  max: process.env.PUBLIC_RATE_LIMIT_MAX_REQUESTS
    ? parseInt(process.env.PUBLIC_RATE_LIMIT_MAX_REQUESTS)
    : 1000, // 1000 requests per window
  message: {
    status: 0,
    message: 'Too many requests from this IP, please try again later',
    error: null,
    data: null,
    token: null
  },
  standardHeaders: true,
  legacyHeaders: false
});

export default {
  authRateLimiter,
  apiRateLimiter,
  publicRateLimiter
};