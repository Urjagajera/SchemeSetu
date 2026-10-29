import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('../contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { ShareButton } from './ShareButton';

const NAME = 'प्रधानमंत्री किसान योजना';
const URL_ = `${window.location.origin}/schemes/abc`;

/** A phone (coarse pointer) or a computer, with or without the Web Share API. */
function device({ touch, share }: { touch: boolean; share?: ReturnType<typeof vi.fn> }) {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
  window.matchMedia = vi.fn((query: string) => ({ matches: touch && query === '(pointer: coarse)' })) as unknown as typeof window.matchMedia;
}

const renderButton = () => render(<ShareButton schemeId="abc" schemeName={NAME} />);
const shareButton = () => screen.getByTitle('shareScheme');
const click = (el: Element) => act(async () => { fireEvent.click(el); });

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
});
afterEach(() => vi.useRealTimers());

describe('ShareButton on a phone', () => {
  it('opens the system share sheet with the scheme name and its public link, and no menu', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    device({ touch: true, share });
    renderButton();
    await click(shareButton());
    expect(share).toHaveBeenCalledWith({ title: NAME, text: `${NAME} — SchemeSetu`, url: URL_ });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('does nothing more when the person closes the share sheet', async () => {
    device({ touch: true, share: vi.fn().mockRejectedValue(Object.assign(new Error('closed'), { name: 'AbortError' })) });
    renderButton();
    await click(shareButton());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('falls back to the menu when the share sheet fails for another reason', async () => {
    device({ touch: true, share: vi.fn().mockRejectedValue(Object.assign(new Error('nope'), { name: 'NotAllowedError' })) });
    renderButton();
    await click(shareButton());
    expect(screen.getByRole('menu')).not.toBeNull();
  });
});

describe('ShareButton on a computer', () => {
  it('shows a WhatsApp and Copy link menu, even where the browser has a share API', async () => {
    const share = vi.fn();
    device({ touch: false, share });
    renderButton();
    expect(shareButton().getAttribute('aria-expanded')).toBe('false');
    await click(shareButton());
    expect(share).not.toHaveBeenCalled();
    expect(shareButton().getAttribute('aria-expanded')).toBe('true');
    const whatsapp = screen.getByRole('menuitem', { name: 'shareWhatsApp' });
    expect(whatsapp.getAttribute('href')).toBe(`https://wa.me/?text=${encodeURIComponent(`${NAME} — SchemeSetu ${URL_}`)}`);
    expect(whatsapp.getAttribute('target')).toBe('_blank');
    expect(whatsapp.getAttribute('rel')).toContain('noopener');
  });

  it('copies the public link and says so for two seconds', async () => {
    vi.useFakeTimers();
    device({ touch: false });
    renderButton();
    await click(shareButton());
    await click(screen.getByRole('menuitem', { name: 'copyLink' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(URL_);
    expect(screen.getByText('linkCopied')).not.toBeNull();
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByText('linkCopied')).toBeNull();
    expect(screen.getByText('copyLink')).not.toBeNull();
  });

  it('does not claim the link was copied when the clipboard is unavailable', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('denied'));
    device({ touch: false });
    renderButton();
    await click(shareButton());
    await click(screen.getByRole('menuitem', { name: 'copyLink' }));
    expect(screen.queryByText('linkCopied')).toBeNull();
  });

  it('closes the menu on Escape, on a click outside, and on a second click of the button', async () => {
    device({ touch: false });
    renderButton();
    await click(shareButton());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();

    await click(shareButton());
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();

    await click(shareButton());
    await click(shareButton());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('stays open for a click inside the menu', async () => {
    device({ touch: false });
    renderButton();
    await click(shareButton());
    fireEvent.mouseDown(screen.getByRole('menu'));
    expect(screen.getByRole('menu')).not.toBeNull();
  });
});
