import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { cn } from '../utils/cn';
import { Sun, Moon } from 'lucide-react';

export { ThemeProvider } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-outline-variant bg-white hover:bg-surface-container-low transition-colors text-on-surface-variant focus:outline-none"
      type="button"
      aria-label={theme === 'light' ? t('shThemeDark') : t('shThemeLight')}
      title={theme === 'light' ? t('shThemeDark') : t('shThemeLight')}
    >
      {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-400" />}
    </button>
  );
};

/** "Aa": large text, simple mode on or off (also in Settings). */
export const SimpleModeToggle: React.FC = () => {
  const { simpleMode, setSimpleMode } = usePreferences();
  const { t } = useTranslation();

  return (
    <button
      onClick={() => setSimpleMode(!simpleMode)}
      className={cn(
        'px-2.5 py-1.5 rounded-lg border text-sm font-extrabold leading-none transition-colors focus:outline-none',
        simpleMode
          ? 'bg-secondary text-white border-secondary'
          : 'border-outline-variant bg-white hover:bg-surface-container-low text-on-surface-variant',
      )}
      type="button"
      aria-pressed={simpleMode}
      aria-label={t('simpleModeTitle')}
      title={t('simpleModeTitle')}
    >
      Aa
    </button>
  );
};

export default ThemeToggle;
