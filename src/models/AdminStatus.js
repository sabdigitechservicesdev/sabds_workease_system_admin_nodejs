import pool from '../config/database.js';

class AdminStatus {
  static async findAll() {
    const [rows] = await pool.execute(
      `SELECT * FROM admin_status`
    );
    return rows;
  }

  static async findByCode(statusCode) {
    const [rows] = await pool.execute(
      `SELECT * FROM admin_status WHERE status_code = ?`,
      [statusCode]
    );
    return rows[0];
  }
}

// ✅ ADD THIS:
export default AdminStatus;