import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../shared/response';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  if (err instanceof ZodError) {
    return sendError(res, 'VALIDATION_ERROR', 'Request validation failed', 400, err.errors);
  }

  const statusCode = (err as { status?: number; statusCode?: number }).statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(
    res,
    statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR',
    message,
    statusCode
  );
}
