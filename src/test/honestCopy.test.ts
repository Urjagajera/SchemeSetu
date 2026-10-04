import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Things the site must not claim. Each of these was in the interface once and was false or made up
// (see docs/honest-copy.md). If one comes back, this fails.
const BANNED: Array<[string, RegExp]> = [
  ['a storage provider we do not use', /supabase/i],
  ['an invented support email', /support@schemesetu/i],
  ['an invented toll-free number', /1800-123-4567/],
  ['"mock" as a description of the service', /mock discovery/i],
  ['affiliation with the government', /Government of India\. All rights|Government of India security/i],
  ['an invented user count', /98,000/],
  ['invented beneficiary and disbursement figures', /9\.8 ?Cr|2\.4L ?Cr/],
  ['a hardcoded scheme count', /\b(4500|500)\+/],
  ['a daily-update promise', /Updated Daily|updates scheme information daily/i],
  ['a made-up news item', /17th Installment|deadline extended to July/i],
  ['an "intelligent" assistant that is canned replies', /intelligent government schemes guide|your government scheme assistant/i],
  ['a fake subscription confirmation', /You have been subscribed/i],
  ['a "verified" account badge', /Verified Citizen Account/],
];

function files(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      files(p, out);
    } else if (/\.(tsx?|json)$/.test(e.name) && !/\.test\./.test(e.name) && !/mockSchemes/.test(e.name)) out.push(p);
  }
  return out;
}

const root = path.join(__dirname, '..', '..');
const scanned = [...files(path.join(root, 'src')), ...files(path.join(root, 'locales')), path.join(root, 'backend', 'src', 'routes', 'chat.ts')];

describe('the interface does not make false or invented claims', () => {
  it('scans the real files', () => {
    expect(scanned.length).toBeGreaterThan(80);
    expect(scanned.some((f) => f.endsWith('hi.json'))).toBe(true);
    expect(scanned.some((f) => f.endsWith('Footer.tsx'))).toBe(true);
  });

  it.each(BANNED)('nothing says: %s', (_what, pattern) => {
    const hits = scanned.filter((f) => pattern.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f));
    expect(hits).toEqual([]);
  });

  it('no link goes nowhere (href="#")', () => {
    const hits = scanned.filter((f) => /href="#"/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f));
    expect(hits).toEqual([]);
  });

  it('no link points at a privacy or terms page that does not exist', () => {
    const hits = scanned.filter((f) => /['"`]\/(privacy|terms)['"`]/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(root, f));
    expect(hits).toEqual([]);
  });
});
