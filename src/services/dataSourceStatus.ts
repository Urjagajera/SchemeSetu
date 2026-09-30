import axios from 'axios';
import { useSyncExternalStore } from 'react';
import { isMockMode } from '../config/mockMode';

/**
 * Tracks whether the app is showing real backend data or sample (mock) data.
 *
 * The services fall back to local mock data when the backend can't be reached.
 * That used to be invisible, so sample data could pass for real data. This
 * watches every /api response through one axios interceptor and exposes the
 * result to the UI (see DataSourceBanner) without touching each fallback site.
 *
 * "Unreachable" means no response at all, a 5xx, or an HTML page where JSON
 * was expected (Vite's SPA fallback when nothing is proxying /api). A 4xx such
 * as a 401 for a logged-out user is the backend answering, not it being down.
 */
export type DataSource = 'real' | 'mock-mode' | 'backend-unreachable';

let backendUnreachable = false;
const listeners = new Set<() => void>();

function setUnreachable(value: boolean, detail?: string): void {
  if (backendUnreachable === value) return;
  backendUnreachable = value;
  if (value) {
    console.warn(
      `[dataSource] Backend unreachable${detail ? ` (${detail})` : ''} — the app is falling back to sample data, not real schemes.`,
    );
  } else {
    console.info('[dataSource] Backend reachable again — showing real data.');
  }
  listeners.forEach((l) => l());
}

function isApiRequest(url: string | undefined): boolean {
  return !!url && url.includes('/api/');
}

axios.interceptors.response.use(
  (response) => {
    if (isApiRequest(response.config.url)) {
      const contentType = String(response.headers?.['content-type'] ?? '');
      setUnreachable(contentType.includes('text/html'), 'got HTML instead of JSON');
    }
    return response;
  },
  (error) => {
    if (isApiRequest(error?.config?.url)) {
      const status: number | undefined = error.response?.status;
      if (status === undefined || status >= 500) {
        setUnreachable(true, status ? `HTTP ${status}` : error.message);
      } else {
        setUnreachable(false);
      }
    }
    return Promise.reject(error);
  },
);

function getSnapshot(): DataSource {
  if (isMockMode) return 'mock-mode';
  return backendUnreachable ? 'backend-unreachable' : 'real';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDataSource(): DataSource {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
