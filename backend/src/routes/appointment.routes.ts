import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import {
  createAppointmentValidator,
  updateAppointmentValidator,
  idParamValidator,
  listAppointmentsValidator
} from '../validators/appointment.validator';
import { validateRequest } from '../middlewares/validate.middleware';

const router = Router();

router.post(
  '/appointments',
  authenticateJWT,
  authorizeRoles('Super Admin', 'Receptionist'),
  createAppointmentValidator,
  validateRequest,
  appointmentController.createAppointment
);

router.get('/appointments', authenticateJWT, listAppointmentsValidator, validateRequest, appointmentController.listAppointments);

router.put(
  '/appointments/:id',
  authenticateJWT,
  updateAppointmentValidator,
  validateRequest,
  appointmentController.updateAppointment
);

router.delete(
  '/appointments/:id',
  authenticateJWT,
  authorizeRoles('Super Admin', 'Receptionist'),
  idParamValidator,
  validateRequest,
  appointmentController.cancelAppointment
);

router.post(
  '/appointments/:id/arrive',
  authenticateJWT,
  authorizeRoles('Super Admin', 'Receptionist'),
  idParamValidator,
  validateRequest,
  appointmentController.arriveAppointment
);

export default router;
