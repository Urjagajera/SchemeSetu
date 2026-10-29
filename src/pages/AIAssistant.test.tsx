import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ChatConversation } from '../types';

const mocks = vi.hoisted(() => ({
  getConversations: vi.fn(),
  sendMessage: vi.fn(),
  saveConversations: vi.fn(),
}));

vi.mock('../services/chatService', () => ({ chatService: mocks }));
vi.mock('../contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key, language: 'en' }) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false }) }));

import { AIAssistant } from './AIAssistant';

const msg = (id: string, sender: 'user' | 'ai', text: string) => ({ id, sender, text, timestamp: '10:00' });
const conv = (id: string, title: string, messages: ReturnType<typeof msg>[]): ChatConversation =>
  ({ id, title, messages, lastUpdated: '2026-10-29T10:00:00Z' }) as ChatConversation;

const announcer = () => screen.getByTestId('reply-announcer');

async function renderPage(conversations: ChatConversation[]) {
  mocks.getConversations.mockResolvedValue(conversations);
  render(<MemoryRouter initialEntries={['/ai']}><AIAssistant /></MemoryRouter>);
  await act(async () => {});
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  mocks.getConversations.mockReset();
  mocks.sendMessage.mockReset();
  mocks.saveConversations.mockReset().mockResolvedValue(undefined);
});

describe('SetuAI: new replies are announced to screen readers', () => {
  it('is a polite live region, read without interrupting', async () => {
    await renderPage([]);
    expect(announcer().getAttribute('aria-live')).toBe('polite');
  });

  it('reads out a reply when it arrives, without the bold markers', async () => {
    await renderPage([conv('c1', 'Earlier', [msg('m1', 'ai', 'Hello')])]);
    mocks.sendMessage.mockResolvedValue(msg('m3', 'ai', '**PM Kisan** gives ₹6,000 a year.'));
    fireEvent.change(screen.getByRole('textbox', { name: 'typeQueryHere' }), { target: { value: 'What is PM Kisan?' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'sendMessage' })); });
    expect(announcer().textContent).toBe('PM Kisan gives ₹6,000 a year.');
  });

  it('says nothing for the replies already there when the page opens', async () => {
    await renderPage([conv('c1', 'Earlier', [msg('m1', 'user', 'Hi'), msg('m2', 'ai', 'An old answer')])]);
    expect(announcer().textContent).toBe('');
  });

  it('says nothing when switching to another conversation', async () => {
    await renderPage([
      conv('c1', 'First chat', [msg('m1', 'ai', 'First answer')]),
      conv('c2', 'Second chat', [msg('m2', 'user', 'Q'), msg('m3', 'ai', 'Second answer')]),
    ]);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Second chat' })); });
    expect(screen.getByText('Second answer')).not.toBeNull();
    expect(announcer().textContent).toBe('');
  });

  it('the delete button names the conversation it deletes', async () => {
    await renderPage([conv('c1', 'First chat', [msg('m1', 'ai', 'x')])]);
    expect(screen.getByRole('button', { name: 'deleteConversation: First chat' })).not.toBeNull();
  });
});
