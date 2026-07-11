import { Router } from 'express';
import * as auditLogController from '../controllers/auditLog.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { authorizeRoles } from '../middlewares/rbac.middleware';

const router = Router();

router.get('/audit-logs', authenticateJWT, authorizeRoles('Super Admin'), auditLogController.getAuditLogs);

export default router;
