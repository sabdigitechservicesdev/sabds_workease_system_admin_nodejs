import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
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

// Test connection (optional)
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();


export default pool;

