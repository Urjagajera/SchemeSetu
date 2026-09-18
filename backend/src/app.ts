import express from 'express';
import cookieParser from 'cookie-parser';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import schemesRouter from './routes/schemes.js';
import categoriesRouter from './routes/categories.js';
import eligibilityRouter from './routes/eligibility.js';
import chatRouter from './routes/chat.js';
import bookmarksRouter from './routes/bookmarks.js';

const app = express();

// ── Middleware (order matters) ───────────────────────────────
app.use(express.json());     // Parse JSON request bodies
app.use(cookieParser());     // Parse the session cookie for requireAuth
app.use(requestLogger);      // Log every request: method, path, status, duration

// ── Routes ───────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/schemes', schemesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/eligibility', eligibilityRouter);
app.use('/api/chat', chatRouter);
app.use('/api/bookmarks', bookmarksRouter);

// ── Error handler (MUST be last) ─────────────────────────────
app.use(errorHandler);

export default app;
