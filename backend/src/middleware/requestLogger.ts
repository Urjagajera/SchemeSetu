import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

/**
 * Logs method, path, status code, and response time for every request.
 * Attaches a start timestamp on the way in and logs on the way out.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}
