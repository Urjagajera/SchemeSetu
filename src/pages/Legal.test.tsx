import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';

const mocks = vi.hoisted(() => ({ language: 'en' as 'en' | 'hi' | 'gu' }));
vi.mock('../contexts/LanguageContext', async () => {
  const { TRANSLATIONS } = await import('../constants/translations');
  const dict = TRANSLATIONS as unknown as Record<string, Record<string, string>>;
  return { useTranslation: () => ({ t: (key: string) => dict[mocks.language][key] || dict.en[key] || key, language: mocks.language }) };
});

import { Privacy, Terms } from './Legal';
import { TRANSLATIONS } from '../constants/translations';

const dict = TRANSLATIONS as unknown as Record<'en' | 'hi' | 'gu', Record<string, string>>;
const root = path.join(__dirname, '..', '..');
const read = (...p: string[]) => fs.readFileSync(path.join(root, ...p), 'utf8');
beforeEach(() => { mocks.language = 'en'; });

const page = (C: React.FC) => render(<MemoryRouter><C /></MemoryRouter>).container;

describe.each(['en', 'hi', 'gu'] as const)('Privacy and Terms pages in %s', (lang) => {
  beforeEach(() => { mocks.language = lang; });
  const d = dict[lang];

  it('Privacy shows every section heading and paragraph, in the language', () => {
    const container = page(Privacy);
    const text = container.textContent ?? '';
    const keys = Object.keys(dict.en).filter((k) => /^pv/.test(k));
    expect(keys.length).toBeGreaterThanOrEqual(20);
    for (const k of keys) expect(text, k).toContain(d[k]);
    expect(container.querySelector('h1')?.textContent).toBe(d.lgPrivacy);
  });

  it('Terms shows every section heading and paragraph, in the language', () => {
    const text = page(Terms).textContent ?? '';
    const keys = Object.keys(dict.en).filter((k) => /^tm/.test(k));
    expect(keys.length).toBeGreaterThanOrEqual(16);
    for (const k of keys) expect(text, k).toContain(d[k]);
  });

  it('each links to the other', () => {
    expect(page(Privacy).querySelector('a')?.getAttribute('href')).toBe('/terms');
    expect(page(Terms).querySelector('a')?.getAttribute('href')).toBe('/privacy');
  });
});

