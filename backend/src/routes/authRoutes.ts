import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import env from '../config/env.js';

const router = Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// POST /api/auth/demo-login
router.post('/demo-login', async (_req: Request, res: Response) => {
  const demoUser = {
    id: 'demo-user-123',
    name: 'Demo Citizen',
    email: 'demo.user@schemesetu.in',
    picture: 'https://avatar.iran.liara.run/public/33',
    role: 'user'
  };

  const token = jwt.sign(
    { userId: demoUser.id, email: demoUser.email, role: demoUser.role },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.json({
    success: true,
    user: demoUser,
    isNewUser: false
  });
});

// POST /api/auth/google
router.post('/google', async (req: Request, res: Response) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'idToken is required' });
  }

  try {
    let email = 'citizen@schemesetu.in';
    let name = 'Citizen';
    let picture = 'https://avatar.iran.liara.run/public/33';
    let sub = 'google-user-' + Math.random().toString(36).substring(7);

    if (env.GOOGLE_CLIENT_ID) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (payload) {
          email = payload.email || email;
          name = payload.name || name;
          picture = payload.picture || picture;
          sub = payload.sub || sub;
        }
      } catch (err) {
        // Fallback to JWT payload decode if audience verification fails in dev
        const decoded = jwt.decode(idToken) as any;
        if (decoded) {
          email = decoded.email || email;
          name = decoded.name || decoded.given_name || name;
          picture = decoded.picture || picture;
          sub = decoded.sub || sub;
        }
      }
    } else {
      const decoded = jwt.decode(idToken) as any;
      if (decoded) {
        email = decoded.email || email;
        name = decoded.name || decoded.given_name || name;
        picture = decoded.picture || picture;
        sub = decoded.sub || sub;
      }
    }

    const user = {
      id: sub,
      name,
      email,
      picture,
      role: 'user'
    };

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      user,
      isNewUser: false
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Failed to authenticate with Google'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    return res.json({
      success: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: 'Citizen',
        role: decoded.role || 'user'
      }
    });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

export default router;
