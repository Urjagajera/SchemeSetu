import { useEffect, useState } from 'react';
import { schemeService } from '../services/schemeService';

let cached: Promise<string[]> | null = null;

/**
 * The fixed list of states and union territories (GET /api/schemes/states), fetched once per session.
 * Empty until it arrives. Every place that offers a state (Search filter, profile form, guest wizard) uses this
 * one list, so they cannot drift apart.
 */
export function useStates(): string[] {
  const [states, setStates] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!cached) {
      cached = schemeService.getStates().catch(() => {
        cached = null; // try again next time
        return [] as string[];
      });
    }
    cached.then((list) => {
      if (!cancelled) setStates(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return states;
}
