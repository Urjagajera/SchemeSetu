import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { schemeRouter } from './routes/schemeRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration supporting local frontend dev origin
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api', schemeRouter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 Route handler for API endpoints
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Basic error handling middleware (prevents stack traces leakage in production)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Global Error Handler]:', err.stack || err.message);
  
  const status = (err as any).status || 500;
  res.status(status).json({
    error: {
      message: status === 500 ? 'Internal Server Error' : err.message,
      status
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Express backend listening on http://localhost:${PORT}`);
});