describe('the legal text says only what the code does', () => {
  const en = dict.en;
  const all = Object.entries(en).filter(([k]) => /^(pv|tm)/.test(k)).map(([, v]) => v).join(' ');

  it('invents no contact details, company or address', () => {
    expect(all).not.toMatch(/@|\bhttps?:|\+?\d[\d\s-]{8,}|Pvt|Ltd|LLP|registered office|toll/i);
  });

  it('says it is not a government website, in both documents, and that no password is stored', () => {
    expect(en.pvWho).toMatch(/not a government website/);
    expect(en.tmWhat).toMatch(/not a government website/);
    expect(en.pvSignIn).toMatch(/never see or store your Google password/);
  });

  it('the session cookie text matches the code (7 days, httpOnly)', () => {
    const auth = read('backend', 'src', 'utils', 'sessionCookie.ts');
    expect(auth).toMatch(/SESSION_MAX_AGE_MS = 7 \* 24 \* 60 \* 60 \* 1000/);
    expect(auth).toMatch(/httpOnly: true/);
    expect(en.pvCookie).toMatch(/up to 7 days/);
  });

  it('what is said to reach Groq matches the code: scheme text, chat messages and eligibility answers, never who you are', () => {
    // Translation sends scheme text only.
    const translation = path.join(root, 'backend', 'src', 'translation');
    for (const f of fs.readdirSync(translation).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      expect(fs.readFileSync(path.join(translation, f), 'utf8'), f).not.toMatch(/prisma\.(user|profile|bookmark)|requireAuth|googleId|profilePictureUrl/);
    }
    // SetuAI reads the profile in one place, and only through the eligibility-only list; never the User row.
    const chat = path.join(root, 'backend', 'src', 'chat');
    const chatFiles = fs.readdirSync(chat).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    for (const f of chatFiles) {
      const src = fs.readFileSync(path.join(chat, f), 'utf8');
      expect(src, f).not.toMatch(/prisma\.(user|bookmark|documentChecklist)|googleId|profilePictureUrl|\.email\b/);
      if (f !== 'loadChatProfile.ts') expect(src, f).not.toMatch(/prisma\.profile/);
    }
    const loader = read('backend', 'src', 'chat', 'loadChatProfile.ts');
    expect(loader).toMatch(/return profileForChat\(await prisma\.profile\.findUnique/);
    const fields = read('backend', 'src', 'chat', 'profileForChat.ts');
    const list = fields.slice(fields.indexOf('CHAT_PROFILE_FIELDS = ['), fields.indexOf('] as const'));
    expect(list).not.toMatch(/name|email|district|dob|google|picture|phone|address/i);

    expect(en.pvThird).toContain("the messages you type to SetuAI");
    expect(en.pvThird).toContain('never send Groq your name, email, district or date of birth');
    expect(en.pvGuest).toContain('from there to Groq to write an answer');
  });

  it('what is said about searches and voice matches the code', () => {
    // Search sends Groq the search text only, and only when it is Hindi or Gujarati.
    const translateQuery = read('backend', 'src', 'search', 'translateQuery.ts');
    expect(translateQuery).not.toMatch(/prisma|req\.|cookie|profile/i);
    expect(read('backend', 'src', 'routes', 'schemes.ts')).toMatch(/needsTranslation\(text\) \? await translateQuery\(text\) : null/);
    expect(en.pvThird).toContain('any search written or spoken in Hindi or Gujarati');

    // Voice uses the browser's speech-to-text: the page never records audio itself, so no recording can reach us.
    const voiceFiles = [read('src', 'hooks', 'useVoiceInput.ts'), read('src', 'components', 'VoiceButton.tsx')];
    for (const src of voiceFiles) expect(src).not.toMatch(/getUserMedia|MediaRecorder|fetch\(|axios|api\./);
    expect(en.pvVoice).toContain("your browser's own speech-to-text");
    expect(en.pvVoice).toContain('SchemeSetu never receives or saves the recording');
  });

  it('the "deleting your data" paragraph is true: the routes and the Settings buttons exist, and only for the signed-in user', () => {
    const account = read('backend', 'src', 'routes', 'account.ts');
    expect(account).toMatch(/router\.use\(requireAuth\)/);
    expect(account).toMatch(/router\.delete\(\s*'\/'/);
    expect(account).toMatch(/router\.get\(\s*'\/export'/);
    expect(account).toMatch(/bookmark\.deleteMany[\s\S]*documentChecklist\.deleteMany[\s\S]*profile\.deleteMany[\s\S]*user\.deleteMany/); // all four, in one transaction
    expect(read('backend', 'src', 'app.ts')).toContain("app.use('/api/account', accountRouter)");
    const settings = read('src', 'pages', 'Settings.tsx');
    expect(settings).toContain('deleteMyAccount');
    expect(settings).toContain('downloadMyData');
    expect(en.pvDelete).toMatch(/download a copy of your data and delete your account from Settings/);
    expect(en.pvDelete).toContain('removes your account, profile, bookmarks and document checklists from our database');
    expect(en.pvDelete).not.toMatch(/no button|not yet available/i);
    // the only other delete route is "remove one bookmark"
    const others = ['auth', 'profile', 'bookmarks'].map((f) => read('backend', 'src', 'routes', f + '.ts')).join('\n');
    expect([...others.matchAll(/router\.delete\(\s*'([^']*)'/g)].map((m) => m[1])).toEqual(['/:schemeId']);
  });

  it('the data it lists as collected is what the database holds, and nothing more', () => {
    const schema = read('backend', 'prisma', 'schema.prisma');
    for (const field of ['googleId', 'email', 'name', 'profilePictureUrl', 'age', 'dob', 'gender', 'occupation', 'education', 'income', 'category', 'state', 'district', 'residence', 'minority', 'disability', 'farmer', 'widow', 'veteran', 'land', 'profileTags', 'documentsHeld', 'model DocumentChecklist']) {
      expect(schema, field).toContain(field);
    }
    const userAndProfile = schema.slice(schema.indexOf('model User'), schema.indexOf('model Scheme {')) + schema.slice(schema.indexOf('model Profile'), schema.indexOf('model Bookmark'));
    expect(userAndProfile).not.toMatch(/phone|mobile|aadhaar|address|pan\b/i);
    expect(en.pvStored).toContain('document checklists');
    expect(en.pvStored).toContain('never their numbers or copies');
  });

  it('the pages exist as routes and are linked from the footer and the sign-in page', () => {
    const routes = read('src', 'routes', 'AppRoutes.tsx');
    expect(routes).toContain('path="/privacy"');
    expect(routes).toContain('path="/terms"');
    expect(read('src', 'components', 'Footer.tsx')).toMatch(/to="\/privacy"[\s\S]*to="\/terms"/);
    expect(read('src', 'pages', 'Login.tsx')).toMatch(/to="\/privacy"[\s\S]*to="\/terms"/);
  });
});
