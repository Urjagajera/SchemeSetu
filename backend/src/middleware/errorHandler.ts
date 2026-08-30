import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import config from '../config/env.js';

interface AppError extends Error {
  status?: number;
}

/**
 * Centralized 4-argument Express error handler.
 * MUST be mounted last in app.ts (after all routes).
 *
 * Returns a consistent JSON shape: { error: { message, status } }
 * Stack traces are stripped in production.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err.status ?? 500;
  const isProduction = config.NODE_ENV === 'production';

  logger.error({
    status,
    message: err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });

  res.status(status).json({
    error: {
      message: status === 500 && isProduction ? 'Internal server error' : err.message,
      status,
    },
  });
}
