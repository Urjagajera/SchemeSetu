import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Moon, 
  Sun, 
  Trash2, 
  LogOut,
  Laptop
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

export const Settings: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const handleReset = () => {
    if (window.confirm('Reset local app preferences and search filters?')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto w-full space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b dark:border-zinc-800">
        <SettingsIcon className="w-6 h-6 text-secondary dark:text-sky-400" />
        <h1 className="font-display text-2xl font-extrabold text-primary dark:text-white">
          {t('settings')}
        </h1>
      </div>

      {/* Sections */}
      <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl divide-y divide-outline-variant dark:divide-zinc-800 shadow-sm transition-colors">
        
        {/* Language Selection */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-primary dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-secondary dark:text-sky-400" />
              Language Support
            </h3>
            <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">
              Choose the primary language for viewing the welfare catalog.
            </p>
          </div>
          <div className="flex bg-surface-container-low dark:bg-zinc-950 p-1 rounded-lg select-none border dark:border-zinc-800">
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-md focus:outline-none transition-colors",
                language === 'en'
                  ? "bg-white dark:bg-zinc-800 text-secondary dark:text-sky-400 shadow-sm"
                  : "text-on-surface-variant dark:text-zinc-550"
              )}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-md focus:outline-none transition-colors",
                language === 'hi'
                  ? "bg-white dark:bg-zinc-800 text-secondary dark:text-sky-400 shadow-sm"
                  : "text-on-surface-variant dark:text-zinc-550"
              )}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setLanguage('gu')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-md focus:outline-none transition-colors",
                language === 'gu'
                  ? "bg-white dark:bg-zinc-800 text-secondary dark:text-sky-400 shadow-sm"
                  : "text-on-surface-variant dark:text-zinc-550"
              )}
            >
              ગુજરાતી
            </button>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-primary dark:text-white flex items-center gap-2">
              {theme === 'light' ? <Sun className="w-4 h-4 text-secondary dark:text-sky-400" /> : <Moon className="w-4 h-4 text-secondary" />}
              Appearance Mode
            </h3>
            <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">
              Toggle light or dark modes depending on your preference.
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors focus:outline-none"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4 text-secondary" />
                Dark Mode
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-yellow-400" />
                Light Mode
              </>
            )}
          </button>
        </div>

        {/* Dev Reset Preferences */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-primary dark:text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Reset App Data
            </h3>
            <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">
              Clear saved bookmarks, mock chat logs, and profile variables.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-red-200 text-red-600 dark:border-red-900/30 dark:text-red-400 bg-red-50 dark:bg-red-950/15 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors focus:outline-none"
          >
            Clear Cache
          </button>
        </div>

        {/* Log Out */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-primary dark:text-white flex items-center gap-2">
              <LogOut className="w-4 h-4 text-zinc-550" />
              Sign Out Account
            </h3>
            <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">
              Sign out from Google OAuth session and clear active JWT token.
            </p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold active:scale-95 transition-all shadow-sm focus:outline-none"
          >
            {t('logout')}
          </button>
        </div>

      </div>
    </motion.div>
  );
};

export default Settings;
