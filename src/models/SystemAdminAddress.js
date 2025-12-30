import pool from '../config/database.js';

class SystemAdminAddress {
  static async create(adminId, addressData) {
    const { area, city, state, pincode } = addressData;

    const [result] = await pool.execute(
      `INSERT INTO system_admin_address (admin_id, area, city, state, pincode) 
       VALUES (?, ?, ?, ?, ?)`,
      [adminId, area, city, state, pincode]
    );

    return { addressId: result.insertId };
  }
}

// ✅ ADD THIS:
export default SystemAdminAddress;