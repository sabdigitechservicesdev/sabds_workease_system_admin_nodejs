import { body } from 'express-validator';

export const SendOTPValidator = [
  body('identifier')
    .notEmpty().withMessage('Email or username is required')
    .custom(value => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;

      if (!emailRegex.test(value) && !usernameRegex.test(value)) {
        throw new Error('Invalid email or username format');
      }
      return true;
    })
];

export const VerifyOTPValidator = [
  body('identifier')
    .notEmpty().withMessage('Email or username is required')
    .custom(value => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;

      if (!emailRegex.test(value) && !usernameRegex.test(value)) {
        throw new Error('Invalid email or username format');
      }
      return true;
    }),

  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),

  body('processId')
    .optional()
    .notEmpty().withMessage('Process ID must not be empty if provided')
    .isString().withMessage('Process ID must be a string')
];

export default {
  SendOTPValidator,
  VerifyOTPValidator
};