// src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import env from './config/env.js';
import prisma from './config/prisma.js';
import apiRouter from './routes/index.js';

const app = express();

// CORS – allow frontend dev origin with credentials
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));

// Cookie Parser
app.use(cookieParser());

// Body parser
app.use(express.json());

// Request logger – only in development
if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Mount routes
app.use('/api', apiRouter);

// Health check – ping DB
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    console.error('[Health Check] DB ping failed:', error);
    res.json({ status: 'ok', db: 'disconnected' });
  }
});

// 404 handler for API endpoints
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { message: 'Route not found', status: 404 } });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Global Error Handler]:', err.stack || err.message);
  const status = (err as any).status || 500;
  res.status(status).json({
    error: {
      message: status === 500 ? 'Internal Server Error' : err.message,
      status,
      ...(env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

export default app;
