/**
 * Standard operational error class. Thrown deliberately from services/controllers
 * so the centralized error middleware can turn it into a consistent JSON response
 * without leaking stack traces or internal details to the client.
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Authentication required.') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Forbidden. Insufficient permissions.') {
    return new ApiError(403, message);
  }
  static notFound(message: string) {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
  static internal(message = 'Internal server error.') {
    return new ApiError(500, message);
  }
}
