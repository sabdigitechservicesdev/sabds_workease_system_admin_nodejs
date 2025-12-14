import pool from '../config/database.js';

class Admin {
  static async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT ad.admin_id, ad.admin_name, ad.first_name, ad.middle_name, ad.last_name, 
              ad.email, ad.role_code, ad.status_code, 
              ac.password, ar.role_name, as2.status_name
       FROM admin_details ad
       LEFT JOIN admin_credentials ac ON ad.admin_id = ac.admin_id
       LEFT JOIN admin_roles ar ON ad.role_code = ar.role_code
       LEFT JOIN admin_status as2 ON ad.status_code = as2.status_code
       WHERE ad.email = ?`,
      [email]
    );
    return rows[0];
  }

  static async findByAdminName(adminName) {
    const [rows] = await pool.execute(
      `SELECT admin_id, admin_name, email, role_code, status_code 
       FROM admin_details 
       WHERE admin_name = ?`,
      [adminName]
    );
    return rows[0];
  }

  static async findById(adminId) {
    const [rows] = await pool.execute(
      `SELECT ad.admin_id, ad.admin_name, ad.first_name, ad.middle_name, ad.last_name,
              ad.email, ad.role_code, ad.status_code, 
              ar.role_name, as2.status_name, aa.area, aa.city, aa.state, aa.pincode
       FROM admin_details ad
       LEFT JOIN admin_roles ar ON ad.role_code = ar.role_code
       LEFT JOIN admin_status as2 ON ad.status_code = as2.status_code
       LEFT JOIN admin_address aa ON ad.admin_id = aa.admin_id
       WHERE ad.admin_id = ?`,
      [adminId]
    );
    return rows[0];
  }

  static async create(adminData) {
    const {
      admin_name, first_name, middle_name, last_name, email,
      role_code = 'SE', status_code = 'ACT'
    } = adminData;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO admin_details 
         (admin_name, first_name, middle_name, last_name, email, role_code, status_code) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [admin_name, first_name, middle_name, last_name, email, role_code, status_code]
      );

      await connection.commit();
      return { adminId: result.insertId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Admin model
static async findByLoginIdentifier(identifier) {
  const [rows] = await pool.query(
    `
    SELECT 
      ad.admin_id,
      ad.admin_name,
      ad.first_name,
      ad.last_name,
      ad.email,
      ad.role_code,
      ad.status_code,
      r.role_name,
      s.status_name,
      ac.password,
      ac.is_deleted
    FROM admin_details ad
    JOIN admin_credentials ac ON ac.admin_id = ad.admin_id
    JOIN roles r ON r.role_code = ad.role_code
    JOIN status s ON s.status_code = ad.status_code
    WHERE (ac.email = ? OR ac.admin_name = ?)
    LIMIT 1
    `,
    [identifier, identifier]
  );

  return rows[0];
}

}

// ✅ MUST HAVE THIS LINE:
export default Admin;