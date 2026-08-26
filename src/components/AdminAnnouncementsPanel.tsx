import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { createAdminAnnouncement } from '@/services/notifications';
import { toast } from 'sonner';

export default function AdminAnnouncementsPanel() {
  const { t } = useAppLanguage();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [actionPath, setActionPath] = useState('');
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const trimmedActionPath = actionPath.trim();
    if (!trimmedTitle || !trimmedBody) {
      toast.error(t('announcementValidation'));
      return;
    }
    if (trimmedActionPath && (!trimmedActionPath.startsWith('/') || trimmedActionPath.startsWith('//'))) {
      toast.error(t('announcementValidation'));
      return;
    }

    setPublishing(true);
    try {
      const recipients = await createAdminAnnouncement({
        title: trimmedTitle,
        body: trimmedBody,
        action_path: trimmedActionPath || null,
      });
      toast.success(`${t('announcementPublished')} (${recipients})`);
      setTitle('');
      setBody('');
      setActionPath('');
    } catch (error) {
      console.error('Failed to publish announcement:', error);
      toast.error(error instanceof Error ? error.message : t('announcementPublishError'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/70 p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-lg bg-orange-500/15 p-2 text-orange-300">
          <Megaphone size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{t('sendAnnouncement')}</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-400">{t('announcementHelper')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-200">{t('announcementTitle')}</span>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            placeholder={t('announcementTitle')}
            className="border-white/10 bg-slate-950 text-white placeholder:text-gray-600"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-200">{t('announcementMessage')}</span>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            rows={6}
            placeholder={t('announcementMessage')}
            className="border-white/10 bg-slate-950 text-white placeholder:text-gray-600"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-200">{t('optionalActionPath')}</span>
          <Input
            value={actionPath}
            onChange={(event) => setActionPath(event.target.value)}
            maxLength={200}
            placeholder="/learning"
            className="border-white/10 bg-slate-950 text-white placeholder:text-gray-600"
          />
        </label>
        <Button
          type="button"
          onClick={() => void handlePublish()}
          disabled={publishing}
          className="bg-orange-500 text-white hover:bg-orange-600"
        >
          <Megaphone size={16} className="mr-2" />
          {publishing ? t('loading') : t('publishAnnouncement')}
        </Button>
      </div>
    </section>
  );
}
