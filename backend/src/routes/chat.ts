import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * Ported verbatim from the client-side fallback dictionary in chatService.ts.
 * Real LLM integration (Groq) is a separate, later task — see task instructions.
 */
const MOCK_RESPONSES: Record<string, string> = {
  'pm kisan': `**PM Kisan Samman Nidhi** provides ₹6,000/year to farmer families in 3 installments of ₹2,000 each.\n\n**Eligibility:** Land-owning farmers with income below ₹2L/year.\n\n**Documents needed:**\n- Aadhaar Card\n- Land Records (Khasra/Khatauni)\n- Bank Account linked to Aadhaar\n\n[View Full Details →](/schemes/pm-kisan)`,
  ayushman: `**Ayushman Bharat PM-JAY** offers ₹5 Lakh annual health cover per family for hospital treatment.\n\n**Who qualifies:** BPL/SECC-listed families. Covers pre-existing conditions from Day 1.\n\n**No premium required** — it's fully government-funded.\n\n[View Full Details →](/schemes/ayushman-bharat)`,
  scholarship: `SchemeSetu has several scholarship schemes:\n\n1. **Post-Matric Scholarship for SC Students** — for SC students with income < ₹2.5L\n2. **NMMSS** — for meritorious Class IX-XII students from economically weaker sections\n\nWould you like details on any specific scholarship? [Browse all education schemes →](/search?category=Education)`,
  eligibility: `I can help you check your eligibility! Here's how:\n\n1. **Use our Eligibility Checker** — [Click here →](/eligibility)\n2. Answer 3 simple steps about your age, income, and occupation\n3. Get a personalized list of matching schemes\n\nOr tell me more about yourself (age, state, occupation) and I can give you a quick estimate!`,
  documents: `**Common documents required for most government schemes:**\n\n- Aadhaar Card (mandatory for most)\n- Bank Account linked to Aadhaar\n- Income Certificate (from Tehsildar/SDM)\n- Caste Certificate (if applicable)\n- Age Proof (Birth Certificate or Class 10 Marksheet)\n- Address Proof\n\nThe exact documents vary by scheme. Check the scheme's detail page for the complete list.`,
  default: `I'm **SetuAI**, your government scheme assistant!\n\nI can help you:\n- **Find schemes** you're eligible for\n- **Understand documents** required for applications\n- **Answer questions** about any specific scheme\n\nTry asking me: *"What is PM Kisan?"* or *"How do I check my eligibility?"*`,
};

function matchReply(text: string): string {
  const q = text.toLowerCase();
  if (q.includes('pm kisan') || q.includes('kisan') || q.includes('farmer')) return MOCK_RESPONSES['pm kisan'];
  if (q.includes('ayushman') || q.includes('health') || q.includes('pmjay')) return MOCK_RESPONSES.ayushman;
  if (q.includes('scholarship') || q.includes('education') || q.includes('student')) return MOCK_RESPONSES.scholarship;
  if (q.includes('eligib') || q.includes('qualify') || q.includes('check')) return MOCK_RESPONSES.eligibility;
  if (q.includes('document') || q.includes('aadhaar') || q.includes('certificate')) return MOCK_RESPONSES.documents;
  return MOCK_RESPONSES.default;
}

/**
 * POST /api/chat/message
 * Matches chatService.sendMessage()'s actual call (axios.post(`${API_URL}/message`, ...)).
 * conversationId is accepted but unused — there is no server-side conversation
 * persistence in this pass (chatService.getConversations()/saveConversations() still
 * fall back to localStorage; GET/PUT /api/chat were not in scope for this task).
 */
router.post(
  '/message',
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body as { text?: string; conversationId?: string };

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: { message: 'text is required', status: 400 } });
      return;
    }

    res.json({
      id: Math.random().toString(36).substring(7),
      sender: 'ai',
      text: matchReply(text),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }),
);

export default router;
