import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LlmRequest } from '../translation/llm.js';
import { answerQuestion, keepKnownLinks, plainKeywords, profileKeywords, AskInput } from './assistant.js';
import type { ChatScheme } from './findSchemes.js';

const scheme = (id: string, name: string): ChatScheme => ({ id, name, authority: 'Central', description: 'd', benefits: [], eligibility: [], documents: [] });
const PMKISAN = scheme('s1', 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)');
const PENSION = scheme('s2', 'Ganga Swarupa Pension Scheme');

// A fake Groq: the first call (JSON) answers the search words, the second writes the reply.
const calls: LlmRequest[] = [];
let keywordReply: string;
let answerReply: { text: string; finishReason: string } | Error;
const llm = vi.fn(async (req: LlmRequest) => {
  calls.push(req);
  if (req.json) return { text: keywordReply, finishReason: 'stop' };
  if (answerReply instanceof Error) throw answerReply;
  return answerReply;
});
const findSchemes = vi.fn(async (_words: string[], _profile: unknown) => [PMKISAN]);
const deps = () => ({ llm, model: 'small-model', findSchemes });
const ask = (over: Partial<AskInput> = {}) =>
  answerQuestion({ question: 'What is PM Kisan?', history: [], language: 'en', profile: null, ...over }, deps());

beforeEach(() => {
  calls.length = 0;
  llm.mockClear();
  findSchemes.mockClear().mockResolvedValue([PMKISAN]);
  keywordReply = JSON.stringify({ keywords: ['Pradhan Mantri Kisan Samman Nidhi'] });
  answerReply = { text: 'It gives farmers money. [PM-KISAN](/schemes/s1)', finishReason: 'stop' };
});

describe('answerQuestion', () => {
  it('searches with the words Groq suggests, then answers from what that finds, with the small model', async () => {
    const res = await ask();
    expect(findSchemes).toHaveBeenCalledWith(['Pradhan Mantri Kisan Samman Nidhi'], null);
    expect(res).toEqual({ text: 'It gives farmers money. [PM-KISAN](/schemes/s1)', source: 'ai' });
    expect(calls.map((c) => c.model)).toEqual(['small-model', 'small-model']);
    expect(calls[1].user).toContain('"id":"s1"');
    expect(calls[1].user).toContain('QUESTION:\nWhat is PM Kisan?');
  });

  it('falls back to the question\'s own words when the search-word step returns nonsense', async () => {
    keywordReply = 'not json';
    await ask({ question: 'Tell me about widow pension' });
    expect(findSchemes.mock.calls[0][0]).toEqual(['widow', 'pension']);
  });

  it('a question that names no topic, from a signed-in person, searches with their profile', async () => {
    const profile = { age: '68', widow: 'yes', state: 'Gujarat' };
    await ask({ question: 'Which schemes can I get?', profile });
    expect(findSchemes).toHaveBeenCalledWith(['widow', 'old age', 'pension'], profile);
  });

  it('when the question finds nothing, tries the profile before giving up', async () => {
    findSchemes.mockResolvedValueOnce([]).mockResolvedValueOnce([PENSION]);
    await ask({ question: 'something rare', profile: { widow: 'yes' } });
    expect(findSchemes.mock.calls[1][0]).toEqual(['widow']);
    expect(calls[1].user).toContain('Ganga Swarupa');
  });

  it('gives Groq the profile and the conversation so far, and asks for the page language', async () => {
    await ask({
      language: 'gu',
      profile: { gender: 'female', income: '40000' },
      history: [{ sender: 'user', text: 'Tell me about PM-KISAN' }, { sender: 'ai', text: 'It helps farmers.' }],
    });
    expect(calls[1].system).toContain('Reply in Gujarati');
    expect(calls[1].user).toContain('PROFILE (answers the person saved; no name or contact details):\n{"gender":"female","income":"40000"}');
    expect(calls[1].user).toContain('User: Tell me about PM-KISAN\nSetuAI: It helps farmers.');
    expect(calls[0].user).toContain('CONVERSATION SO FAR');
  });

  it('removes any link that is not to a scheme it was given, Search or the Eligibility checker', async () => {
    answerReply = { text: 'See [PM-KISAN](/schemes/s1), [fake](/schemes/zzz), [site](https://pmkisan.gov.in) and [Search](/search).', finishReason: 'stop' };
    expect((await ask()).text).toBe('See [PM-KISAN](/schemes/s1), fake, site and [Search](/search).');
  });

  it('adds links when the answer names schemes without linking them', async () => {
    answerReply = { text: 'Try the Pradhan Mantri Kisan Samman Nidhi (PM-KISAN).', finishReason: 'stop' };
    expect((await ask()).text).toBe('Try the Pradhan Mantri Kisan Samman Nidhi (PM-KISAN).\n\n- [Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)](/schemes/s1)');
  });

  it.each([
    ['Groq fails', new Error('429 rate limit')],
    ['the answer is cut off', { text: 'Half an ans', finishReason: 'length' }],
    ['the answer is empty', { text: '   ', finishReason: 'stop' }],
  ])('when %s, lists the matching schemes instead of inventing anything', async (_case, reply) => {
    answerReply = reply as typeof answerReply;
    const res = await ask();
    expect(res.source).toBe('fallback');
    expect(res.text).toBe("SetuAI can't write an answer right now. These schemes match your question:\n\n- [Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)](/schemes/s1)");
  });

  it('without a Groq key, answers from search alone, in the page language, and says when nothing matched', async () => {
    findSchemes.mockResolvedValue([]);
    const res = await answerQuestion({ question: 'पेंशन', history: [], language: 'hi', profile: null }, { llm: null, model: 'm', findSchemes });
    expect(res.source).toBe('fallback');
    expect(res.text).toContain('SetuAI अभी उत्तर नहीं लिख सकता');
    expect(res.text).toContain('(/search)');
  });
});

describe('helpers', () => {
  it('plainKeywords drops filler words and keeps Hindi and Gujarati words', () => {
    expect(plainKeywords('What is the PM-Kisan scheme?')).toEqual(['pm-kisan']);
    expect(plainKeywords('Which schemes can I get?')).toEqual([]);
    expect(plainKeywords('विधवा पेंशन')).toEqual(['विधवा', 'पेंशन']);
    expect(plainKeywords('વિધવા પેન્શન')).toEqual(['વિધવા', 'પેન્શન']);
  });

  it('profileKeywords turns profile answers into topics', () => {
    expect(profileKeywords({ age: '61', farmer: 'yes', category: 'sc', gender: 'female' })).toEqual(['old age', 'pension', 'farmer', 'scheduled caste', 'women']);
    expect(profileKeywords({ occupation: 'student', disability: 'yes' })).toEqual(['disability', 'scholarship']);
    expect(profileKeywords({ occupation: 'entrepreneur' })).toEqual(['entrepreneur']);
  });

  it('keepKnownLinks keeps the label of a link it removes', () => {
    const out = keepKnownLinks('Open [this](javascript:alert(1)) or [that](https://example.com).', []);
    expect(out).not.toMatch(/\]\(|javascript:|https:/);
    expect(out).toContain('this');
    expect(out).toContain('that');
  });
});
