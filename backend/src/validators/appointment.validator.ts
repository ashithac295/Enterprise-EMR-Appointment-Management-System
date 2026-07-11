import { body, param, query } from 'express-validator';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const slotsQueryValidator = [
  query('doctorId').isMongoId().withMessage('Invalid doctor id.'),
  query('date').matches(datePattern).withMessage('date must be in YYYY-MM-DD format.')
];

export const createAppointmentValidator = [
  body('patientType').isIn(['Existing', 'New']).withMessage('patientType must be Existing or New.'),
  body('patientId')
    .if(body('patientType').equals('Existing'))
    .isMongoId()
    .withMessage('A valid patientId is required for existing patients.'),
  body('patientName').trim().notEmpty().withMessage('patientName is required.'),
  body('patientMobile')
    .trim()
    .matches(/^[0-9+\-\s]{7,15}$/)
    .withMessage('A valid patientMobile is required.'),
  body('patientEmail').optional({ checkFalsy: true }).isEmail().withMessage('patientEmail must be valid.'),
  body('doctorId').isMongoId().withMessage('Invalid doctor id.'),
  body('date').matches(datePattern).withMessage('date must be in YYYY-MM-DD format.'),
  body('time').matches(timePattern).withMessage('time must be in HH:MM format.'),
  body('purpose').trim().notEmpty().withMessage('purpose is required.'),
  body('notes').optional().trim()
];

export const updateAppointmentValidator = [
  param('id').isMongoId().withMessage('Invalid appointment id.'),
  body('purpose').optional().trim().notEmpty().withMessage('purpose cannot be empty.'),
  body('notes').optional().trim(),
  body('status')
    .optional()
    .isIn(['Scheduled', 'Arrived', 'Completed', 'Cancelled'])
    .withMessage('Invalid status value.')
];

export const idParamValidator = [param('id').isMongoId().withMessage('Invalid id.')];

export const listAppointmentsValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['date', 'patientName', 'doctorName', 'status', 'createdAt']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('startDate').optional().matches(datePattern),
  query('endDate').optional().matches(datePattern)
];
