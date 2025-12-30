import pool from '../config/database.js';

class SystemAdminCredentials {
  static async create(adminId, credentials) {
    const { admin_name, email, password } = credentials;

    const [result] = await pool.execute(
      `INSERT INTO system_admin_credentials (admin_id, admin_name, email, password) 
       VALUES (?, ?, ?, ?)`,
      [adminId, admin_name, email, password]
    );

    return { credentialId: result.insertId };
  }

  static async updatePassword(adminId, hashedPassword) {
    const [result] = await pool.execute(
      `UPDATE system_admin_credentials SET password = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE admin_id = ?`,
      [hashedPassword, adminId]
    );

    return result.affectedRows > 0;
  }

  static async findByAdminId(adminId) {
    const [rows] = await pool.execute(
      `SELECT * FROM system_admin_credentials WHERE admin_id = ?`,
      [adminId]
    );
    return rows[0];
  }
}

// ✅ ADD THIS:
export default SystemAdminCredentials;