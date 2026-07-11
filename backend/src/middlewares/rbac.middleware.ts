import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../models/User.model';

/**
 * Role-based access control gate. Must run after authenticateJWT so req.user
 * is populated. Usage: router.post('/x', authenticateJWT, authorizeRoles('Super Admin'), handler)
 */
export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    next();
  };
}
