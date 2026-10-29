import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const sources = (fs.readdirSync(root, { recursive: true }) as string[])
  .filter((f) => f.endsWith('.tsx') && !f.includes('.test.') && !f.includes('_archive') && !f.toLowerCase().includes('landing'));

describe('text sizes grow with the browser text-size setting', () => {
  it('no text size is fixed in pixels (text-[10px] and the like stay small when someone enlarges their text)', () => {
    const fixed = sources.flatMap((f) =>
      (fs.readFileSync(path.join(root, f), 'utf8').match(/(?<![\w-])text-\[\d+(?:\.\d+)?px\]/g) ?? []).map((m) => `${f.split(path.sep).join('/')}: ${m}`),
    );
    expect(fixed).toEqual([]);
  });

  it('the scan really reads the app (guards against it silently checking nothing)', () => {
    expect(sources.length).toBeGreaterThan(40);
    expect(sources.some((f) => f.endsWith('SchemeCard.tsx'))).toBe(true);
  });
});
