import { body, param } from 'express-validator';

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const getScheduleValidator = [
  param('doctorId').isMongoId().withMessage('Invalid doctor id.')
];

export const upsertScheduleValidator = [
  body('doctorId').isMongoId().withMessage('Invalid doctor id.'),
  body('workingDays')
    .isArray({ min: 1 })
    .withMessage('workingDays must be a non-empty array of numbers 0-6.'),
  body('workingDays.*').isInt({ min: 0, max: 6 }).withMessage('workingDays values must be 0-6.'),
  body('sessions').isArray({ min: 1 }).withMessage('At least one session is required.'),
  body('sessions.*.name').trim().notEmpty().withMessage('Session name is required.'),
  body('sessions.*.startTime').matches(timePattern).withMessage('Session startTime must be HH:MM.'),
  body('sessions.*.endTime').matches(timePattern).withMessage('Session endTime must be HH:MM.'),
  body('slotDuration').isInt({ min: 5, max: 240 }).withMessage('slotDuration must be between 5 and 240 minutes.'),
  body('breakTimings').isArray().withMessage('breakTimings must be an array.'),
  body('breakTimings.*.startTime').matches(timePattern).withMessage('Break startTime must be HH:MM.'),
  body('breakTimings.*.endTime').matches(timePattern).withMessage('Break endTime must be HH:MM.')
];
