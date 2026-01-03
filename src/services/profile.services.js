
import { SystemAdminDetails, SystemAdminCredentials, SystemAdminAddress } from "../models/index.js"
import TokenService from './token.service.js';
import pool from '../config/database.js';


class profileServices{
      static async getProfile(adminId) {
    const admin = await SystemAdminDetails.findById(adminId);

    if (!admin) {
      throw new Error('User not found');
    }

    return {
      admin_id: admin.admin_id,
      admin_name: admin.admin_name,
      first_name: admin.first_name,
      middle_name: admin.middle_name,
      last_name: admin.last_name,
      email: admin.email,
      role: admin.role_code,
      role_name: admin.role_name,
      status: admin.status_code,
      status_name: admin.status_name,
      address: {
        area: admin.area,
        city: admin.city,
        state: admin.state,
        pincode: admin.pincode
      },
      created_at: admin.created_at,
      updated_at: admin.updated_at
    };
  }
}

export default profileServices;