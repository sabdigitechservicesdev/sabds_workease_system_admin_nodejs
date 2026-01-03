import { body } from 'express-validator';

export const SystemRegisterValidator = [
  body('admin_name')
    .trim()
    .notEmpty().withMessage('Admin name is required')
    .isLength({ min: 3, max: 50 }).withMessage('Admin name must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Admin name can only contain letters, numbers and underscores'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),

  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),

  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),

  body('middle_name')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Middle name too long'),


  body('area').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('pincode')
    .optional()
    .matches(/^\d{6}$/).withMessage('Invalid pincode format')
];

export const SystemLoginValidator = [
  body('identifier')
    .notEmpty().withMessage('Email or username is required')
    .custom(value => {
      // allow email OR username
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;

      if (!emailRegex.test(value) && !usernameRegex.test(value)) {
        throw new Error('Invalid email or username format');
      }
      return true;
    }),

  body('password')
    .notEmpty().withMessage('Password is required')
];


export default {
  SystemRegisterValidator,
  SystemLoginValidator,
};