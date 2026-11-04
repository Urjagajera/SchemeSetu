import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mocks = vi.hoisted(() => ({
  answerQuestion: vi.fn(),
  loadChatProfile: vi.fn(),
}));

vi.mock('../config/env.js', () => ({ default: { NODE_ENV: 'test', SESSION_SECRET: 'test-secret', CHAT_MODEL: 'small-model', GROQ_API_KEY: undefined } }));
vi.mock('../chat/assistant.js', () => ({ answerQuestion: mocks.answerQuestion }));
vi.mock('../chat/loadChatProfile.js', () => ({ loadChatProfile: mocks.loadChatProfile }));
vi.mock('../chat/findSchemes.js', () => ({ findSchemesForChat: vi.fn() }));

const { default: chatRouter } = await import('./chat.js');
const { errorHandler } = await import('../middleware/errorHandler.js');

function app() {
  const a = express();
  a.use(express.json());
  a.use(cookieParser());
  a.use('/api/chat', chatRouter);
  a.use(errorHandler);
  return a;
}
const send = (body: unknown, cookie?: string) => {
  const r = request(app()).post('/api/chat/message');
  return (cookie ? r.set('Cookie', cookie) : r).send(body as object);
};
const cookieFor = (userId: string) => `schemesetu_session=${jwt.sign({ userId }, 'test-secret')}`;
const input = () => mocks.answerQuestion.mock.calls[0][0];

beforeEach(() => {
  mocks.answerQuestion.mockReset().mockResolvedValue({ text: 'An answer', source: 'ai' });
  mocks.loadChatProfile.mockReset().mockResolvedValue({ gender: 'female', income: '40000' });
});

describe('POST /api/chat/message', () => {
  it('returns the answer as a chat message', async () => {
    const res = await send({ text: 'What is PM Kisan?' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ sender: 'ai', text: 'An answer', source: 'ai' });
    expect(res.body.id).toEqual(expect.any(String));
  });

  it('a guest is answered without any profile', async () => {
    await send({ text: 'hi' });
    expect(mocks.loadChatProfile).not.toHaveBeenCalled();
    expect(input().profile).toBeNull();
  });

  it('a signed-in person is answered with their eligibility details, looked up from the session alone', async () => {
    await send({ text: 'What can I get?', userId: 'someone-else' }, cookieFor('u1'));
    expect(mocks.loadChatProfile).toHaveBeenCalledWith('u1');
    expect(input().profile).toEqual({ gender: 'female', income: '40000' });
  });

  it('a forged or expired session counts as a guest, not an error', async () => {
    const res = await send({ text: 'hi' }, `schemesetu_session=${jwt.sign({ userId: 'u1' }, 'wrong-secret')}`);
    expect(res.status).toBe(200);
    expect(mocks.loadChatProfile).not.toHaveBeenCalled();
  });

  it('passes the language, and only the last six turns of the conversation, each at most 1,000 characters', async () => {
    const history = Array.from({ length: 9 }, (_, i) => ({ sender: i % 2 ? 'ai' : 'user', text: `turn ${i} ${'x'.repeat(1200)}` }));
    await send({ text: 'and then?', language: 'gu', history });
    expect(input().language).toBe('gu');
    expect(input().history).toHaveLength(6);
    expect(input().history[0].text.startsWith('turn 3')).toBe(true);
    expect(input().history.every((t: { text: string }) => t.text.length <= 1000)).toBe(true);
  });

  it('an unknown language or a malformed history is ignored, not an error', async () => {
    const res = await send({ text: 'hi', language: 'fr', history: 'nope' });
    expect(res.status).toBe(200);
    expect(input().language).toBe('en');
    expect(input().history).toEqual([]);
  });

  it.each([[{}], [{ text: '' }], [{ text: '   ' }], [{ text: 42 }], [{ text: 'x'.repeat(1001) }]])('rejects %j', async (body) => {
    expect((await send(body)).status).toBe(400);
    expect(mocks.answerQuestion).not.toHaveBeenCalled();
  });
});
