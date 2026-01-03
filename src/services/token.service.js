import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs";

class TokenService {
  static generateAccessToken(payload) {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  //   static generateRefreshToken(payload) {
  //     return jwt.sign(
  //       payload,
  //       process.env.JWT_REFRESH_SECRET,
  //       { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  //     );
  //   }

  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  //   static verifyRefreshToken(token) {
  //     try {
  //       return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  //     } catch (error) {
  //       return null;
  //     }
  //   }

  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
    return await bcrypt.hash(password, salt);
  }

  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static extractTokenFromHeader(req) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}

export default TokenService;