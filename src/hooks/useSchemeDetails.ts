import { useEffect, useState } from 'react';
import { schemeService } from '../services/schemeService';
import type { Scheme } from '../types';

const POLL_MS = 3000;
const MAX_POLLS = 20; // about a minute, then whatever is translated by then stays and the rest stays English

export interface SchemeDetails {
  /** schemeId -> the full scheme (with its translation state). Absent while loading, and for a scheme that could not be loaded. */
  details: Record<string, Scheme>;
  /** Ids whose first answer has not come back yet. */
  loadingIds: string[];
}

/**
 * The full detail of a few schemes (eligibility, documents, every benefit), fetched the way the scheme page fetches
 * one. In a non-English language the server translates what is missing in the background exactly as when the
 * scheme page is opened (nothing more than that), so this asks again every few seconds while it says "pending".
 */
export function useSchemeDetails(ids: string[], language: string): SchemeDetails {
  const [details, setDetails] = useState<Record<string, Scheme>>({});
  const [settled, setSettled] = useState<Record<string, boolean>>({});
  const key = ids.join(',');

  useEffect(() => {
    // A different language or a different set of schemes starts afresh; the old answers belong to the old language.
    setDetails({});
    setSettled({});
    if (ids.length === 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;

    const fetchAll = async (only: string[]) => {
      const results = await Promise.all(only.map(async (id) => [id, await schemeService.getSchemeById(id).catch(() => null)] as const));
      if (cancelled) return;
      setDetails((prev) => {
        const next = { ...prev };
        for (const [id, scheme] of results) if (scheme) next[id] = scheme;
        return next;
      });
      setSettled((prev) => ({ ...prev, ...Object.fromEntries(only.map((id) => [id, true])) }));
      const pending = results.filter(([, s]) => s?.translation?.status === 'pending').map(([id]) => id);
      if (pending.length > 0 && language !== 'en' && ++polls <= MAX_POLLS) {
        timer = setTimeout(() => void fetchAll(pending), POLL_MS);
      }
    };
    void fetchAll(ids);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, language]);

  return { details, loadingIds: ids.filter((id) => !settled[id]) };
}
