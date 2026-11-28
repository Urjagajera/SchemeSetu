/**
 * A token budget for batch scripts. Groq's free tier allows 200,000 tokens a day per model, shared by the batch
 * scripts and the live site, so a batch run stops starting new work once it has used its share.
 *
 * Work already started when the budget runs out is allowed to finish (stopping in the middle would waste the
 * tokens already spent), so a run can go over by at most one batch per worker.
 */
export interface TokenBudget {
  /** Records the tokens one model call used. */
  add(tokens: number): void;
  /** Tokens used so far. */
  used(): number;
  /** True once the budget is spent, or Groq's own daily limit was hit: start no new work. */
  exhausted(): boolean;
  /** Stops the run early (Groq said its daily limit is reached, so more calls would only fail). */
  stop(): void;
}

export function createTokenBudget(maxTokens: number): TokenBudget {
  let used = 0;
  let stopped = false;
  return {
    add: (tokens) => {
      if (Number.isFinite(tokens) && tokens > 0) used += tokens;
    },
    used: () => used,
    exhausted: () => stopped || used >= maxTokens,
    stop: () => {
      stopped = true;
    },
  };
}

/** True for Groq's "Rate limit reached ... on tokens per day (TPD)" error, as opposed to the per-minute limit it waits out. */
export function isDailyLimitError(message: string): boolean {
  return /tokens per day|\bTPD\b/i.test(message);
}
