import React from 'react';
import { Mic, Square } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useVoiceInput, VoiceCallbacks } from '../hooks/useVoiceInput';
import { cn } from '../utils/cn';

interface VoiceButtonProps extends VoiceCallbacks {
  /** The button's name before it is pressed: "Search by voice" in the search bar, "Speak your question" in SetuAI. */
  labelKey: 'voiceSearch' | 'voiceAsk';
  /** Where the "Listening…" and error line goes: under the search bar, above the chat box (the disclaimer is under it). */
  messagePlacement?: 'below' | 'above';
  disabled?: boolean;
  className?: string;
}

const MESSAGE_KEY = { denied: 'voiceDenied', nothing: 'voiceNothing', failed: 'voiceFailed' } as const;

/**
 * The mic button: listens in the page's language and fills the box with what is said. Not shown at all in a browser
 * without speech-to-text (Firefox). Its parent must be `relative`, for the message line under or above it.
 */
export const VoiceButton: React.FC<VoiceButtonProps> = ({ labelKey, messagePlacement = 'below', disabled, className, onText, onDone }) => {
  const { t, language } = useTranslation();
  const voice = useVoiceInput(language, { onText, onDone });
  if (!voice.supported) return null;

  const message = voice.listening ? t('voiceListening') : voice.error ? t(MESSAGE_KEY[voice.error]) : '';

  return (
    <>
      <button
        type="button"
        onClick={voice.listening ? voice.stop : voice.start}
        disabled={disabled}
        aria-pressed={voice.listening}
        aria-label={voice.listening ? t('voiceStop') : t(labelKey)}
        title={voice.listening ? t('voiceStop') : t(labelKey)}
        className={cn(
          'p-2.5 rounded-full shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:opacity-40 disabled:pointer-events-none',
          voice.listening
            ? 'bg-red-600 text-white animate-pulse'
            : 'text-on-surface-variant dark:text-zinc-400 hover:bg-surface-container dark:hover:bg-zinc-800',
          className,
        )}
      >
        {voice.listening ? <Square className="w-4 h-4" aria-hidden="true" /> : <Mic className="w-5 h-5" aria-hidden="true" />}
      </button>
      <p
        role="status"
        data-testid="voice-message"
        className={cn(
          'absolute left-4 right-4 text-xs font-semibold',
          messagePlacement === 'below' ? 'top-full mt-2' : 'bottom-full mb-2',
          voice.error && !voice.listening ? 'text-red-700 dark:text-red-400' : 'text-on-surface-variant dark:text-zinc-400',
        )}
      >
        {message}
      </p>
    </>
  );
};

export default VoiceButton;
