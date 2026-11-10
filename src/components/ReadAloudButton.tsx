import React from 'react';
import { Volume2, Pause, Play, Square } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import type { ReadAloud } from '../hooks/useReadAloud';
import type { VoiceLanguage } from '../hooks/useVoiceInput';

interface Props {
  /** Which section this button reads; one section is read at a time. */
  id: string;
  text: string;
  /** The language the text on screen is in. */
  lang: VoiceLanguage;
  reader: ReadAloud;
}

const btn =
  'inline-flex items-center gap-1 px-2 py-1 rounded-md border border-outline-variant dark:border-zinc-700 text-xs font-bold text-secondary dark:text-sky-400 hover:bg-surface-container dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary';

/**
 * "Read aloud" for one section of a scheme page. With no voice for the text's language on this device (often
 * Gujarati), it says so; when the section is also available in English (or Hindi), the person can read that instead.
 */
export const ReadAloudButton: React.FC<Props> = ({ id, text, lang, reader }) => {
  const { t } = useTranslation();
  if (!reader.supported || !text.trim()) return null;
  const active = reader.readingId === id;

  if (!reader.hasVoice(lang)) {
    return (
      <span className="print:hidden text-xs font-semibold text-on-surface-variant dark:text-zinc-500" data-testid={`read-${id}-novoice`}>
        {t(lang === 'gu' ? 'raNoVoiceGu' : lang === 'hi' ? 'raNoVoiceHi' : 'raNoVoiceEn')}
      </span>
    );
  }

  if (!active) {
    return (
      <button type="button" className={`print:hidden ${btn}`} onClick={() => reader.speak(id, text, lang)} aria-label={t('raRead')}>
        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{t('raRead')}</span>
      </button>
    );
  }

  return (
    <span className="print:hidden inline-flex items-center gap-1" role="group" aria-label={t('raRead')}>
      {reader.state === 'paused' ? (
        <button type="button" className={btn} onClick={reader.resume} aria-label={t('raResume')}>
          <Play className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className={btn} onClick={reader.pause} aria-label={t('raPause')}>
          <Pause className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
      <button type="button" className={btn} onClick={reader.stop} aria-label={t('raStop')}>
        <Square className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </span>
  );
};

export default ReadAloudButton;
