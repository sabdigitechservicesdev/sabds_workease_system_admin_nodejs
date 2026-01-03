import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import OTPService from '../services/otp.service.js';

dotenv.config();

// Create the pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql.railway.internal',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'AqrKWilwhOaQvGxwYRBEzZbqoXluTyYI',
  database: process.env.DB_NAME || 'sabds_scheduler_test_db',
  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();

// OTP Cleanup Job - Remove expired OTPs based on config
try {
  // Parse cleanup interval from environment (default to 60 minutes)
  const cleanupIntervalMinutes = parseInt(process.env.OTP_CLEANUP_INTERVAL_MINUTES) || 60;
  const cleanupOnStartup = process.env.OTP_CLEANUP_ON_STARTUP !== 'false'; // default true

  // Convert minutes to milliseconds
  const cleanupIntervalMs = cleanupIntervalMinutes * 60 * 1000;

  // Run cleanup on startup if enabled
  if (cleanupOnStartup) {
    OTPService.cleanExpiredOTPs().then(() => {
      console.log(`✅ Initial OTP cleanup completed`);
    }).catch(err => {
      console.error('❌ Initial OTP cleanup failed:', err.message);
    });
  }

  // Schedule regular cleanup
  setInterval(() => {
    OTPService.cleanExpiredOTPs().catch(err => {
      console.error('❌ Scheduled OTP cleanup failed:', err.message);
    });
  }, cleanupIntervalMs);

  console.log(`✅ OTP cleanup job scheduled (every ${cleanupIntervalMinutes} minutes)`);
  console.log(`⏱️  Next cleanup in: ${cleanupIntervalMinutes} minutes`);
} catch (error) {
  console.error('❌ Failed to setup OTP cleanup job:', error.message);
}

export default pool;