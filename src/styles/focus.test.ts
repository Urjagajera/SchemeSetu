import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.resolve(__dirname, 'global.css'), 'utf8');

describe('keyboard focus outline (global.css)', () => {
  it('draws an outline for keyboard focus, in both themes', () => {
    expect(css).toMatch(/^:focus-visible:not\(\[data-own-focus\]\):not\(\[tabindex="-1"\]\) \{\s*outline: 2px solid/m);
    expect(css).toMatch(/^\.dark :focus-visible:not\(\[data-own-focus\]\):not\(\[tabindex="-1"\]\) \{\s*outline-color:/m);
  });

  it('is outside every @layer, so the many focus:outline-none utilities cannot hide it', () => {
    // Walk the file tracking brace depth: the rule must start at depth 0, not inside @layer { ... }.
    const start = css.indexOf(':focus-visible:not([data-own-focus])');
    let depth = 0;
    for (const ch of css.slice(0, start)) depth += ch === '{' ? 1 : ch === '}' ? -1 : 0;
    expect(start).toBeGreaterThan(-1);
    expect(depth).toBe(0);
  });

  it('pauses the moving category strip while one of its cards has focus', () => {
    expect(css).toMatch(/\.animate-marquee:focus-within \{\s*animation-play-state: paused;/);
  });
});
