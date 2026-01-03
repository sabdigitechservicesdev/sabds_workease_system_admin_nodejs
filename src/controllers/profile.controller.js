import { formatResponse, successResponse, errorResponse } from '../utils/responseFormatter.js';
import profileServices from '../services/profile.services.js'


class profileController {

  static async getProfile(req, res) {
    try {
      const profile = await profileServices.getProfile(req.user.adminId);

      // Remove tokens from profile data if they exist
      let profileData = profile;
      if (profile?.tokens) {
        const { tokens, ...profileWithoutTokens } = profile;
        profileData = profileWithoutTokens;
      }

      // Always include all fields even if null
      const response = {
        status: 1,
        message: 'Profile fetched successfully',
        error: null,
        data: profileData,
        token: null
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Get profile error:', error);

      return res.status(500).json(
        errorResponse('Failed to fetch profile', process.env.NODE_ENV === 'development' ? error.message : null, null)
      );
    }
  }
}

export default profileController;