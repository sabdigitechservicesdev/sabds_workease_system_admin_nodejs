import SystemAuthService from '../services/systemAuthServices.js';

class SystemAuthController {
  static async register(req, res) {
    try {
      const result = await SystemAuthService.register(req.body);

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result.data
      });
    } catch (error) {
      console.error('Registration error:', error);

      if (error.message.includes('already')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  static async login(req, res) {
    try {
      const { identifier, password } = req.body;

      const result = await SystemAuthService.login(identifier, password);

      return res.status(200).json(result);

    } catch (error) {
      console.error('Login error:', error.message);

      if (
        error.message === 'Invalid credentials' ||
        error.message === 'User not found' ||
        error.message.startsWith('Account is')
      ) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const profile = await SystemAuthService.getProfile(req.user.adminId);

      return res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Get profile error:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch profile'
      });
    }
  }
}

export default SystemAuthController;