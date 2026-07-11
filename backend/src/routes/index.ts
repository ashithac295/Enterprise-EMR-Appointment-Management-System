import { Router } from 'express';
import authRoutes from './auth.routes';
import doctorRoutes from './doctor.routes';
import scheduleRoutes from './schedule.routes';
import slotRoutes from './slot.routes';
import appointmentRoutes from './appointment.routes';
import patientRoutes from './patient.routes';
import auditLogRoutes from './auditLog.routes';

const router = Router();

router.use('/auth', authRoutes);
// The remaining route modules each define their own full sub-paths
// (e.g. /doctors, /admin/schedules/:doctorId) so they're mounted at the
// API root rather than under an extra prefix segment.
router.use('/', doctorRoutes);
router.use('/', scheduleRoutes);
router.use('/', slotRoutes);
router.use('/', appointmentRoutes);
router.use('/', patientRoutes);
router.use('/', auditLogRoutes);

export default router;
