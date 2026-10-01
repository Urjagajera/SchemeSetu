import axios from 'axios';
import { Vocabulary } from '../types';
import { isMockMode } from '../config/mockMode';

const cache = new Map<string, Promise<Vocabulary | null>>();

/**
 * The translated ministry/state names and tags for a language. They never change while the app is open, so
 * each language is fetched once. Returns null if the backend can't be reached (the caller shows English),
 * and a failed fetch is not cached, so the next visit tries again.
 */
export function getVocabulary(language: string): Promise<Vocabulary | null> {
  if (language === 'en' || isMockMode) return Promise.resolve(null);
  let pending = cache.get(language);
  if (!pending) {
    pending = axios
      .get('/api/vocabulary', { params: { lang: language } })
      .then((res) => {
        const d = res.data?.data;
        if (!d || typeof d !== 'object' || typeof d.names !== 'object' || typeof d.tags !== 'object') throw new Error('unexpected response');
        return d as Vocabulary;
      })
      .catch((err) => {
        console.warn('[vocabularyService] could not load translated labels, showing English', err);
        cache.delete(language);
        return null;
      });
    cache.set(language, pending);
  }
  return pending;
}
