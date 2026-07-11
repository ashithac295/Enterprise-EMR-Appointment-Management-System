import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

/** Catches unmatched routes and forwards a consistent 404 into the error pipeline. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Centralized error handler. Every thrown/forwarded error (ApiError, Mongoose
 * errors, JSON parse errors, etc.) is normalized here into the standard
 * response envelope. Internal error details (stack traces, driver messages)
 * are only logged server-side and never sent to the client, satisfying the
 * "Secure Error Responses" requirement.
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  let statusCode = err instanceof ApiError ? err.statusCode : 500;
  let message = err instanceof ApiError ? err.message : 'Internal server error.';

  // Mongoose validation errors -> 400 with field details
  if (err?.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e: any) => e.message)
      .join(', ');
  }

  // Mongoose duplicate key errors -> 409 (covers the double-booking unique index)
  if (err?.code === 11000) {
    statusCode = 409;
    message = 'This slot has already been booked. Please choose another slot.';
  }

  // Malformed ObjectId cast -> 400 instead of leaking a 500
  if (err?.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier: ${err.value}`;
  }

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    ...(env.nodeEnv !== 'production' && statusCode >= 500 ? { stack: err.stack } : {})
  });
}
