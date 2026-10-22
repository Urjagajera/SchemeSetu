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
  'pm kisan': `**PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)** gives ₹6,000 a year to each eligible farmer family, in 3 equal instalments of ₹2,000 every four months.\n\n**Who qualifies:** landholding farmer families with cultivable land in their own names.\n\n**Documents needed:**\n- Aadhaar Card\n- Landholding papers\n- Savings bank account\n\n[View PM-KISAN →](/search?q=PM-KISAN)`,
  'ayushman': `**Ayushman Bharat PM-JAY** gives cashless hospital cover of up to ₹5,00,000 per family per year.\n\n**Who qualifies:** in rural areas, families that meet the SECC deprivation criteria (for example SC/ST households, or landless households living mainly on manual casual labour); in urban areas, families in the listed worker categories.\n\nPre-existing diseases are covered from day one, and there is no limit on family size or age.\n\n[View Ayushman Bharat PM-JAY →](/search?q=Pradhan%20Mantri%20Jan%20Arogya%20Yojana)`,
  'scholarship': `SchemeSetu lists many scholarship schemes. Two central ones:\n\n1. **Post-Matric Scholarship for SC students** — for Scheduled Caste students who have passed Class 10, whose parents' income is not more than ₹2,50,000 a year. [View →](/search?q=Post-Matric%20Scholarship%20for%20SC%20students)\n2. **National Means-cum-Merit Scholarship (NMMSS)** — ₹12,000 a year from Class 9 to 12, for students in government, government-aided or local body schools whose parents' income is not more than ₹3,50,000 a year and who scored at least 55% in Class 7 (50% for SC/ST). [View →](/search?q=National%20Means-cum-Merit%20Scholarship)\n\n[Browse all education schemes →](/search?topic=education)`,
  'eligibility': `I can help you check your eligibility! Here's how:\n\n1. **Use our Eligibility Checker** — [Click here →](/eligibility)\n2. Answer 3 short steps: your age, gender, state, occupation, income, social category, and whether you live in a rural or urban area\n3. Get a list of schemes that match`,
  'documents': `**Common documents required for most government schemes:**\n\n- Aadhaar Card (mandatory for most)\n- Bank Account linked to Aadhaar\n- Income Certificate (from Tehsildar/SDM)\n- Caste Certificate (if applicable)\n- Age Proof (Birth Certificate or Class 10 Marksheet)\n- Address Proof\n\nThe exact documents vary by scheme. Check the scheme's detail page for the complete list.`,
  'default': `I'm **SetuAI**. I have ready-made answers about a few common schemes. I am not a live assistant, so please confirm details on the official portal.\n\nI can help you:\n- **Find schemes** you're eligible for\n- **Understand documents** required for applications\n- **Answer questions** about any specific scheme\n\nTry asking me: *"What is PM Kisan?"* or *"How do I check my eligibility?"*`
};

function buildDefaultConversations(): ChatConversation[] {
  return [{
    id: 'welcome',
    title: 'Introduction to SetuAI',
    messages: [
      {
        id: 'init-msg',
        sender: 'ai',
        text: `Hello! This is **SetuAI**: quick answers about common schemes. It is not a live assistant, so please confirm details on the official portal.`,
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
