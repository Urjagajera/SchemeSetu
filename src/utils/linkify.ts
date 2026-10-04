export type TextPart = { type: 'text'; text: string } | { type: 'link'; text: string; href: string };

/**
 * Finds web addresses in plain scheme text so they can be shown as links.
 *
 * What counts: only addresses that start with http:// or https://. A bare "www.example.com", an email, "ftp://",
 * "mailto:" and "javascript:" are all left as ordinary text. The address is whatever follows up to the next
 * space, angle bracket or quote; punctuation that belongs to the sentence around it is then taken back off the end
 * (a full stop, comma, closing bracket, the Hindi "।"), so "see https://a.gov.in/apply." links to .../apply.
 * A closing bracket is kept when the address itself opened one, as in .../wiki/Thing_(film).
 *
 * The result is a list of text and link parts that joins back to exactly the original text. Nothing here builds
 * HTML: the caller turns the parts into elements, so scheme text can never become markup.
 */
const CANDIDATE = /https?:\/\/[^\s<>"“”‘’]+/gi;
const ALWAYS_TRAILING = new Set(['.', ',', ';', ':', '!', '?', "'", '’', '”', '»', '…', '।', '॥', '>']);
const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

function count(text: string, ch: string): number {
  let n = 0;
  for (const c of text) if (c === ch) n++;
  return n;
}

function trimTrailingPunctuation(candidate: string): string {
  let url = candidate;
  for (;;) {
    const last = url.slice(-1);
    if (ALWAYS_TRAILING.has(last)) {
      url = url.slice(0, -1);
    } else if (last in CLOSERS && count(url, last) > count(url, CLOSERS[last])) {
      url = url.slice(0, -1); // a closing bracket the address never opened belongs to the sentence
    } else {
      return url;
    }
  }
}

function isWebAddress(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname !== '';
  } catch {
    return false;
  }
}

export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let cursor = 0;
  const push = (part: TextPart) => {
    const prev = parts[parts.length - 1];
    if (part.type === 'text' && prev?.type === 'text') prev.text += part.text;
    else if (part.text !== '') parts.push(part);
  };

  for (const match of text.matchAll(CANDIDATE)) {
    const start = match.index ?? 0;
    const url = trimTrailingPunctuation(match[0]);
    if (!isWebAddress(url)) continue; // left as plain text, picked up by the next text part
    push({ type: 'text', text: text.slice(cursor, start) });
    push({ type: 'link', text: url, href: url });
    cursor = start + url.length;
  }
  push({ type: 'text', text: text.slice(cursor) });
  return parts;
}
