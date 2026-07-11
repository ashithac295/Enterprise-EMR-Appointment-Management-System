import { Router } from 'express';
import * as scheduleController from '../controllers/schedule.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { getScheduleValidator, upsertScheduleValidator } from '../validators/schedule.validator';
import { validateRequest } from '../middlewares/validate.middleware';

const router = Router();

router.get('/admin/schedules/:doctorId', authenticateJWT, getScheduleValidator, validateRequest, scheduleController.getSchedule);

router.post(
  '/admin/schedules',
  authenticateJWT,
  authorizeRoles('Super Admin'),
  upsertScheduleValidator,
  validateRequest,
  scheduleController.upsertSchedule
);

export default router;
