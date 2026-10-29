import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrintSetup } from './usePrintSetup';

const root = document.documentElement;
const fire = (name: 'beforeprint' | 'afterprint') => act(() => { window.dispatchEvent(new Event(name)); });

beforeEach(() => { root.className = ''; });
afterEach(() => { vi.useRealTimers(); root.className = ''; });

describe('usePrintSetup', () => {
  it('prints in light colours from dark mode, and puts dark mode back afterwards', () => {
    root.classList.add('dark');
    renderHook(() => usePrintSetup());
    fire('beforeprint');
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.classList.contains('light')).toBe(true);
    fire('afterprint');
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.classList.contains('light')).toBe(false);
  });

  it('leaves light mode as it is', () => {
    root.classList.add('light');
    renderHook(() => usePrintSetup());
    fire('beforeprint');
    fire('afterprint');
    expect(root.className).toBe('light');
  });

  it('does not switch to dark after printing a page that was light', () => {
    root.classList.add('light');
    renderHook(() => usePrintSetup());
    fire('beforeprint');
    root.classList.replace('light', 'dark'); // something else changed the theme meanwhile; not ours to undo
    fire('afterprint');
    expect(root.className).toBe('dark');
  });

  it('gives the moment printing started, not the moment the page opened', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-20T10:00:00'));
    const { result } = renderHook(() => usePrintSetup());
    expect(result.current.toISOString()).toBe(new Date('2026-10-20T10:00:00').toISOString());
    vi.setSystemTime(new Date('2026-10-29T09:30:00'));
    fire('beforeprint');
    expect(result.current.toISOString()).toBe(new Date('2026-10-29T09:30:00').toISOString());
  });

  it('restores dark mode and stops listening if the page closes mid-print', () => {
    root.classList.add('dark');
    const { unmount } = renderHook(() => usePrintSetup());
    fire('beforeprint');
    unmount();
    expect(root.className).toBe('dark');
    fire('beforeprint');
    expect(root.className).toBe('dark');
  });
});
