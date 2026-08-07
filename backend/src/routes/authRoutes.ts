// src/routes/authRoutes.ts
import { Router, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import env from '../config/env.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth.js';

const router = Router();
const oauthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// Helper to find/create user and issue session JWT/cookie
async function createSessionAndSendResponse(
  email: string,
  name: string | null,
  picture: string,
  res: Response
) {
  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true }
  });

  let isNewUser = false;

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name
      },
      include: { profile: true }
    });
    isNewUser = true;
  } else {
    isNewUser = !user.profile;
  }

  // Issue session JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Set cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture
    },
    isNewUser
  });
}

// POST /api/auth/google
router.post('/google', async (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: 'ID token is required'
    });
  }

  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
    }

    const email = payload.email;
    const name = payload.name || null;
    const picture = payload.picture || '';

    return await createSessionAndSendResponse(email, name, picture, res);
  } catch (error: any) {
    const authError: any = new Error('Unauthorized: Invalid or expired ID token');
    authError.status = 401;
    return next(authError);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { profile: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      isNewUser: !user.profile
    });
  } catch (error: any) {
    return next(error);
  }
});

// TEMP-DEMO-AUTH: remove before production
router.post('/demo-login', async (req, res, next) => {
  // TEMP-DEMO-AUTH: remove before production
  if (!env.ENABLE_DEMO_LOGIN) {
    // TEMP-DEMO-AUTH: remove before production
    return res.status(403).json({
      success: false,
      message: 'Demo login is disabled'
    });
  }

  try {
    // TEMP-DEMO-AUTH: remove before production
    const demoEmail = 'demo.user@schemesetu.in';
    const demoName = 'Demo User';
    const demoPicture = 'https://avatar.iran.liara.run/public/33';

    // TEMP-DEMO-AUTH: remove before production
    return await createSessionAndSendResponse(demoEmail, demoName, demoPicture, res);
  } catch (error: any) {
    // TEMP-DEMO-AUTH: remove before production
    return next(error);
  }
});

export default router;

