import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import config from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SESSION_COOKIE_NAME, SessionPayload } from '../middleware/requireAuth.js';
import { createGroqLlm } from '../translation/llm.js';
import { answerQuestion, ChatTurn } from '../chat/assistant.js';
import { findSchemesForChat } from '../chat/findSchemes.js';
import { loadChatProfile } from '../chat/loadChatProfile.js';

const router = Router();

// One small client for chats: a person is waiting, so a short timeout and one retry.
const llm = config.GROQ_API_KEY ? createGroqLlm(config.GROQ_API_KEY, { maxConcurrent: 4, timeoutMs: 25_000, maxRetries: 1 }) : null;

const MAX_TEXT = 1000;
const MAX_HISTORY = 6;

const body = z.object({
  text: z.string().trim().min(1, 'text is required').max(MAX_TEXT, `Messages can be at most ${MAX_TEXT} characters`),
  conversationId: z.string().optional(),
  language: z.enum(['en', 'hi', 'gu']).catch('en').default('en'),
  history: z
    .array(z.object({ sender: z.enum(['user', 'ai']), text: z.string() }))
    .catch([])
    .default([])
    .transform((turns): ChatTurn[] => turns.slice(-MAX_HISTORY).map((t) => ({ sender: t.sender, text: t.text.slice(0, MAX_TEXT) }))),
});

/** The signed-in user's id when the session cookie is valid; null otherwise (the chat is open to guests too). */
function sessionUserId(req: Request): string | null {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) return null;
  try {
    return (jwt.verify(token, config.SESSION_SECRET) as SessionPayload).userId ?? null;
  } catch {
    return null;
  }
}

/**
 * POST /api/chat/message { text, history?, language? }
 * SetuAI's answer, written by Groq from the schemes that match the question (see chat/assistant.ts). For a signed-in
 * person the profile's eligibility answers are used too, never their name or email (chat/profileForChat.ts).
 * Without a Groq key, or when Groq fails, the reply lists the matching schemes instead.
 */
router.post(
  '/message',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = body.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: { message: parsed.error.issues[0]?.message ?? 'Invalid message', status: 400 } });
      return;
    }
    const { text, history, language } = parsed.data;
    const userId = sessionUserId(req);
    const profile = userId ? await loadChatProfile(userId) : null;

    const answer = await answerQuestion(
      { question: text, history, language, profile },
      { llm, model: config.CHAT_MODEL, findSchemes: findSchemesForChat },
    );

    res.json({
      id: Math.random().toString(36).substring(7),
      sender: 'ai',
      text: answer.text,
      source: answer.source,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }),
);

export default router;
