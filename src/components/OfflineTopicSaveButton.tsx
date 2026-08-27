import { useEffect, useState } from 'react';
import { Check, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { usePremium } from '@/context/usePremium';
import { PremiumRequiredDialog } from '@/components/PremiumRequiredMessage';
import { Button } from '@/components/ui/button';
import { isTopicOfflineReady } from '@/lib/offline-cache';
import { saveSelectedTopicOffline } from '@/lib/background-prefetch';

export default function OfflineTopicSaveButton({ topicId }: { topicId: string }) {
  const { user } = useAuth();
  const { language, t } = useAppLanguage();
  const { loading: premiumLoading, canUse } = usePremium();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [premiumPromptOpen, setPremiumPromptOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) return undefined;
    void isTopicOfflineReady(user.id, language, topicId).then((ready) => {
      if (active) setSaved(ready);
    });
    return () => { active = false; };
  }, [language, topicId, user]);

  if (!user) return null;

  const handleDownload = async () => {
    if (premiumLoading || saving) return;
    if (!canUse('offline_learning_packs')) {
      setPremiumPromptOpen(true);
      return;
    }
    setSaving(true);
    try {
      await saveSelectedTopicOffline(user.id, language, topicId);
      setSaved(true);
      toast.success(t('offlineItemSaved'));
    } catch (error) {
      console.error('Failed to save topic offline:', error);
      toast.error(error instanceof Error ? error.message : t('offlineDownloadFailed'));
    } finally {
      setSaving(false);
    }
  };

  const label = saved ? t('offlineItemSaved') : t('downloadForOffline');
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleDownload()}
        disabled={premiumLoading || saving}
        aria-label={label}
        title={label}
        className={`border-white/20 text-white hover:bg-white/10 ${saved ? 'border-emerald-400/50 text-emerald-300' : ''}`}
      >
        {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : saved ? <Check size={16} className="mr-2" /> : <Download size={16} className="mr-2" />}
        {label}
      </Button>
      <PremiumRequiredDialog
        open={premiumPromptOpen}
        onOpenChange={setPremiumPromptOpen}
        featureName={t('offlineStorage')}
      />
    </>
  );
}
