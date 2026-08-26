import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Radio, RefreshCw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useLiveKit } from '@/context/LiveKitContext';
import {
  createLiveClassroom,
  deleteLiveClassroom,
  getLiveClassrooms,
  updateLiveClassroom,
} from '@/services/cms';
import { slugify } from '@/lib/utils';
import type { LiveClassroom } from '@/types';
import { toast } from 'sonner';

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function statusLabel(
  status: LiveClassroom['status'],
  t: (key: 'cancelledStatus' | 'endedStatus' | 'scheduledStatus') => string,
): string {
  if (status === 'cancelled') return t('cancelledStatus');
  if (status === 'ended') return t('endedStatus');
  return t('scheduledStatus');
}

export default function ClassroomAdminPanel() {
  const { user, displayName, isSuperAdmin } = useAuth();
  const { activeSessions } = useLiveKit();
  const { t } = useAppLanguage();
  const [classrooms, setClassrooms] = useState<LiveClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [endTime, setEndTime] = useState('');
  const [published, setPublished] = useState(true);

  const liveRoomNames = useMemo(
    () => new Set(activeSessions.map((session) => session.room_name)),
    [activeSessions],
  );

  const loadClassrooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClassrooms(await getLiveClassrooms(true));
    } catch (loadError) {
      console.error('Error loading Admin classrooms:', loadError);
      setError(t('classroomError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadClassrooms();
  }, [loadClassrooms]);

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setGradeLevel('');
    setDescription('');
    setStartTime(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
    setEndTime('');
    setPublished(true);
  };

  const handleCreate = async () => {
    if (!user || !title.trim() || !startTime) {
      setError(t('classroomError'));
      return;
    }

    const roomName = slugify(title.trim());
    const scheduledStart = new Date(startTime);
    const scheduledEnd = endTime ? new Date(endTime) : null;
    if (!roomName || Number.isNaN(scheduledStart.getTime()) || (scheduledEnd && Number.isNaN(scheduledEnd.getTime()))) {
      setError(t('classroomError'));
      return;
    }
    if (scheduledEnd && scheduledEnd <= scheduledStart) {
      setError(t('classroomError'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createLiveClassroom({
        room_name: roomName,
        host_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        subject: subject.trim() || null,
        grade_level: gradeLevel.trim() || null,
        host_name: displayName || user.email?.split('@')[0] || null,
        scheduled_start_at: scheduledStart.toISOString(),
        scheduled_end_at: scheduledEnd?.toISOString() || null,
        published,
      });
      toast.success(t('classroomSaved'));
      resetForm();
      await loadClassrooms();
    } catch (createError) {
      console.error('Error creating classroom:', createError);
      setError(createError instanceof Error && createError.message.includes('duplicate')
        ? 'A classroom with this title already exists.'
        : t('classroomError'));
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (classroom: LiveClassroom) => {
    setActionId(classroom.id);
    try {
      await updateLiveClassroom(classroom.id, { published: !classroom.published });
      await loadClassrooms();
    } catch (updateError) {
      console.error('Error updating classroom visibility:', updateError);
      toast.error(t('classroomError'));
    } finally {
      setActionId(null);
    }
  };

  const cancelClassroom = async (classroom: LiveClassroom) => {
    setActionId(classroom.id);
    try {
      await updateLiveClassroom(classroom.id, { status: 'cancelled', published: false });
      toast.success(t('classroomCancelled'));
      await loadClassrooms();
    } catch (cancelError) {
      console.error('Error cancelling classroom:', cancelError);
      toast.error(t('classroomError'));
    } finally {
      setActionId(null);
    }
  };

  const removeClassroom = async (classroom: LiveClassroom) => {
    if (!isSuperAdmin || !window.confirm(t('removeClassroomConfirm'))) return;
    setActionId(classroom.id);
    try {
      await deleteLiveClassroom(classroom.id);
      toast.success(t('classroomRemoved'));
      await loadClassrooms();
    } catch (removeError) {
      console.error('Error permanently removing classroom:', removeError);
      toast.error(removeError instanceof Error ? removeError.message : t('classroomError'));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{t('classrooms')}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('scheduleClassroom')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadClassrooms()}
          disabled={loading || saving}
          className="w-full border-white/20 text-white hover:bg-white/10 sm:w-auto"
        >
          <RefreshCw size={15} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('refreshClassrooms')}
        </Button>
      </div>

      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-300">
            <span>{t('classroomTitle')}</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Introduction to Gravity" className="border-white/10 bg-slate-800 text-white" disabled={saving} />
          </label>
          <label className="space-y-1 text-sm text-slate-300">
            <span>{t('roomName')}</span>
            <Input value={title ? slugify(title) : ''} readOnly className="border-white/10 bg-slate-800/70 text-slate-400" />
          </label>
          <label className="space-y-1 text-sm text-slate-300">
            <span>{t('classroomSubject')}</span>
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Astronomy" className="border-white/10 bg-slate-800 text-white" disabled={saving} />
          </label>
          <label className="space-y-1 text-sm text-slate-300">
            <span>{t('gradeLevel')}</span>
            <Input value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} placeholder="e.g. Grade 8" className="border-white/10 bg-slate-800 text-white" disabled={saving} />
          </label>
          <label className="space-y-1 text-sm text-slate-300 md:col-span-2">
            <span>{t('classroomDescription')}</span>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="border-white/10 bg-slate-800 text-white" disabled={saving} />
          </label>
          <label className="space-y-1 text-sm text-slate-300">
            <span>{t('startTime')}</span>
            <Input type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="border-white/10 bg-slate-800 text-white" disabled={saving} />
          </label>
          <label className="space-y-1 text-sm text-slate-300">
            <span>{t('endTime')}</span>
            <Input type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="border-white/10 bg-slate-800 text-white" disabled={saving} />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} disabled={saving} className="h-4 w-4 accent-orange-500" />
          {t('publishClassroom')}
        </label>
        <Button onClick={() => void handleCreate()} disabled={saving || !title.trim() || !startTime} className="mt-4 w-full bg-orange-500 text-white hover:bg-orange-600 sm:w-auto">
          {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <CalendarClock size={16} className="mr-2" />}
          {saving ? t('loading') : t('schedule')}
        </Button>
      </div>

      <div className="space-y-3">
        {loading && classrooms.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300"><Loader2 size={16} className="animate-spin" />{t('loading')}</div>
        ) : classrooms.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-400">{t('noUpcomingClassrooms')}</p>
        ) : classrooms.map((classroom) => {
          const isLive = liveRoomNames.has(classroom.room_name);
          return (
            <div key={classroom.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{classroom.title}</h3>
                    {isLive && <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-300"><Radio size={12} />{t('liveNow')}</span>}
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{statusLabel(classroom.status, t)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{t('startsAt')}: {new Date(classroom.scheduled_start_at).toLocaleString()} · {classroom.room_name}</p>
                  {classroom.description && <p className="mt-2 text-sm text-slate-300">{classroom.description}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {classroom.status === 'scheduled' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => void togglePublished(classroom)} disabled={actionId !== null} className="border-white/20 text-white hover:bg-white/10">
                        {classroom.published ? t('publishedStatus') : t('hiddenStatus')}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => void cancelClassroom(classroom)} disabled={actionId !== null} aria-label={t('cancelClassroom')} className="text-red-300 hover:bg-red-500/10 hover:text-red-200">
                        {actionId === classroom.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                      </Button>
                    </>
                  )}
                  {isSuperAdmin && (
                    <Button size="sm" variant="outline" onClick={() => void removeClassroom(classroom)} disabled={actionId !== null} aria-label={t('removeClassroom')} className="border-red-400/30 text-red-300 hover:bg-red-500/10 hover:text-red-200">
                      {actionId === classroom.id ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Trash2 size={15} className="mr-2" />}
                      {t('removeClassroom')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
