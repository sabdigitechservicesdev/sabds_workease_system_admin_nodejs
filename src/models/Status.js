import pool from '../config/database.js';

class Status {
  static async findAll() {
    const [rows] = await pool.execute(
      `SELECT * FROM status`
    );
    return rows;
  }

  static async findByCode(statusCode) {
    const [rows] = await pool.execute(
      `SELECT * FROM status WHERE status_code = ?`,
      [statusCode]
    );
    return rows[0];
  }
}

// ✅ ADD THIS:
export default Status;