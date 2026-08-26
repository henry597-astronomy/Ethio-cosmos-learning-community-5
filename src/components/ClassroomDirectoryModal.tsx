import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Radio, RefreshCw, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { useLiveKit } from '@/context/LiveKitContext';
import { getLiveClassrooms } from '@/services/cms';
import type { LiveClassroom } from '@/types';

type ClassroomDirectoryModalProps = {
  isOpen: boolean;
  currentUserId?: string;
  onClose: () => void;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ClassroomDirectoryModal({
  isOpen,
  currentUserId,
  onClose,
}: ClassroomDirectoryModalProps) {
  const { t } = useAppLanguage();
  const { activeSessions, joinSession } = useLiveKit();
  const [classrooms, setClassrooms] = useState<LiveClassroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadClassrooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClassrooms(await getLiveClassrooms(false));
    } catch (loadError) {
      console.error('Error loading classroom directory:', loadError);
      setError(t('streamRoomsLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isOpen) void loadClassrooms();
  }, [isOpen, loadClassrooms]);

  const classroomByRoom = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.room_name, classroom])),
    [classrooms],
  );

  const liveRooms = useMemo(
    () => activeSessions
      .filter((session) => session.host_id !== currentUserId)
      .map((session) => ({
        session,
        classroom: classroomByRoom.get(session.room_name),
      })),
    [activeSessions, classroomByRoom, currentUserId],
  );

  const liveRoomNames = useMemo(
    () => new Set(activeSessions.map((session) => session.room_name)),
    [activeSessions],
  );

  const upcomingClassrooms = useMemo(() => {
    const now = Date.now();
    return classrooms.filter((classroom) =>
      classroom.status === 'scheduled'
      && !liveRoomNames.has(classroom.room_name)
      && new Date(classroom.scheduled_start_at).getTime() >= now,
    );
  }, [classrooms, liveRoomNames]);

  const handleJoin = async (roomName: string) => {
    setJoiningRoom(roomName);
    setError(null);
    try {
      await joinSession(roomName);
      onClose();
    } catch (joinError) {
      console.error('Error joining classroom:', joinError);
      setError(joinError instanceof Error ? joinError.message : t('streamRoomsLoadError'));
    } finally {
      setJoiningRoom(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-white sm:text-xl">{t('joinStream')}</h2>
            <p className="mt-1 text-xs text-slate-400">{t('liveNow')} · {t('upcomingClassrooms')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void loadClassrooms()}
              disabled={loading || joiningRoom !== null}
              aria-label={t('refreshClassrooms')}
              className="text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={joiningRoom !== null}
              aria-label={t('close')}
              className="text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-300">
              <Radio size={16} className="animate-pulse" />
              {t('liveNow')}
            </div>
            {loading && liveRooms.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                <Loader2 size={16} className="animate-spin" />
                {t('loading')}
              </div>
            ) : liveRooms.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                {t('noLiveRooms')}
              </p>
            ) : (
              <div className="space-y-3">
                {liveRooms.map(({ session, classroom }) => (
                  <div key={session.id} className="rounded-xl border border-green-400/20 bg-green-500/[0.06] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-white">
                          {classroom?.title || session.room_name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                          {classroom?.subject && <span>{classroom.subject}</span>}
                          {classroom?.grade_level && <span>{classroom.grade_level}</span>}
                          <span className="inline-flex items-center gap-1"><Users size={13} />{session.host_name}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => void handleJoin(session.room_name)}
                        disabled={joiningRoom !== null}
                        className="w-full shrink-0 bg-green-600 text-white hover:bg-green-500 sm:w-auto"
                      >
                        {joiningRoom === session.room_name ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Radio size={16} className="mr-2" />}
                        {joiningRoom === session.room_name ? t('joining') : t('joinRoom')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-sky-300">
              <CalendarClock size={16} />
              {t('upcomingClassrooms')}
            </div>
            {upcomingClassrooms.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                {t('noUpcomingClassrooms')}
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingClassrooms.map((classroom) => (
                  <div key={classroom.id} className="rounded-xl border border-sky-400/15 bg-sky-500/[0.04] p-4">
                    <h3 className="font-semibold text-white">{classroom.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                      <span>{t('startsAt')}: {formatDate(classroom.scheduled_start_at)}</span>
                      {classroom.host_name && <span>{t('hostedBy')}: {classroom.host_name}</span>}
                      {classroom.subject && <span>{classroom.subject}</span>}
                      {classroom.grade_level && <span>{classroom.grade_level}</span>}
                    </div>
                    {classroom.description && <p className="mt-2 text-sm text-slate-400">{classroom.description}</p>}
                    <p className="mt-2 text-xs text-slate-500">{t('joinRoom')} {t('startsAt').toLowerCase()} {formatDate(classroom.scheduled_start_at)}.</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
