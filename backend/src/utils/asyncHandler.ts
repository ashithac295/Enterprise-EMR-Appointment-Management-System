import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async route/controller handlers so rejected promises are forwarded to
 * the centralized error middleware instead of crashing the process or requiring
 * try/catch boilerplate in every controller.
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
