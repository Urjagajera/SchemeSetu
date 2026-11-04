import axios from 'axios';
import { ChatMessage, ChatConversation } from '../types';

const API_URL = '/api/chat';

function isHtmlFallback(data: unknown): boolean {
  return (
    typeof data === 'string' &&
    (data.trimStart().startsWith('<!DOCTYPE') || data.trimStart().startsWith('<html'))
  );
}

function assertJsonArray<T>(data: unknown, context: string): T[] {
  if (!Array.isArray(data) || isHtmlFallback(data)) {
    throw new Error(
      `[chatService.${context}] Expected JSON array, got ${typeof data}. Backend may not be running.`
    );
  }
  return data as T[];
}

function assertJsonObject<T>(data: unknown, context: string): T {
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data) || isHtmlFallback(data)) {
    throw new Error(
      `[chatService.${context}] Expected JSON object, got ${typeof data}. Backend may not be running.`
    );
  }
  return data as T;
}

/** The first message of a new conversation. Shown as written (English), like scheme names; replies follow the page language. */
export const WELCOME_TEXT = `Hello! I'm **SetuAI**. Ask me about government schemes and I'll answer from SchemeSetu's scheme data, written with AI. It can make mistakes, so check details on the official portal before you apply.`;

function buildDefaultConversations(): ChatConversation[] {
  return [{
    id: 'welcome',
    title: 'Introduction to SetuAI',
    messages: [
      {
        id: 'init-msg',
        sender: 'ai',
        text: WELCOME_TEXT,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    lastUpdated: new Date().toISOString()
  }];
}

export const chatService = {
  /**
   * SetuAI's answer to a message, given the conversation so far and the page language. Throws when the server can't be
   * reached: the page then says so, instead of making up an answer.
   */
  async sendMessage(
    text: string,
    conversationId: string,
    opts: { history?: Array<Pick<ChatMessage, 'sender' | 'text'>>; language?: 'en' | 'hi' | 'gu' } = {},
  ): Promise<ChatMessage> {
    const history = (opts.history ?? []).slice(-6).map((m) => ({ sender: m.sender, text: m.text }));
    const response = await axios.post(`${API_URL}/message`, { text, conversationId, history, language: opts.language ?? 'en' });
    return assertJsonObject<ChatMessage>(response.data, 'sendMessage');
  },

  async getConversations(): Promise<ChatConversation[]> {
    try {
      const response = await axios.get(API_URL);
      return assertJsonArray<ChatConversation>(response.data, 'getConversations');
    } catch (error) {
      console.warn('[chatService.getConversations] Backend not available — loading from localStorage.', (error as Error).message);

      try {
        const raw = localStorage.getItem('schemesetu_chats');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed as ChatConversation[];
          }
        }
      } catch {
        // localStorage parse error — fall through to defaults
      }

      const defaultChats = buildDefaultConversations();
      localStorage.setItem('schemesetu_chats', JSON.stringify(defaultChats));
      return defaultChats;
    }
  },

  async saveConversations(conversations: ChatConversation[]): Promise<void> {
    try {
      await axios.put(API_URL, { conversations });
    } catch {
      // Backend not available — persist locally
      localStorage.setItem('schemesetu_chats', JSON.stringify(conversations));
    }
  }
};
