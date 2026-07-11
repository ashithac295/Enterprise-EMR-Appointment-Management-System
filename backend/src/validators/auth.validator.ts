import { body } from 'express-validator';

export const loginValidator = [
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.')
];

export const refreshValidator = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required.')
];

export const createDoctorValidator = [
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('specialty').trim().notEmpty().withMessage('Specialty is required.'),
  body('department').trim().notEmpty().withMessage('Department is required.')
];

export const createReceptionistValidator = [
  body('email').isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('name').trim().notEmpty().withMessage('Name is required.')
];
