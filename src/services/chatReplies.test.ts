import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// The canned chat replies live twice: on the backend (backend/src/routes/chat.ts) and as the frontend's offline
// copy (chatService.ts). Both are read from source here, so they can be checked against each other and the data.
function repliesIn(file: string): Record<string, string> {
  const source = fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');
  const start = source.indexOf('MOCK_RESPONSES');
  const block = source.slice(start, source.indexOf('\n};', start));
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/^\s*'?([a-z ]+)'?: `([^`]*)`,?\r?$/gm)) out[m[1]] = m[2];
  return out;
}

const backend = repliesIn('backend/src/routes/chat.ts');
const frontend = repliesIn('src/services/chatService.ts');
const linksIn = (text: string) => [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);

describe('the canned chat replies', () => {
  it('are the same on the backend and in the offline copy', () => {
    expect(Object.keys(backend).sort()).toEqual(['ayushman', 'default', 'documents', 'eligibility', 'pm kisan', 'scholarship']);
    expect(frontend).toEqual(backend);
  });

  it('link only to pages that exist: a search or the eligibility checker, never a made-up /schemes/ address', () => {
    const links = Object.values(backend).flatMap(linksIn);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toMatch(/^\/(search\?(q|topic)=[^\s]+|eligibility)$/);
  });

  it('each scheme reply links to a search for that scheme', () => {
    expect(linksIn(backend['pm kisan'])).toContain('/search?q=PM-KISAN');
    expect(linksIn(backend.ayushman)).toContain('/search?q=Pradhan%20Mantri%20Jan%20Arogya%20Yojana');
    expect(linksIn(backend.scholarship)).toEqual([
      '/search?q=Post-Matric%20Scholarship%20for%20SC%20students',
      '/search?q=National%20Means-cum-Merit%20Scholarship',
      '/search?topic=education',
    ]);
  });
});

describe('the scheme replies say what the scheme records say', () => {
  it('PM-KISAN: ₹6,000 in 3 instalments of ₹2,000, landholding families, and no income limit', () => {
    const r = backend['pm kisan'];
    expect(r).toContain('₹6,000');
    expect(r).toContain('₹2,000');
    expect(r).toMatch(/landholding farmer families/);
    expect(r).not.toMatch(/income below|₹2L/);
    expect(r).not.toMatch(/Khasra|linked to Aadhaar/);
  });

  it('Ayushman PM-JAY: ₹5,00,000 per family per year, SECC criteria, and nothing the record does not say', () => {
    const r = backend.ayushman;
    expect(r).toContain('₹5,00,000 per family per year');
    expect(r).toContain('SECC');
    expect(r).not.toMatch(/\bBPL\b|premium/i);
  });

  it('scholarships: the SC Post-Matric limit of ₹2,50,000 and the real NMMSS rules', () => {
    const r = backend.scholarship;
    expect(r).toContain('₹2,50,000');
    expect(r).toContain('₹12,000 a year');
    expect(r).toContain('₹3,50,000');
    expect(r).toContain('55% in Class 7');
    expect(r).not.toContain('₹2.5L');
  });

  it('eligibility: names everything the checker asks, and offers no estimate the canned chat cannot give', () => {
    const r = backend.eligibility;
    for (const asked of ['age', 'gender', 'state', 'occupation', 'income', 'social category', 'rural or urban']) expect(r).toContain(asked);
    expect(r).not.toMatch(/estimate/i);
  });
});
