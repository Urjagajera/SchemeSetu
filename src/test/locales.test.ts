import { describe, it, expect } from 'vitest';
import en from '../../locales/en.json';
import hi from '../../locales/hi.json';
import gu from '../../locales/gu.json';

// The machine-translation wording must exist in every language. The Hindi and Gujarati wording is UNVERIFIED by a
// native speaker (see the Hindi quality label module).
describe('machine-translation wording in the locale files', () => {
  it.each([['en', en], ['hi', hi], ['gu', gu]] as Array<[string, Record<string, string>]>)('%s has both strings, non-empty', (_n, file) => {
    expect(file.machineTranslatedNote?.length).toBeGreaterThan(20);
    expect(file.machineTranslatedBadge?.length).toBeGreaterThan(3);
  });

  it('the Hindi and Gujarati strings are really in their own scripts, not copies of the English', () => {
    expect(hi.machineTranslatedNote).toMatch(/[ऀ-ॿ]/);
    expect(gu.machineTranslatedNote).toMatch(/[઀-૿]/);
    expect(hi.machineTranslatedBadge).toMatch(/[ऀ-ॿ]/);
    expect(gu.machineTranslatedBadge).toMatch(/[઀-૿]/);
    expect(hi.machineTranslatedNote).not.toBe(en.machineTranslatedNote);
    expect(gu.machineTranslatedBadge).not.toBe(en.machineTranslatedBadge);
  });
});

// ---- every key in every language
import fs from 'node:fs';
import path from 'node:path';

const files: Record<string, Record<string, string>> = { en, hi, gu };

describe('the three locale files stay in step', () => {
  const keysOf = (f: Record<string, string>) => Object.keys(f).sort();

  it('hi and gu have exactly the keys en has (none missing, none extra)', () => {
    for (const code of ['hi', 'gu']) {
      const missing = keysOf(en).filter((k) => !(k in files[code]));
      const extra = keysOf(files[code]).filter((k) => !(k in en));
      expect({ code, missing, extra }).toEqual({ code, missing: [], extra: [] });
    }
  });

  it('no value is empty in any language', () => {
    for (const [code, f] of Object.entries(files)) {
      const empty = Object.entries(f).filter(([, v]) => typeof v !== 'string' || v.trim() === '').map(([k]) => k);
      expect({ code, empty }).toEqual({ code, empty: [] });
    }
  });

  it('every key the code asks for with t(\'key\') exists in en.json', () => {
    const used = new Set<string>();
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) {
          for (const m of fs.readFileSync(p, 'utf8').matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'\s*\)/g)) used.add(m[1]);
        }
      }
    };
    walk(path.join(__dirname, '..'));
    const missing = [...used].filter((k) => !(k in en)).sort();
    expect(used.size).toBeGreaterThan(100);
    expect(missing).toEqual([]);
  });

  it('the profile-form and eligibility-wizard keys are written in the language, not left in English', () => {
    const own = (k: string) => /^(pf|wz|opt)/.test(k);
    for (const [code, re] of [['hi', /[ऀ-ॿ]/], ['gu', /[઀-૿]/]] as const) {
      const notNative = Object.keys(en).filter(own).filter((k) => !re.test(files[code][k]));
      expect({ code, notNative }).toEqual({ code, notNative: [] });
    }
  });

  it('a value in hi or gu keeps the numbers of its English original (limits like 2, 100, 120)', () => {
    const digits = (s: string) => (s.match(/\d+/g) || []).join(',');
    for (const k of Object.keys(en).filter((k) => /^pfErr/.test(k))) {
      for (const code of ['hi', 'gu']) expect(digits(files[code][k]), `${code}.${k}`).toBe(digits(files.en[k]));
    }
  });
});
