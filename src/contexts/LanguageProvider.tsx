import React, { useState } from 'react';
import { TRANSLATIONS } from '../constants/translations';
import { LanguageContext, Language } from './LanguageContext';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('schemesetu_lang');
    return (saved === 'hi' || saved === 'en' || saved === 'gu') ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('schemesetu_lang', lang);
  };

  const t = (key: keyof typeof TRANSLATIONS['en']): string => {
    const dictionary = TRANSLATIONS[language] || TRANSLATIONS['en'];
    return dictionary[key] || TRANSLATIONS['en'][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
