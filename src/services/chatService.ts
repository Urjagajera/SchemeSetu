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

const MOCK_RESPONSES: Record<string, string> = {
  'pm kisan': `**PM Kisan Samman Nidhi** provides ₹6,000/year to farmer families in 3 installments of ₹2,000 each.\n\n**Eligibility:** Land-owning farmers with income below ₹2L/year.\n\n**Documents needed:**\n- Aadhaar Card\n- Land Records (Khasra/Khatauni)\n- Bank Account linked to Aadhaar\n\n[View Full Details →](/schemes/pm-kisan)`,
  'ayushman': `**Ayushman Bharat PM-JAY** offers ₹5 Lakh annual health cover per family for hospital treatment.\n\n**Who qualifies:** BPL/SECC-listed families. Covers pre-existing conditions from Day 1.\n\n**No premium required** — it's fully government-funded.\n\n[View Full Details →](/schemes/ayushman-bharat)`,
  'scholarship': `SchemeSetu has several scholarship schemes:\n\n1. **Post-Matric Scholarship for SC Students** — for SC students with income < ₹2.5L\n2. **NMMSS** — for meritorious Class IX-XII students from economically weaker sections\n\nWould you like details on any specific scholarship? [Browse all education schemes →](/search?category=Education)`,
  'eligibility': `I can help you check your eligibility! Here's how:\n\n1. **Use our Eligibility Checker** — [Click here →](/eligibility)\n2. Answer 3 simple steps about your age, income, and occupation\n3. Get a personalized list of matching schemes\n\nOr tell me more about yourself (age, state, occupation) and I can give you a quick estimate!`,
  'documents': `**Common documents required for most government schemes:**\n\n- Aadhaar Card (mandatory for most)\n- Bank Account linked to Aadhaar\n- Income Certificate (from Tehsildar/SDM)\n- Caste Certificate (if applicable)\n- Age Proof (Birth Certificate or Class 10 Marksheet)\n- Address Proof\n\nThe exact documents vary by scheme. Check the scheme's detail page for the complete list.`,
  'default': `I'm **SetuAI**, your government scheme assistant!\n\nI can help you:\n- **Find schemes** you're eligible for\n- **Understand documents** required for applications\n- **Answer questions** about any specific scheme\n\nTry asking me: *"What is PM Kisan?"* or *"How do I check my eligibility?"*`
};

function buildDefaultConversations(): ChatConversation[] {
  return [{
    id: 'welcome',
    title: 'Introduction to SetuAI',
    messages: [
      {
        id: 'init-msg',
        sender: 'ai',
        text: `Hello! I am **SetuAI**, your intelligent government schemes guide. How can I assist you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    lastUpdated: new Date().toISOString()
  }];
}

export const chatService = {
  async sendMessage(text: string, conversationId: string): Promise<ChatMessage> {
    try {
      const response = await axios.post(`${API_URL}/message`, { text, conversationId });
      return assertJsonObject<ChatMessage>(response.data, 'sendMessage');
    } catch (error) {
      console.warn('[chatService.sendMessage] Backend not available — simulating reply locally.', (error as Error).message);
      await new Promise(resolve => setTimeout(resolve, 800));

      const q = text.toLowerCase();
      let reply = MOCK_RESPONSES['default'];

      if (q.includes('pm kisan') || q.includes('kisan') || q.includes('farmer')) {
        reply = MOCK_RESPONSES['pm kisan'];
      } else if (q.includes('ayushman') || q.includes('health') || q.includes('pmjay')) {
        reply = MOCK_RESPONSES['ayushman'];
      } else if (q.includes('scholarship') || q.includes('education') || q.includes('student')) {
        reply = MOCK_RESPONSES['scholarship'];
      } else if (q.includes('eligib') || q.includes('qualify') || q.includes('check')) {
        reply = MOCK_RESPONSES['eligibility'];
      } else if (q.includes('document') || q.includes('aadhaar') || q.includes('certificate')) {
        reply = MOCK_RESPONSES['documents'];
      }

      return {
        id: Math.random().toString(36).substring(7),
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    }
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
