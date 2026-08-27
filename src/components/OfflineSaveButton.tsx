import { useEffect, useState } from 'react';
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
import {
  getOfflineData,
  getOfflineMediaKey,
  isMaterialOfflineReady,
  isTopicOfflineReady,
} from '@/lib/offline-cache';
import { exportMaterialToDownloads } from '@/lib/material-download';
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

  const topicId = props.kind === 'lesson' ? props.topic?.id : undefined;
  const materialId = props.kind === 'material' ? props.selection.item.id : undefined;
  const materialType = props.kind === 'material' ? props.selection.type : undefined;

  useEffect(() => {
    let active = true;
    const checkSaved = async () => {
      if (!user) return;
      const ready = topicId
        ? await isTopicOfflineReady(user.id, language, topicId)
        : materialId && materialType
        ? await isMaterialOfflineReady(user.id, language, materialId, materialType)
        : false;
      if (active) setSaved(ready);
    };
    void checkSaved();
    return () => { active = false; };
  }, [language, materialId, materialType, topicId, user]);

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
        const sourceUrl = props.selection.item.url;
        const cachedBlob = await getOfflineData<Blob>(getOfflineMediaKey(sourceUrl));
        if (!cachedBlob || typeof cachedBlob.arrayBuffer !== 'function') {
          throw new Error('The material was cached in the app but could not be prepared for Downloads.');
        }
        try {
          await exportMaterialToDownloads(cachedBlob, props.selection.item.title, sourceUrl);
          toast.success(t('offlineExportedToDownloads'));
        } catch (exportError) {
          console.warn('Material was cached but Downloads export failed:', exportError);
          toast.warning(t('offlineSavedButExportFailed'));
        }
      }
      setSaved(true);
      if (props.kind === 'lesson') toast.success(t('offlineItemSaved'));
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
