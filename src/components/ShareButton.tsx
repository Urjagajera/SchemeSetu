import React, { useEffect, useRef, useState } from 'react';
import { Share2, MessageCircle, Copy, Check } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { cn } from '../utils/cn';

interface ShareButtonProps {
  schemeId: string;
  /** The scheme's name as the page shows it (in the page's language). */
  schemeName: string;
  className?: string;
}

/** Phones get the system share sheet (WhatsApp, SMS...); elsewhere a small menu offers WhatsApp and Copy link. */
function canUseShareSheet(): boolean {
  return typeof navigator.share === 'function' && !!window.matchMedia?.('(pointer: coarse)').matches;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ schemeId, schemeName, className }) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Scheme pages are public, so this link opens for anyone it is sent to.
  const url = `${window.location.origin}/schemes/${schemeId}`;
  const text = `${schemeName} — SchemeSetu`;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !wrapperRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  const handleClick = async () => {
    if (canUseShareSheet()) {
      try {
        await navigator.share({ title: schemeName, text, url });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return; // the person closed the sheet
      }
    }
    setMenuOpen((open) => !open);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard access (e.g. an insecure page): the link is still in the address bar to copy by hand.
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={cn(
          'p-2 rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors shadow-sm focus:outline-none text-on-surface-variant bg-white',
          className,
        )}
        title={t('shareScheme')}
      >
        <Share2 className="w-5 h-5" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute z-20 top-full mt-2 left-1/2 -translate-x-1/2 w-44 bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-lg shadow-lg p-1 text-left"
        >
          <a
            role="menuitem"
            href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold text-on-surface dark:text-zinc-200 hover:bg-surface-container-low dark:hover:bg-zinc-800"
          >
            <MessageCircle className="w-4 h-4 text-green-600" />
            {t('shareWhatsApp')}
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold text-on-surface dark:text-zinc-200 hover:bg-surface-container-low dark:hover:bg-zinc-800"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            <span aria-live="polite">{copied ? t('linkCopied') : t('copyLink')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
