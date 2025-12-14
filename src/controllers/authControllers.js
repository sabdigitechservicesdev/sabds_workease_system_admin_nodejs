import  AuthService from '../services/authServices.js';

class AuthController {
  static async register(req, res) {
    try {
      const result = await AuthService.register(req.body);
      
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

    const result = await AuthService.login(identifier, password);

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
      const profile = await AuthService.getProfile(req.user.adminId);
      
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

  static async logout(req, res) {
    try {
      // In a real implementation, you might want to blacklist the token
      // For now, we'll just return success
      return res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
}

export default AuthController;