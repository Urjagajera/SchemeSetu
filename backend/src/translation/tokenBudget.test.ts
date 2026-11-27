import { describe, it, expect } from 'vitest';
import { createTokenBudget } from './tokenBudget.js';

describe('createTokenBudget', () => {
  it('adds up the tokens and is spent once the limit is reached', () => {
    const b = createTokenBudget(1000);
    b.add(400);
    expect(b.exhausted()).toBe(false);
    b.add(599);
    expect(b.used()).toBe(999);
    expect(b.exhausted()).toBe(false);
    b.add(1);
    expect(b.exhausted()).toBe(true);
  });

  it('ignores missing or nonsense counts (a response without usage reports 0)', () => {
    const b = createTokenBudget(10);
    b.add(0);
    b.add(NaN);
    b.add(-5);
    expect(b.used()).toBe(0);
  });
});
