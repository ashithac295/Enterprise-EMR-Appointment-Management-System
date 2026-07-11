import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';
import { createDoctorValidator, createReceptionistValidator } from '../validators/auth.validator';
import { validateRequest } from '../middlewares/validate.middleware';

const router = Router();

router.get('/doctors', authenticateJWT, doctorController.getDoctors);

router.post(
  '/admin/doctors',
  authenticateJWT,
  authorizeRoles('Super Admin'),
  createDoctorValidator,
  validateRequest,
  doctorController.createDoctor
);

router.post(
  '/admin/receptionists',
  authenticateJWT,
  authorizeRoles('Super Admin'),
  createReceptionistValidator,
  validateRequest,
  doctorController.createReceptionist
);

export default router;
