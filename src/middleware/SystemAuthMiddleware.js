import jwt from "jsonwebtoken"
import { SystemAdminDetails } from "../models/index.js"

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists and is active
    const admin = await SystemAdminDetails.findById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (admin.status_code !== 'ACT') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active'
      });
    }

    req.user = {
      adminId: admin.admin_id,
      email: admin.email,
      role: admin.role_code,
      adminName: admin.admin_name
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Token has expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const systemAuthorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// ✅ Optional: Also export as default
export default {
  authenticateToken,
  systemAuthorizeRoles
};