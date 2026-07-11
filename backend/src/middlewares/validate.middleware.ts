import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError';

/** Runs after express-validator chains; converts failures into a 400 ApiError. */
export function validateRequest(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({
      field: 'path' in e ? (e as any).path : undefined,
      message: e.msg
    }));
    return next(ApiError.badRequest('Validation failed.', details));
  }
  next();
}
