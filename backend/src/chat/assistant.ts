import type { Llm } from '../translation/llm.js';
import type { ChatProfile } from './profileForChat.js';
import type { ChatScheme } from './findSchemes.js';

export type ChatLanguage = 'en' | 'hi' | 'gu';

export interface ChatTurn {
  sender: 'user' | 'ai';
  text: string;
}

export interface AskInput {
  question: string;
  /** Earlier turns of this conversation, oldest first (already trimmed by the route). */
  history: ChatTurn[];
  language: ChatLanguage;
  /** Eligibility answers of a signed-in person (never name or email); null for guests. */
  profile: ChatProfile | null;
}

export interface AssistantDeps {
  /** Null when there is no Groq key: then every answer is the search fallback. */
  llm: Llm | null;
  model: string;
  findSchemes: (keywords: string[], profile: ChatProfile | null) => Promise<ChatScheme[]>;
}

export interface AskResult {
  text: string;
  /** "ai" when Groq wrote the answer; "fallback" when it could not and the reply only lists search results. */
  source: 'ai' | 'fallback';
}

const LANGUAGE_NAMES: Record<ChatLanguage, string> = { en: 'English', hi: 'Hindi', gu: 'Gujarati' };

const STOPWORDS = new Set(
  'what which who whom whose when where why how is are was were be been am do does did can could should would will shall may might the a an and or of for to in on at by with from about me my i we our you your it its this that these those there their them they any some all scheme schemes yojana please tell know give get need want find show list'.split(' '),
);

/** Search words straight from the question, for when Groq cannot suggest better ones. \p{M} keeps the vowel signs of
 * Hindi and Gujarati words (ा, િ...), which are marks, not letters. */
export function plainKeywords(question: string): string[] {
  return [...new Set(question.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s-]/gu, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w)))].slice(0, 6);
}

/** Search words from the profile alone, for a question like "what can I get?" that names no topic. */
export function profileKeywords(profile: ChatProfile): string[] {
  const words: string[] = [];
  if (profile.widow === 'yes') words.push('widow');
  if (Number(profile.age) >= 60) words.push('old age', 'pension');
  if (profile.farmer === 'yes' || profile.occupation === 'farmer') words.push('farmer');
  if (profile.disability === 'yes') words.push('disability');
  if (profile.veteran === 'yes') words.push('ex-servicemen');
  if (profile.occupation === 'student') words.push('scholarship');
  if (profile.occupation && !['student', 'farmer', 'unemployed', 'other'].includes(profile.occupation)) words.push(profile.occupation);
  if (profile.category === 'sc') words.push('scheduled caste');
  if (profile.category === 'st') words.push('scheduled tribe');
  if (profile.gender === 'female') words.push('women');
  return words.slice(0, 8);
}

const FALLBACK_TEXT: Record<ChatLanguage, { found: string; none: string }> = {
  en: {
    found: "SetuAI can't write an answer right now. These schemes match your question:",
    none: "SetuAI can't write an answer right now, and no scheme matched your question. Try [Search](/search) or the [Eligibility checker](/eligibility).",
  },
  hi: {
    found: 'SetuAI अभी उत्तर नहीं लिख सकता। ये योजनाएँ आपके प्रश्न से मेल खाती हैं:',
    none: 'SetuAI अभी उत्तर नहीं लिख सकता, और कोई योजना आपके प्रश्न से मेल नहीं खाई। [खोज](/search) या [पात्रता जाँच](/eligibility) आज़माएँ।',
  },
  gu: {
    found: 'SetuAI હમણાં જવાબ લખી શકતું નથી. આ યોજનાઓ તમારા પ્રશ્ન સાથે મેળ ખાય છે:',
    none: 'SetuAI હમણાં જવાબ લખી શકતું નથી, અને કોઈ યોજના તમારા પ્રશ્ન સાથે મેળ ખાતી નથી. [શોધ](/search) અથવા [પાત્રતા તપાસ](/eligibility) અજમાવો.',
  },
};

function fallback(language: ChatLanguage, schemes: ChatScheme[]): AskResult {
  const t = FALLBACK_TEXT[language];
  if (schemes.length === 0) return { text: t.none, source: 'fallback' };
  return { text: [t.found, '', ...schemes.map((s) => `- [${s.name}](/schemes/${s.id})`)].join('\n'), source: 'fallback' };
}

const transcript = (history: ChatTurn[]) => history.map((h) => `${h.sender === 'user' ? 'User' : 'SetuAI'}: ${h.text}`).join('\n');

const KEYWORDS_SYSTEM = `You turn a citizen's question about Indian government welfare schemes into English search words.
The question may be in English, Hindi, Gujarati or a mix. Use the conversation so far to resolve words like "it" or "that scheme".
Write well-known short names out in full as well, the way official titles spell them (PM-KISAN: "Pradhan Mantri Kisan Samman Nidhi"; PMAY: "Pradhan Mantri Awas Yojana").
Never make up a scheme name: use a scheme's name only if the question names that scheme. Otherwise use plain topic words.
If the question names an Indian state, include that state's English name as one of the words (गुजरात: "Gujarat").
Write caste and tribe groups out in full ("SC": "scheduled caste"; "ST": "scheduled tribe").
Name the specific thing asked about, plus the words official scheme titles use for it (farm machinery: "tractor", "mechanization", "equipment", "power tiller"; a house: "housing", "awas"; studies: "scholarship", "education").
If a PROFILE is given and the question asks what the person can get, choose words from it (a widow: "widow"; 60 or older: "old age", "pension"; a farmer: "farmer"; a disability: "disability"; a student: "scholarship").
Reply with JSON only: {"keywords": ["..."]}: 1 to 8 English words or names that would appear in a scheme's title, tags or description. No generic words like "scheme" or "government".`;

