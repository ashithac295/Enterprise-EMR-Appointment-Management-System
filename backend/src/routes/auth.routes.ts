import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { loginValidator, refreshValidator } from '../validators/auth.validator';
import { validateRequest } from '../middlewares/validate.middleware';

const router = Router();

router.post('/login', loginValidator, validateRequest, authController.login);
router.post('/refresh', refreshValidator, validateRequest, authController.refresh);
router.post('/logout', authController.logout);

export default router;
