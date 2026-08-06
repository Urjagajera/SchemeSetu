// src/middleware/requireAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token'
    });
  }
};
