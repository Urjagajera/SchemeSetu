import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../contexts/LanguageContext';
import { Sun, Moon } from 'lucide-react';

export { ThemeProvider } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-outline-variant bg-white hover:bg-surface-container-low transition-colors text-on-surface-variant focus:outline-none"
      title={theme === 'light' ? t('shThemeDark') : t('shThemeLight')}
    >
      {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-400" />}
    </button>
  );
};

export default ThemeToggle;
