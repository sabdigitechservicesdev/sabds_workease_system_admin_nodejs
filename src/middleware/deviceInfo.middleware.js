// middleware/deviceInfo.middleware.js
import OTPService from '../services/otp.service.js';

const deviceInfoMiddleware = (req, res, next) => {
  // Extract device info from request
  req.deviceInfo = OTPService.extractDeviceInfo(req);
  next();
};

export default deviceInfoMiddleware;