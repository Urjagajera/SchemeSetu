import { Groq } from 'groq-sdk';

/**
 * The only file that talks to Groq. Everything else takes an `Llm` function, so the translation logic is
 * tested with a fake one and never needs a network or a key.
 */
export interface LlmRequest {
  model: string;
  system: string;
  user: string;
  /** Ask for a JSON object back (used for lists of strings). */
  json: boolean;
  maxTokens: number;
  /** Reasoning effort, honoured by the gpt-oss models only. */
  effort?: 'low' | 'medium';
}

export interface LlmResponse {
  text: string;
  /** "stop" is a complete answer; "length" means it was cut off. */
  finishReason: string;
}

export type Llm = (req: LlmRequest) => Promise<LlmResponse>;

/** At most `max` calls in flight at once, so one busy page can't burn through the account's rate limit. */
export function createLimiter(max: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const waiting: Array<() => void> = [];
  const release = () => {
    active--;
    waiting.shift()?.();
  };
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= max) await new Promise<void>((resolve) => waiting.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      release();
    }
  };
}

export function createGroqLlm(apiKey: string, opts: { maxConcurrent?: number } = {}): Llm {
  // The SDK retries 429 and 5xx responses with backoff on its own; a long timeout covers slow reasoning calls.
  const groq = new Groq({ apiKey, maxRetries: 3, timeout: 180_000 });
  const limit = createLimiter(opts.maxConcurrent ?? 3);

  return (req) =>
    limit(async () => {
      const params: Record<string, unknown> = {
        model: req.model,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
        temperature: 0.1,
        // Without an explicit limit some models stop at 2,048 tokens, which silently truncates long text.
        max_completion_tokens: req.maxTokens,
      };
      if (req.json) params.response_format = { type: 'json_object' };
      if (req.effort && req.model.startsWith('openai/gpt-oss')) params.reasoning_effort = req.effort;

      const resp = await groq.chat.completions.create(params as never);
      const choice = resp.choices[0];
      return {
        // Some models (Qwen) put their reasoning in <think> blocks inside the content.
        text: (choice?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim(),
        finishReason: choice?.finish_reason ?? 'unknown',
      };
    });
}
