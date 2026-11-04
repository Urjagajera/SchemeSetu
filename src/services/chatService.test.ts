import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const post = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({ default: { post, get: vi.fn(), put: vi.fn() } }));

import { chatService, WELCOME_TEXT } from './chatService';

beforeEach(() => post.mockClear());

describe('chatService.sendMessage', () => {
  it('sends the question, the language and at most the last six turns (sender and text only)', async () => {
    post.mockResolvedValue({ data: { id: 'r', sender: 'ai', text: 'ok', timestamp: '10:00' } });
    const history = Array.from({ length: 8 }, (_, i) => ({ id: `m${i}`, sender: i % 2 ? 'ai' : 'user', text: `t${i}`, timestamp: 'x' }) as const);
    await chatService.sendMessage('q', 'c1', { history: [...history], language: 'hi' });
    expect(post).toHaveBeenCalledWith('/api/chat/message', {
      text: 'q',
      conversationId: 'c1',
      language: 'hi',
      history: history.slice(2).map(({ sender, text }) => ({ sender, text })),
    });
  });

  it('has no made-up answers to fall back on: a failed call reaches the page, which says it could not connect', () => {
    // (The page's handling of a failed call is tested in AIAssistant.test.tsx.)
    const src = fs.readFileSync(path.resolve(__dirname, 'chatService.ts'), 'utf8');
    const send = src.slice(src.indexOf('async sendMessage('), src.indexOf('async getConversations('));
    expect(send).not.toMatch(/catch|MOCK_RESPONSES|simulat/);
    expect(src).not.toContain('MOCK_RESPONSES');
  });

  it('the welcome note says the answers are written with AI and can be wrong', () => {
    expect(WELCOME_TEXT).toMatch(/written with AI/);
    expect(WELCOME_TEXT).toMatch(/can make mistakes/);
    expect(WELCOME_TEXT).not.toMatch(/not a live assistant|ready-made/);
  });
});
