import React from 'react';
import { cn } from '../utils/cn';

interface Props {
  /** Name of the translated language in its own script (for example हिन्दी). */
  translatedName: string;
  showEnglish: boolean;
  onChange: (showEnglish: boolean) => void;
  label: string;
  testId: string;
}

/** "English | हिन्दी": which language one section of the scheme page is shown in. */
export const SectionLanguageToggle: React.FC<Props> = ({ translatedName, showEnglish, onChange, label, testId }) => {
  const button = (isEnglish: boolean, text: string) => {
    const active = showEnglish === isEnglish;
    return (
      <button
        type="button"
        aria-pressed={active}
        data-testid={`${testId}-${isEnglish ? 'en' : 'translated'}`}
        onClick={() => onChange(isEnglish)}
        className={cn(
          'px-2.5 py-0.5 text-[11px] font-bold transition-colors',
          active ? 'bg-secondary text-white dark:bg-sky-500' : 'bg-transparent text-on-surface-variant hover:text-secondary dark:text-zinc-400',
        )}
      >
        {text}
      </button>
    );
  };
  return (
    <div role="group" aria-label={label} data-testid={testId} className="inline-flex overflow-hidden rounded-full border border-outline-variant dark:border-zinc-700">
      {button(true, 'English')}
      {button(false, translatedName)}
    </div>
  );
};
