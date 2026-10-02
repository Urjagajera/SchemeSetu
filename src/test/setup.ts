import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom has no layout engine, so a few browser APIs the pages call are missing. Stub only what the pages touch.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});
