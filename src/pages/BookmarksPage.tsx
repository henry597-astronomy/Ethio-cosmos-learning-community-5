import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { getBookmarks, removeBookmark } from '@/services/cms';
import type { Bookmark as BookmarkType } from '@/types';
import { useAppLanguage } from '@/context/AppLanguageContext';

export default function BookmarksPage() {
  const { user } = useAuth();
  const { t } = useAppLanguage();
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
        if (!cancelled) setError(t('progressLoadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBookmarks();
    return () => {
      cancelled = true;
    };
  }, [t, user]);

  const handleRemoveBookmark = async (bookmarkId: string) => {
    if (!user) return;

    try {
      await removeBookmark(bookmarkId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch (err) {
      console.error('Error removing bookmark:', err);
      setError(t('progressLoadError'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{t('loadingBookmarks')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810] pt-24 pb-8">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center gap-3 mb-6 px-2">
          <Bookmark className="w-6 h-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-white">{t('yourBookmarks')}</h1>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-6">
            {error}
          </div>
        )}

        {bookmarks.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-lg border border-white/10 mx-2">
            <Bookmark className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-white mb-1">
              {t('noBookmarksYet')}
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {t('startBookmarking')}
            </p>
            <Button
              onClick={() => navigate('/learning')}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {t('exploreTopics')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 px-2">
            {bookmarks.map((bookmark) => (
              <Card
                key={bookmark.id}
                className="bg-slate-900 border-white/10 hover:border-orange-500/30 transition-all rounded-lg"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white mb-0.5 truncate">
                        {bookmark.title}
                      </h3>
                      {bookmark.type && (
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">
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
                        className="inline-flex items-center text-xs text-orange-500 hover:text-orange-400"
                      >
                        {t('goToLesson')}
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveBookmark(bookmark.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all shrink-0"
                      aria-label={t('removeBookmark')}
                    >
                      <Trash2 className="w-4 h-4" />
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
