import { Router } from 'express';
import * as slotController from '../controllers/slot.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { slotsQueryValidator } from '../validators/appointment.validator';
import { validateRequest } from '../middlewares/validate.middleware';

const router = Router();

router.get('/slots', authenticateJWT, slotsQueryValidator, validateRequest, slotController.getSlots);

export default router;
