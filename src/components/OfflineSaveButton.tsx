import { useState } from 'react';
import { Check, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { usePremium } from '@/context/usePremium';
import { PremiumRequiredDialog } from '@/components/PremiumRequiredMessage';
import { Button } from '@/components/ui/button';
import {
  saveSelectedLessonOffline,
  saveSelectedMaterialOffline,
  type MaterialSelection,
} from '@/lib/background-prefetch';
import type { Lesson, Subtopic, Topic } from '@/types';

type OfflineSaveButtonProps =
  | { kind: 'lesson'; lesson: Lesson; topic?: Topic; subtopic?: Subtopic }
  | { kind: 'material'; selection: MaterialSelection };

export default function OfflineSaveButton(props: OfflineSaveButtonProps) {
  const { user } = useAuth();
  const { language, t } = useAppLanguage();
  const { loading: premiumLoading, canUse } = usePremium();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [premiumPromptOpen, setPremiumPromptOpen] = useState(false);

  if (!user) return null;

  const saveOffline = async () => {
    if (premiumLoading || saving) return;
    if (!canUse('offline_learning_packs')) {
      setPremiumPromptOpen(true);
      return;
    }

    setSaving(true);
    try {
      if (props.kind === 'lesson') {
        await saveSelectedLessonOffline(user.id, language, props.lesson, props.topic, props.subtopic);
      } else {
        await saveSelectedMaterialOffline(user.id, language, props.selection);
      }
      setSaved(true);
      toast.success(t('offlineItemSaved'));
    } catch (error) {
      console.error('Failed to save selected content offline:', error);
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
        size="icon"
        onClick={() => void saveOffline()}
        disabled={premiumLoading || saving}
        aria-label={label}
        title={label}
        className={`h-9 w-9 shrink-0 border-white/20 text-white hover:bg-white/10 ${saved ? 'border-emerald-400/50 text-emerald-300' : ''}`}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Download size={16} />}
      </Button>
      <PremiumRequiredDialog
        open={premiumPromptOpen}
        onOpenChange={setPremiumPromptOpen}
        featureName={t('offlineStorage')}
      />
    </>
  );
}
