import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../models/User.model';

export interface JwtUserPayload {
  _id: string;
  email: string;
  role: UserRole;
  name: string;
}

// Augment Express's Request type globally so req.user is typed everywhere
// without needing a custom "AuthenticatedRequest" alias on every handler.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export function authenticateJWT(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication required. Token missing.'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret) as JwtUserPayload;
    req.user = payload;
    next();
  } catch (error) {
    next(ApiError.unauthorized('Authentication failed. Invalid or expired token.'));
  }
}
