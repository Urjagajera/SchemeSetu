import { createContext, useContext } from 'react';
import { TRANSLATIONS } from '../constants/translations';

export type Language = 'en' | 'hi' | 'gu';

export interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof TRANSLATIONS['en']) => string;
}

export const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
