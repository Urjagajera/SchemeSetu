import React, { useState } from 'react';
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
  Laptop,
  Download,
  UserX
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';
import { accountService } from '../services/accountService';

export const Settings: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [accountError, setAccountError] = useState('');

  const handleExport = async () => {
    setAccountError('');
    setExporting(true);
    try {
      await accountService.downloadMyData();
    } catch {
      setAccountError(t('acExportFail'));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setAccountError('');
    setDeleting(true);
    try {
      await accountService.deleteMyAccount();
    } catch {
      setAccountError(t('acDeleteFail'));
      setDeleting(false);
      return;
    }
    // The account is gone: forget everything this browser kept about it and start again from the home page.
    localStorage.clear();
    sessionStorage.clear();
    await logout();
    window.location.href = '/';
  };

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
              {t('languageSupport')}
            </h3>
            <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">
              {t('choosePrimaryLang')}
            </p>
          </div>
          <div className="flex bg-surface-container-low dark:bg-zinc-950 p-1 rounded-lg select-none border dark:border-zinc-800">
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-md focus:outline-none transition-colors",
                language === 'en'
                  ? "bg-white dark:bg-zinc-800 text-secondary dark:text-sky-400 shadow-sm"
                  : "text-on-surface-variant dark:text-zinc-555"
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
                  : "text-on-surface-variant dark:text-zinc-555"
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
                  : "text-on-surface-variant dark:text-zinc-555"
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
              {t('appearanceMode')}
            </h3>
            <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">
              {t('toggleLightDark')}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors focus:outline-none"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4 text-secondary" />
                {t('darkMode')}
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-yellow-400" />
                {t('lightMode')}
              </>
            )}
          </button>
        </div>

        {/* Dev Reset Preferences */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-primary dark:text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              {t('resetAppData')}
            </h3>
            <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">
              {t('clearPreferencesDesc')}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-red-200 text-red-600 dark:border-red-900/30 dark:text-red-400 bg-red-50 dark:bg-red-950/15 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors focus:outline-none"
          >
            {t('clearCache')}
          </button>
        </div>

        {/* Your data: download a copy, or delete the account */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-primary dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-secondary dark:text-sky-400" />
              {t('acExportTitle')}
            </h3>
            <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">{t('acExportDesc')}</p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 border border-secondary text-secondary dark:border-sky-500 dark:text-sky-400 rounded-lg text-xs font-bold hover:bg-secondary/10 transition-colors focus:outline-none disabled:opacity-60"
          >
            {exporting ? t('acExportBusy') : t('acExportBtn')}
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xs md:text-sm font-bold text-primary dark:text-white flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-500" />
                {t('acDeleteTitle')}
              </h3>
              <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">{t('acDeleteDesc')}</p>
            </div>
            {!confirming && (
              <button
                type="button"
                onClick={() => { setAccountError(''); setConfirming(true); }}
                className="px-4 py-2 border border-red-200 text-red-600 dark:border-red-900/30 dark:text-red-400 bg-red-50 dark:bg-red-950/15 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors focus:outline-none"
              >
                {t('acDeleteBtn')}
              </button>
            )}
          </div>
          {confirming && (
            <div data-testid="delete-confirm" className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 p-4 space-y-3">
              <p className="text-xs text-red-800 dark:text-red-300 font-semibold">
                {t('acConfirmPrompt')} <span className="font-extrabold tracking-wider">{t('acConfirmWord')}</span>
              </p>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-label={t('acConfirmPrompt')}
                autoComplete="off"
                className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-sm py-2 px-3"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setConfirming(false); setTyped(''); }}
                  disabled={deleting}
                  className="px-4 py-2 border border-outline-variant dark:border-zinc-700 rounded-lg text-xs font-bold text-on-surface dark:text-zinc-300 disabled:opacity-60"
                >
                  {t('acCancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || typed.trim() !== t('acConfirmWord')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? t('acDeleteBusy') : t('acConfirmGo')}
                </button>
              </div>
            </div>
          )}
          {accountError && <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">{accountError}</p>}
        </div>

        {/* Log Out */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-primary dark:text-white flex items-center gap-2">
              <LogOut className="w-4 h-4 text-zinc-550" />
              {t('signOutAccount')}
            </h3>
            <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">
              {t('signOutDesc')}
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
