import { describe, it, expect } from 'vitest';
import { createTokenBudget, isDailyLimitError } from './tokenBudget.js';

describe('stopping on Groq\'s daily limit', () => {
  it('stop() ends the run even with budget left', () => {
    const b = createTokenBudget(100000);
    b.add(10);
    b.stop();
    expect(b.exhausted()).toBe(true);
  });

  it('tells the daily limit apart from the per-minute one', () => {
    expect(isDailyLimitError('429 Rate limit reached for model `openai/gpt-oss-120b` on tokens per day (TPD): Limit 200000, Used 199867')).toBe(true);
    expect(isDailyLimitError('429 Rate limit reached for model `openai/gpt-oss-120b` on tokens per minute (TPM): Limit 8000')).toBe(false);
    expect(isDailyLimitError('letters from another script inside the Gujarati text')).toBe(false);
    // The reason the translator stores is cut short; it now says "daily token limit (TPD)" before the cut.
    expect(isDailyLimitError('request failed (429 daily token limit (TPD) reached: 429 {"error":{"message":"Rate limit reached for model')).toBe(true);
  });
});

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
