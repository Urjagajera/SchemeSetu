import axios from 'axios';

const API_URL = '/api/bookmarks';
const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

function assertJsonArray<T>(data: unknown, context: string): T[] {
  if (
    !Array.isArray(data) ||
    (typeof data === 'string' && (data as string).trimStart().startsWith('<'))
  ) {
    throw new Error(
      `[bookmarkService.${context}] Expected JSON array, got ${typeof data}. Backend may not be running.`
    );
  }
  return data as T[];
}

function getLocalBookmarks(): string[] {
  try {
    const raw = localStorage.getItem('schemesetu_bookmarks');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const bookmarkService = {
  async getBookmarks(): Promise<string[]> {
    if (isMockMode) {
      return getLocalBookmarks();
    }
    try {
      const response = await axios.get(API_URL);
      return assertJsonArray<string>(response.data, 'getBookmarks');
    } catch (error) {
      console.warn('[bookmarkService.getBookmarks] Backend not available — loading from localStorage.', (error as Error).message);
      return getLocalBookmarks();
    }
  },

  async addBookmark(schemeId: string): Promise<string[]> {
    if (isMockMode) {
      const current = getLocalBookmarks();
      if (!current.includes(schemeId)) {
        current.push(schemeId);
        localStorage.setItem('schemesetu_bookmarks', JSON.stringify(current));
      }
      return current;
    }
    try {
      const response = await axios.post(API_URL, { schemeId });
      return assertJsonArray<string>(response.data, 'addBookmark');
    } catch (error) {
      console.warn(`[bookmarkService.addBookmark] Backend not available — adding "${schemeId}" locally.`, (error as Error).message);
      const current = getLocalBookmarks();
      if (!current.includes(schemeId)) {
        current.push(schemeId);
        localStorage.setItem('schemesetu_bookmarks', JSON.stringify(current));
      }
      return current;
    }
  },

  async removeBookmark(schemeId: string): Promise<string[]> {
    if (isMockMode) {
      const current = getLocalBookmarks();
      const updated = current.filter(id => id !== schemeId);
      localStorage.setItem('schemesetu_bookmarks', JSON.stringify(updated));
      return updated;
    }
    try {
      const response = await axios.delete(`${API_URL}/${schemeId}`);
      return assertJsonArray<string>(response.data, 'removeBookmark');
    } catch (error) {
      console.warn(`[bookmarkService.removeBookmark] Backend not available — removing "${schemeId}" locally.`, (error as Error).message);
      const current = getLocalBookmarks();
      const updated = current.filter(id => id !== schemeId);
      localStorage.setItem('schemesetu_bookmarks', JSON.stringify(updated));
      return updated;
    }
  }
};