function answerSystem(language: ChatLanguage): string {
  return `You are SetuAI, the assistant of SchemeSetu, a website that helps people in India find government welfare schemes. SchemeSetu is not a government website.
Rules:
- Answer only from the SCHEMES given below. Never add schemes, amounts, dates, eligibility rules or documents that are not in them. If they do not answer the question, say so plainly and suggest SchemeSetu's [Search](/search) or [Eligibility checker](/eligibility).
- When you mention a scheme, link it exactly as [Scheme name](/schemes/ID) with its ID from the list. Never write any other link.
- If a PROFILE is given, use it to say which schemes seem to fit the person and what they would still need to check. Never ask for or repeat names, phone numbers, Aadhaar or bank numbers.
- Reply in ${LANGUAGE_NAMES[language]}, in short paragraphs or a short list (under 180 words). Scheme names may stay as they are written.
- Remind the person to confirm details on the official portal when they are about to apply.`;
}

function answerUser(input: AskInput, schemes: ChatScheme[]): string {
  const parts = [];
  if (input.history.length > 0) parts.push(`CONVERSATION SO FAR:\n${transcript(input.history)}`);
  if (input.profile) parts.push(`PROFILE (answers the person saved; no name or contact details):\n${JSON.stringify(input.profile)}`);
  parts.push(`SCHEMES:\n${schemes.length > 0 ? JSON.stringify(schemes) : '(none found)'}`);
  parts.push(`QUESTION:\n${input.question}`);
  return parts.join('\n\n');
}

/** Keeps only the links the answer may contain: to schemes it was given, to Search and to the Eligibility checker. */
export function keepKnownLinks(text: string, schemes: ChatScheme[]): string {
  const ids = new Set(schemes.map((s) => s.id));
  return text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, href: string) => {
    const scheme = /^\/schemes\/([^/?#]+)$/.exec(href);
    if ((scheme && ids.has(scheme[1])) || href === '/search' || href === '/eligibility') return whole;
    return label;
  });
}

/**
 * Answers a question from the scheme data: Groq turns it into search words, the schemes those find (fitted to the
 * profile when there is one) are handed back to Groq with strict rules, and the answer keeps only links to them.
 * When Groq is missing, out of quota or failing, the reply lists the matching schemes instead of inventing anything.
 */
export async function answerQuestion(input: AskInput, deps: AssistantDeps): Promise<AskResult> {
  let keywords = plainKeywords(input.question);
  if (deps.llm) {
    try {
      const out = await deps.llm({
        model: deps.model,
        system: KEYWORDS_SYSTEM,
        user: [
          input.history.length > 0 ? `CONVERSATION SO FAR:\n${transcript(input.history.slice(-4))}` : '',
          input.profile ? `PROFILE:\n${JSON.stringify(input.profile)}` : '',
          `QUESTION: ${input.question}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
        json: true,
        // gpt-oss models spend part of this on reasoning before the answer, so it is well above the JSON's size.
        maxTokens: 800,
        effort: 'low',
      });
      const parsed = JSON.parse(out.text) as { keywords?: unknown };
      const suggested = Array.isArray(parsed.keywords) ? parsed.keywords.filter((k): k is string => typeof k === 'string') : [];
      if (suggested.length > 0) keywords = suggested;
    } catch {
      // keep the plain words
    }
  }

  // A question that names no topic ("which schemes can I get?") is about the person: search with their profile.
  const aboutThePerson = input.profile !== null && plainKeywords(input.question).length === 0;
  let schemes = await deps.findSchemes(aboutThePerson ? profileKeywords(input.profile!) : keywords, input.profile);
  if (schemes.length === 0 && input.profile && !aboutThePerson) schemes = await deps.findSchemes(profileKeywords(input.profile), input.profile);
  if (!deps.llm) return fallback(input.language, schemes);

  try {
    const out = await deps.llm({
      model: deps.model,
      system: answerSystem(input.language),
      user: answerUser(input, schemes),
      json: false,
      maxTokens: 2500, // room for the model's reasoning as well as the answer
      effort: 'low',
    });
    let text = keepKnownLinks(out.text, schemes).trim();
    if (!text || out.finishReason === 'length') return fallback(input.language, schemes);
    // An answer that names schemes without linking any still gets one link for each scheme it names.
    if (!text.includes('](/schemes/')) {
      const named = schemes.filter((s) => text.includes(s.name));
      if (named.length > 0) text += `\n\n${named.map((s) => `- [${s.name}](/schemes/${s.id})`).join('\n')}`;
    }
    return { text, source: 'ai' };
  } catch {
    return fallback(input.language, schemes);
  }
}
