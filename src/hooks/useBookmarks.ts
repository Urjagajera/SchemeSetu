import { useState, useEffect } from 'react';
import { bookmarkService } from '../services/bookmarkService';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBookmarks = async () => {
    try {
      const list = await bookmarkService.getBookmarks();
      setBookmarks(list);
    } catch (error) {
      console.error('Failed to load bookmarks', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const toggleBookmark = async (schemeId: string) => {
    try {
      if (bookmarks.includes(schemeId)) {
        const updated = await bookmarkService.removeBookmark(schemeId);
        setBookmarks(updated);
      } else {
        const updated = await bookmarkService.addBookmark(schemeId);
        setBookmarks(updated);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark', error);
    }
  };

  const isBookmarked = (schemeId: string) => {
    return bookmarks.includes(schemeId);
  };

  return { bookmarks, toggleBookmark, isBookmarked, loading };
}
