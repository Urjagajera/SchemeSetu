import express from 'express';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';

const app = express();

// ── Middleware (order matters) ───────────────────────────────
app.use(express.json());     // Parse JSON request bodies
app.use(requestLogger);      // Log every request: method, path, status, duration

// ── Routes ───────────────────────────────────────────────────
app.use('/health', healthRouter);

// ── Error handler (MUST be last) ─────────────────────────────
app.use(errorHandler);

export default app;
