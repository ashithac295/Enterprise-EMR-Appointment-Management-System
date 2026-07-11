import { Response } from 'express';

interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

/**
 * Enforces the consistent API response envelope required by the assessment:
 * { success, message, data, meta }
 */
export function sendSuccess(
  res: Response,
  statusCode: number,
  message: string,
  data: unknown = null,
  meta?: Meta
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {})
  });
}
