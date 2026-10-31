import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { DOCUMENT_KINDS, DocumentKind } from '../utils/documentKinds';

/**
 * "My documents": the common documents a person has. Each tick is saved straight away (not with the profile form's
 * Save button), and scheme pages use these to tick matching lines of their document lists.
 */
export const MyDocuments: React.FC = () => {
  const { t } = useTranslation();
  const { profile, updateProfile } = useAuth();
  const [held, setHeld] = useState<string[]>(profile?.documentsHeld ?? []);
  const [saveFailed, setSaveFailed] = useState(false);

  const toggle = async (key: DocumentKind) => {
    const before = held;
    const next = held.includes(key) ? held.filter((k) => k !== key) : [...held, key];
    setHeld(next);
    setSaveFailed(false);
    try {
      await updateProfile({ documentsHeld: next });
    } catch {
      setHeld(before);
      setSaveFailed(true);
    }
  };

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">{t('myDocuments')}</legend>
      <p className="text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 leading-relaxed">{t('myDocumentsIntro')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {DOCUMENT_KINDS.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-2.5 rounded-lg border border-outline-variant dark:border-zinc-700 px-3 py-2.5 text-xs md:text-sm font-semibold text-on-surface dark:text-zinc-200 cursor-pointer hover:bg-surface-container-low dark:hover:bg-zinc-800"
          >
            <input
              type="checkbox"
              checked={held.includes(key)}
              onChange={() => toggle(key)}
              className="h-4 w-4 shrink-0 rounded border-outline-variant text-secondary focus:ring-secondary dark:border-zinc-600 dark:bg-zinc-800"
            />
            {t(label)}
          </label>
        ))}
      </div>
      {saveFailed && <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">{t('docsSaveFailed')}</p>}
    </fieldset>
  );
};

export default MyDocuments;
