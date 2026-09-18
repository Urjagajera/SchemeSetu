import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authLimiter, chatLimiter } from './middleware/rateLimiters.js';
import healthRouter from './routes/health.js';
import schemesRouter from './routes/schemes.js';
import categoriesRouter from './routes/categories.js';
import eligibilityRouter from './routes/eligibility.js';
import chatRouter from './routes/chat.js';
import bookmarksRouter from './routes/bookmarks.js';
import authRouter from './routes/auth.js';

const app = express();

// ── Middleware (order matters) ───────────────────────────────
app.use(helmet());           // Security headers (CSP/HSTS/etc — this is a JSON API, no HTML to break)
app.use(
  cors({
    // A fixed origin (not "*") is required alongside credentials: true — the
    // frontend sets axios.defaults.withCredentials = true so the session
    // cookie rides along, and browsers refuse credentialed requests to a
    // wildcard origin. This is also why this can no longer rely on Vite's
    // dev proxy making cross-origin invisible — a deployed frontend and
    // backend are genuinely different origins.
    origin: config.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());     // Parse JSON request bodies
app.use(cookieParser());     // Parse the session cookie for requireAuth
app.use(requestLogger);      // Log every request: method, path, status, duration

// ── Routes ───────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/schemes', schemesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/eligibility', eligibilityRouter);
app.use('/api/chat', chatLimiter, chatRouter);
app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/auth', authLimiter, authRouter);

// ── Error handler (MUST be last) ─────────────────────────────
app.use(errorHandler);

export default app;
