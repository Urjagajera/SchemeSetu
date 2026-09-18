import rateLimit from 'express-rate-limit';

/** POST /api/auth/* — login/logout attempts. Tight: this is the credential-verification surface. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many auth attempts, please try again later.', status: 429 } },
});

/** POST /api/chat/* — chat messages. Looser: legitimate back-and-forth conversation. */
export const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many chat messages, please slow down.', status: 429 } },
});
