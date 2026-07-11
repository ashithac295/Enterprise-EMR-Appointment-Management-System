import { Router } from 'express';
import * as patientController from '../controllers/patient.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.get('/patients', authenticateJWT, patientController.searchPatients);

export default router;
