import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { getBookmarks, removeBookmark } from '@/services/cms';
import type { Bookmark as BookmarkType } from '@/types';

export default function BookmarksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadBookmarks = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getBookmarks(user.id);
        if (!cancelled) setBookmarks(data);
      } catch (err) {
        console.error('Error loading bookmarks:', err);
        if (!cancelled) setError('Failed to load bookmarks. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBookmarks();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleRemoveBookmark = async (bookmarkId: string) => {
    if (!user) return;

    try {
      await removeBookmark(bookmarkId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch (err) {
      console.error('Error removing bookmark:', err);
      setError('Failed to remove bookmark. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading bookmarks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <Bookmark className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold text-white">Your Bookmarks</h1>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-6">
            {error}
          </div>
        )}

        {bookmarks.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-white/10">
            <Bookmark className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No bookmarks yet
            </h2>
            <p className="text-gray-400 mb-6">
              Start reading lessons and bookmark your favorites!
            </p>
            <Button
              onClick={() => navigate('/learning')}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Explore Topics
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarks.map((bookmark) => (
              <Card
                key={bookmark.id}
                className="bg-slate-900 border-white/10 hover:border-orange-500/30 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {bookmark.title}
                      </h3>
                      {bookmark.type && (
                        <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">
                          {bookmark.type}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (bookmark.url.startsWith('/')) {
                            navigate(bookmark.url);
                          }
                        }}
                        className="inline-flex items-center text-sm text-orange-500 hover:text-orange-400"
                      >
                        Go to Lesson
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveBookmark(bookmark.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      aria-label="Remove bookmark"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
