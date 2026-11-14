import React, { createContext, useContext, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';

/**
 * Comfort settings kept on this device only (never sent anywhere):
 * - simpleMode: larger text and buttons, no animations, fewer extras (the `simple-mode` class on <html>, global.css).
 * - readAnswersAloud: SetuAI reads each new answer aloud with the device's own voice.
 */
export interface Preferences {
  simpleMode: boolean;
  readAnswersAloud: boolean;
}

interface PreferencesContextValue extends Preferences {
  setSimpleMode: (on: boolean) => void;
  setReadAnswersAloud: (on: boolean) => void;
}

export const PREFERENCES_KEY = 'schemesetu_prefs';
const DEFAULTS: Preferences = { simpleMode: false, readAnswersAloud: false };

export function loadPreferences(): Preferences {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}') as Partial<Preferences>;
    return { simpleMode: raw.simpleMode === true, readAnswersAloud: raw.readAnswersAloud === true };
  } catch {
    return DEFAULTS;
  }
}

const PreferencesContext = createContext<PreferencesContextValue>({ ...DEFAULTS, setSimpleMode: () => {}, setReadAnswersAloud: () => {} });

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<Preferences>(loadPreferences);

  useEffect(() => {
    document.documentElement.classList.toggle('simple-mode', prefs.simpleMode);
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch {
      // private window or blocked storage: the setting still applies until the page is closed
    }
  }, [prefs]);

  const value: PreferencesContextValue = {
    ...prefs,
    setSimpleMode: (on) => setPrefs((p) => ({ ...p, simpleMode: on })),
    setReadAnswersAloud: (on) => setPrefs((p) => ({ ...p, readAnswersAloud: on })),
  };

  // Simple mode also turns off framer-motion's movement (the CSS rule covers CSS transitions).
  return (
    <PreferencesContext.Provider value={value}>
      <MotionConfig reducedMotion={prefs.simpleMode ? 'always' : 'user'}>{children}</MotionConfig>
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => useContext(PreferencesContext);
