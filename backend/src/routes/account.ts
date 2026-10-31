import { Router, Request, Response } from 'express';
import prisma from '../db/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { clearSessionCookie } from '../utils/sessionCookie.js';
import { currentAge } from '../utils/ageFromDob.js';

const router = Router();

// Everything here is about the signed-in user's own data, and only theirs: the id always comes from the session.
router.use(requireAuth);

/**
 * GET /api/account/export
 * The caller's own data as JSON: the account fields we hold, the profile (null if never saved), the bookmarks and
 * the document checklists.
 */
router.get(
  '/export',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: { message: 'Account not found', status: 404 } });
      return;
    }
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: { scheme: { select: { name: true, sourceUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const checklists = await prisma.documentChecklist.findMany({
      where: { userId },
      include: { scheme: { select: { name: true } } },
      orderBy: { updatedAt: 'asc' },
    });

    res.setHeader('Content-Disposition', 'attachment; filename="schemesetu-my-data.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        profilePictureUrl: user.profilePictureUrl,
        createdAt: user.createdAt,
      },
      profile: profile
        ? {
            age: currentAge(profile),
            dob: profile.dob,
            gender: profile.gender,
            occupation: profile.occupation,
            education: profile.education,
            income: profile.income,
            category: profile.category,
            state: profile.state,
            district: profile.district,
            residence: profile.residence,
            minority: profile.minority,
            disability: profile.disability,
            farmer: profile.farmer,
            widow: profile.widow,
            veteran: profile.veteran,
            land: profile.land,
            interestTags: profile.profileTags,
            documentsHeld: profile.documentsHeld,
          }
        : null,
      bookmarks: bookmarks.map((b) => ({ schemeId: b.schemeId, schemeName: b.scheme.name, schemeUrl: b.scheme.sourceUrl, savedAt: b.createdAt })),
      documentChecklists: checklists.map((c) => ({ schemeId: c.schemeId, schemeName: c.scheme.name, ticked: c.checked, untickedOnPurpose: c.unchecked, updatedAt: c.updatedAt })),
    });
  }),
);

/**
 * DELETE /api/account
 * Removes the caller's bookmarks, document checklists, profile and user row in one transaction, then clears the
 * session cookie.
 * The browser asks for a typed confirmation first; the server itself only needs the signed-in session.
 */
router.delete(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const [bookmarks, checklists, profile, user] = await prisma.$transaction([
      prisma.bookmark.deleteMany({ where: { userId } }),
      prisma.documentChecklist.deleteMany({ where: { userId } }),
      prisma.profile.deleteMany({ where: { userId } }),
      prisma.user.deleteMany({ where: { id: userId } }),
    ]);
    clearSessionCookie(res);
    res.json({ success: true, deleted: { bookmarks: bookmarks.count, documentChecklists: checklists.count, profile: profile.count, account: user.count } });
  }),
);

export default router;
