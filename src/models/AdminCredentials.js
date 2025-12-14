import pool from '../config/database.js';

class AdminCredentials {
  static async create(adminId, credentials) {
    const { admin_name, email, password } = credentials;
    
    const [result] = await pool.execute(
      `INSERT INTO admin_credentials (admin_id, admin_name, email, password) 
       VALUES (?, ?, ?, ?)`,
      [adminId, admin_name, email, password]
    );
    
    return { credentialId: result.insertId };
  }

  static async updatePassword(adminId, hashedPassword) {
    const [result] = await pool.execute(
      `UPDATE admin_credentials SET password = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE admin_id = ?`,
      [hashedPassword, adminId]
    );
    
    return result.affectedRows > 0;
  }

  static async findByAdminId(adminId) {
    const [rows] = await pool.execute(
      `SELECT * FROM admin_credentials WHERE admin_id = ?`,
      [adminId]
    );
    return rows[0];
  }
}

// ✅ ADD THIS:
export default AdminCredentials;