/**
 * Schemes this person opened recently, kept on this device only (localStorage), newest first. Works for guests too;
 * nothing is sent to the server. Shown on the dashboard so a scheme looked at earlier is quick to find again.
 */
export interface RecentScheme {
  id: string;
  name: string;
  authority: string;
  viewedAt: number;
}

export const RECENT_KEY = 'schemesetu_recent';
export const MAX_RECENT = 8;

export function loadRecent(): RecentScheme[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(list)
      ? list.filter((r): r is RecentScheme => r && typeof r.id === 'string' && typeof r.name === 'string').slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

/** Puts a scheme at the top (once), keeping the newest MAX_RECENT. */
export function rememberViewed(scheme: { id: string; name: string; authorityName?: string }, now = Date.now()): RecentScheme[] {
  const next = [
    { id: scheme.id, name: scheme.name, authority: scheme.authorityName ?? '', viewedAt: now },
    ...loadRecent().filter((r) => r.id !== scheme.id),
  ].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // private window or blocked storage: nothing is remembered
  }
  return next;
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // nothing to clear
  }
}
