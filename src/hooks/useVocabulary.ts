import { useEffect, useState } from 'react';
import { Vocabulary } from '../types';
import { getVocabulary } from '../services/vocabularyService';

/**
 * The translated ministry/state names and tags for a language (one small table, fetched once per session).
 * `loading` is true until it has arrived; `vocab` stays null for English or if it could not be loaded.
 */
export function useVocabulary(language: string): { vocab: Vocabulary | null; loading: boolean } {
  const [vocab, setVocab] = useState<Vocabulary | null>(null);
  const [loading, setLoading] = useState(language !== 'en');

  useEffect(() => {
    if (language === 'en') {
      setVocab(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getVocabulary(language).then((v) => {
      if (cancelled) return;
      setVocab(v);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  return { vocab, loading };
}
