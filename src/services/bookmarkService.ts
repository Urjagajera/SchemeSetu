import axios from 'axios';

const API_URL = '/api/bookmarks';

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

export const bookmarkService = {
  async getBookmarks(): Promise<string[]> {
    try {
      const response = await axios.get(API_URL);
      return assertJsonArray<string>(response.data, 'getBookmarks');
    } catch (error) {
      console.warn('[bookmarkService.getBookmarks] Backend not available — loading from localStorage.', (error as Error).message);
      try {
        const raw = localStorage.getItem('schemesetu_bookmarks');
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
  },

  async addBookmark(schemeId: string): Promise<string[]> {
    try {
      const response = await axios.post(API_URL, { schemeId });
      return assertJsonArray<string>(response.data, 'addBookmark');
    } catch (error) {
      console.warn(`[bookmarkService.addBookmark] Backend not available — adding "${schemeId}" locally.`, (error as Error).message);
      const current = await this.getBookmarks();
      if (!current.includes(schemeId)) {
        current.push(schemeId);
        localStorage.setItem('schemesetu_bookmarks', JSON.stringify(current));
      }
      return current;
    }
  },

  async removeBookmark(schemeId: string): Promise<string[]> {
    try {
      const response = await axios.delete(`${API_URL}/${schemeId}`);
      return assertJsonArray<string>(response.data, 'removeBookmark');
    } catch (error) {
      console.warn(`[bookmarkService.removeBookmark] Backend not available — removing "${schemeId}" locally.`, (error as Error).message);
      const current = await this.getBookmarks();
      const updated = current.filter(id => id !== schemeId);
      localStorage.setItem('schemesetu_bookmarks', JSON.stringify(updated));
      return updated;
    }
  }
};
