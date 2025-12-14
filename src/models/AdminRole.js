import pool from '../config/database.js';

class AdminRole {
  static async findAll() {
    const [rows] = await pool.execute(
      `SELECT * FROM admin_roles`
    );
    return rows;
  }

  static async findByCode(roleCode) {
    const [rows] = await pool.execute(
      `SELECT * FROM admin_roles WHERE role_code = ?`,
      [roleCode]
    );
    return rows[0];
  }
}

// ✅ ADD THIS:
export default AdminRole;