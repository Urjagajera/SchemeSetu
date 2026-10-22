import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * Ported verbatim from the client-side fallback dictionary in chatService.ts.
 * Real LLM integration (Groq) is a separate, later task — see task instructions.
 */
const MOCK_RESPONSES: Record<string, string> = {
  'pm kisan': `**PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)** gives ₹6,000 a year to each eligible farmer family, in 3 equal instalments of ₹2,000 every four months.\n\n**Who qualifies:** landholding farmer families with cultivable land in their own names.\n\n**Documents needed:**\n- Aadhaar Card\n- Landholding papers\n- Savings bank account\n\n[View PM-KISAN →](/search?q=PM-KISAN)`,
  ayushman: `**Ayushman Bharat PM-JAY** gives cashless hospital cover of up to ₹5,00,000 per family per year.\n\n**Who qualifies:** in rural areas, families that meet the SECC deprivation criteria (for example SC/ST households, or landless households living mainly on manual casual labour); in urban areas, families in the listed worker categories.\n\nPre-existing diseases are covered from day one, and there is no limit on family size or age.\n\n[View Ayushman Bharat PM-JAY →](/search?q=Pradhan%20Mantri%20Jan%20Arogya%20Yojana)`,
  scholarship: `SchemeSetu lists many scholarship schemes. Two central ones:\n\n1. **Post-Matric Scholarship for SC students** — for Scheduled Caste students who have passed Class 10, whose parents' income is not more than ₹2,50,000 a year. [View →](/search?q=Post-Matric%20Scholarship%20for%20SC%20students)\n2. **National Means-cum-Merit Scholarship (NMMSS)** — ₹12,000 a year from Class 9 to 12, for students in government, government-aided or local body schools whose parents' income is not more than ₹3,50,000 a year and who scored at least 55% in Class 7 (50% for SC/ST). [View →](/search?q=National%20Means-cum-Merit%20Scholarship)\n\n[Browse all education schemes →](/search?topic=education)`,
  eligibility: `I can help you check your eligibility! Here's how:\n\n1. **Use our Eligibility Checker** — [Click here →](/eligibility)\n2. Answer 3 short steps: your age, gender, state, occupation, income, social category, and whether you live in a rural or urban area\n3. Get a list of schemes that match`,
  documents: `**Common documents required for most government schemes:**\n\n- Aadhaar Card (mandatory for most)\n- Bank Account linked to Aadhaar\n- Income Certificate (from Tehsildar/SDM)\n- Caste Certificate (if applicable)\n- Age Proof (Birth Certificate or Class 10 Marksheet)\n- Address Proof\n\nThe exact documents vary by scheme. Check the scheme's detail page for the complete list.`,
  default: `I'm **SetuAI**. I have ready-made answers about a few common schemes. I am not a live assistant, so please confirm details on the official portal.\n\nI can help you:\n- **Find schemes** you're eligible for\n- **Understand documents** required for applications\n- **Answer questions** about any specific scheme\n\nTry asking me: *"What is PM Kisan?"* or *"How do I check my eligibility?"*`,
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
