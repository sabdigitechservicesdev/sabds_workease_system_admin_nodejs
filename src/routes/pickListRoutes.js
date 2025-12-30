import express from 'express';
import pool from '../config/database.js'; // Assuming you have a database connection

const router = express.Router();

// Public routes
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Peaklist API!'
  });
});

// GET all roles
router.get('/admin-roles', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, role_name, role_code 
       FROM system_admin_roles 
       ORDER BY id ASC`
    );

    res.json({
      success: true,
      data: rows,
      message: 'Roles fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
      error: error.message
    });
  }
});


export default router;