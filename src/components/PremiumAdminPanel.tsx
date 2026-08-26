import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock3, Crown, RefreshCw, ShieldAlert, UserCheck, UserPlus, X } from 'lucide-react';
import { supabase } from '@/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

type PremiumSettings = {
  id: string;
  is_enabled: boolean;
  updated_at: string;
};

type PremiumFeature = {
  key: string;
  name: string;
  description: string;
  is_premium: boolean;
};

type PremiumPlan = {
  key: string;
  name: string;
  description: string;
  price_birr: number;
  duration_days: number;
  is_active: boolean;
};

type PremiumUser = {
  id: string;
  email: string;
  username: string | null;
  role: string;
  is_blocked: boolean | null;
};

type PremiumEntitlement = {
  id: string;
  user_id: string;
  status: 'active' | 'revoked';
  source: 'manual' | 'payment' | 'test';
  starts_at: string;
  expires_at: string | null;
  note: string;
  created_at: string;
};

type PremiumAudit = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  target_user_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

type PremiumLessonControl = {
  subtopic_id: string;
  title: string;
  is_premium: boolean;
};

const formatDate = (value: string | null) => {
  if (!value) return 'No expiry';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

const toDateTimeLocal = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

const isEntitlementCurrentlyActive = (entitlement: PremiumEntitlement) => (
  entitlement.status === 'active'
  && new Date(entitlement.starts_at).getTime() <= Date.now()
  && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now())
);

export default function PremiumAdminPanel({ adminId }: { adminId: string }) {
  const [settings, setSettings] = useState<PremiumSettings | null>(null);
  const [features, setFeatures] = useState<PremiumFeature[]>([]);
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [users, setUsers] = useState<PremiumUser[]>([]);
  const [entitlements, setEntitlements] = useState<PremiumEntitlement[]>([]);
  const [auditLog, setAuditLog] = useState<PremiumAudit[]>([]);
  const [lessonControls, setLessonControls] = useState<PremiumLessonControl[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [lessonSearch, setLessonSearch] = useState('');
  const [grantDays, setGrantDays] = useState('30');
  const [grantExpiry, setGrantExpiry] = useState('');
  const [grantWithoutExpiry, setGrantWithoutExpiry] = useState(false);
  const [grantNote, setGrantNote] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPremiumData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsResult, featuresResult, plansResult, usersResult, entitlementsResult, auditResult, lessonsResult, lessonFlagsResult] = await Promise.all([
        supabase.from('premium_settings').select('id, is_enabled, updated_at').eq('id', 'global').maybeSingle(),
        supabase.from('premium_features').select('key, name, description, is_premium').order('name'),
        supabase.from('premium_plans').select('key, name, description, price_birr, duration_days, is_active').order('name'),
        supabase.from('profiles').select('id, email, username, role, is_blocked').order('created_at', { ascending: false }).limit(500),
        supabase.from('premium_entitlements').select('id, user_id, status, source, starts_at, expires_at, note, created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('premium_audit_log').select('id, entity_type, entity_id, action, target_user_id, before_data, after_data, created_at').order('created_at', { ascending: false }).limit(40),
        supabase.from('lessons').select('subtopic_id, title').order('title').limit(500),
        supabase.from('premium_lessons').select('subtopic_id, is_premium').limit(500),
      ]);

      const firstError = [settingsResult, featuresResult, plansResult, usersResult, entitlementsResult, auditResult, lessonsResult, lessonFlagsResult]
        .find((result) => result.error)?.error;
      if (firstError) throw firstError;

      setSettings((settingsResult.data || null) as PremiumSettings | null);
      setFeatures((featuresResult.data || []) as PremiumFeature[]);
      setPlans((plansResult.data || []) as PremiumPlan[]);
      setUsers((usersResult.data || []) as PremiumUser[]);
      setEntitlements((entitlementsResult.data || []) as PremiumEntitlement[]);
      setAuditLog((auditResult.data || []) as PremiumAudit[]);
      const lessonFlagMap = new Map((lessonFlagsResult.data || []).map((flag: { subtopic_id: string; is_premium: boolean }) => [flag.subtopic_id, flag.is_premium]));
      setLessonControls((lessonsResult.data || []).map((lesson: { subtopic_id: string; title: string | null }) => ({
        subtopic_id: lesson.subtopic_id,
        title: lesson.title || 'Untitled lesson',
        is_premium: Boolean(lessonFlagMap.get(lesson.subtopic_id)),
      })));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load Premium controls.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => { void loadPremiumData(); }, 0);
    return () => window.clearTimeout(handle);
  }, [loadPremiumData]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((candidate) => (
      (candidate.username || '').toLowerCase().includes(query)
      || candidate.email.toLowerCase().includes(query)
    ));
  }, [userSearch, users]);

  const filteredLessons = useMemo(() => {
    const query = lessonSearch.trim().toLowerCase();
    if (!query) return lessonControls;
    return lessonControls.filter((lesson) => lesson.title.toLowerCase().includes(query));
  }, [lessonControls, lessonSearch]);

  const selectedUser = users.find((candidate) => candidate.id === selectedUserId) || null;
  const selectedEntitlements = useMemo(
    () => entitlements.filter((entitlement) => entitlement.user_id === selectedUserId),
    [entitlements, selectedUserId],
  );
  const selectedActiveEntitlement = selectedEntitlements.find(isEntitlementCurrentlyActive) || null;

  const updateGlobalSetting = async (enabled: boolean) => {
    setSaving('global');
    const { error: updateError } = await supabase
      .from('premium_settings')
      .update({ is_enabled: enabled, updated_by: adminId })
      .eq('id', 'global');
    setSaving(null);
    if (updateError) {
      toast.error(`Could not update Premium mode: ${updateError.message}`);
      return;
    }
    setSettings((current) => current ? { ...current, is_enabled: enabled } : current);
    toast.success(enabled ? 'Premium mode is enabled.' : 'Premium mode is disabled globally.');
    await loadPremiumData();
  };

  const updateFeature = async (feature: PremiumFeature, isPremium: boolean) => {
    setSaving(`feature:${feature.key}`);
    const { error: updateError } = await supabase
      .from('premium_features')
      .update({ is_premium: isPremium })
      .eq('key', feature.key);
    setSaving(null);
    if (updateError) {
      toast.error(`Could not update ${feature.name}: ${updateError.message}`);
      return;
    }
    setFeatures((current) => current.map((item) => item.key === feature.key ? { ...item, is_premium: isPremium } : item));
    toast.success(`${feature.name} is now ${isPremium ? 'Premium-only' : 'free for everyone'}.`);
    await loadPremiumData();
  };

  const updateLessonPremium = async (lesson: PremiumLessonControl, isPremium: boolean) => {
    setSaving(`lesson:${lesson.subtopic_id}`);
    const { error: updateError } = await supabase
      .from('premium_lessons')
      .upsert({
        subtopic_id: lesson.subtopic_id,
        is_premium: isPremium,
        created_by: adminId,
        updated_by: adminId,
      }, { onConflict: 'subtopic_id' });
    setSaving(null);
    if (updateError) {
      toast.error(`Could not update ${lesson.title}: ${updateError.message}`);
      return;
    }
    setLessonControls((current) => current.map((item) => item.subtopic_id === lesson.subtopic_id ? { ...item, is_premium: isPremium } : item));
    toast.success(`${lesson.title} is now ${isPremium ? 'Premium-only' : 'free for everyone'}.`);
    await loadPremiumData();
  };

  const updatePlan = async (plan: PremiumPlan, field: 'price_birr' | 'duration_days', value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || (field === 'duration_days' && (!Number.isInteger(parsed) || parsed < 1))) {
      toast.error(field === 'price_birr' ? 'Enter a valid non-negative price in birr.' : 'Enter a whole number of days greater than zero.');
      return;
    }
    setSaving(`plan:${plan.key}:${field}`);
    const { error: updateError } = await supabase
      .from('premium_plans')
      .update({ [field]: parsed })
      .eq('key', plan.key);
    setSaving(null);
    if (updateError) {
      toast.error(`Could not update the plan: ${updateError.message}`);
      return;
    }
    setPlans((current) => current.map((item) => item.key === plan.key ? { ...item, [field]: parsed } : item));
    toast.success('Plan draft saved. Checkout is still disabled in manual/test mode.');
    await loadPremiumData();
  };

  const grantPremium = async () => {
    if (!selectedUserId) {
      toast.error('Select a user before granting Premium.');
      return;
    }
    const days = Number(grantDays);
    let expiry: string | null = null;
    if (!grantWithoutExpiry) {
      if (grantExpiry) {
        const date = new Date(grantExpiry);
        if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
          toast.error('The expiry must be a valid future date and time.');
          return;
        }
        expiry = date.toISOString();
      } else if (Number.isInteger(days) && days > 0 && days <= 3650) {
        expiry = new Date(Date.now() + days * 86_400_000).toISOString();
      } else {
        toast.error('Enter a duration from 1 to 3650 days, or choose no expiry.');
        return;
      }
    }

    setSaving('grant');
    const { error: insertError } = await supabase.from('premium_entitlements').insert({
      user_id: selectedUserId,
      status: 'active',
      source: 'manual',
      starts_at: new Date().toISOString(),
      expires_at: expiry,
      note: grantNote.trim(),
      granted_by: adminId,
    });
    setSaving(null);
    if (insertError) {
      toast.error(`Could not grant Premium: ${insertError.message}`);
      return;
    }
    setGrantNote('');
    setGrantExpiry('');
    setGrantWithoutExpiry(false);
    toast.success(`Premium granted to ${selectedUser?.email || 'the selected user'}.`);
    await loadPremiumData();
  };

  const revokeEntitlement = async (entitlement: PremiumEntitlement) => {
    if (!window.confirm('Revoke this Premium entitlement now? This will take effect immediately.')) return;
    setSaving(`revoke:${entitlement.id}`);
    const { error: updateError } = await supabase
      .from('premium_entitlements')
      .update({ status: 'revoked', note: entitlement.note ? `${entitlement.note} [Revoked by admin]` : 'Revoked by admin' })
      .eq('id', entitlement.id);
    setSaving(null);
    if (updateError) {
      toast.error(`Could not revoke Premium: ${updateError.message}`);
      return;
    }
    toast.success('Premium entitlement revoked.');
    await loadPremiumData();
  };

  const expireEntitlement = async (entitlement: PremiumEntitlement, expiryLocal: string) => {
    const expiry = new Date(expiryLocal);
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= new Date(entitlement.starts_at).getTime()) {
      toast.error('Expiry must be after the entitlement start time.');
      return;
    }
    setSaving(`expiry:${entitlement.id}`);
    const { error: updateError } = await supabase
      .from('premium_entitlements')
      .update({ expires_at: expiry.toISOString() })
      .eq('id', entitlement.id);
    setSaving(null);
    if (updateError) {
      toast.error(`Could not update expiry: ${updateError.message}`);
      return;
    }
    toast.success('Premium expiry updated.');
    await loadPremiumData();
  };

  if (loading) {
    return <div className="rounded-xl border border-white/10 bg-slate-900/50 p-6 text-gray-300">Loading Premium controls…</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-950/20 p-6 text-red-200">
        <p className="font-semibold">Premium controls could not be loaded.</p>
        <p className="mt-1 text-sm text-red-300">{error}</p>
        <Button onClick={() => void loadPremiumData()} className="mt-4 bg-orange-500 text-white hover:bg-orange-600">Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orange-400/30 bg-gradient-to-br from-orange-500/10 via-slate-900/70 to-slate-950/80 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-orange-500/15 p-3 text-orange-300"><Crown size={24} /></div>
            <div>
              <h2 className="text-xl font-bold text-white">Premium control center</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-300">
                Control every Premium decision from Admin. The global switch is an emergency kill switch: when it is off, every Premium-only feature is denied, including for manually granted users.
              </p>
            </div>
          </div>
          <Button onClick={() => void loadPremiumData()} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw size={15} className="mr-2" /> Refresh
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-slate-950/50 p-4">
          <div>
            <p className="font-semibold text-white">Premium mode</p>
            <p className="text-sm text-gray-400">{settings?.is_enabled ? 'Feature switches are active.' : 'All Premium-only features are currently shut down globally.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${settings?.is_enabled ? 'text-emerald-300' : 'text-red-300'}`}>{settings?.is_enabled ? 'ON' : 'OFF'}</span>
            <Switch
              checked={settings?.is_enabled || false}
              onCheckedChange={(checked) => void updateGlobalSetting(checked)}
              disabled={saving === 'global'}
              aria-label="Enable or disable Premium mode globally"
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </div>
        {!settings?.is_enabled && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <p><strong>Global shutdown is active.</strong> Existing grants are preserved for audit and can be reactivated by turning Premium back on; users cannot access Premium-only features while this switch is off.</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">Feature-by-feature switches</h3>
          <p className="mt-1 text-sm text-gray-400">New features start free. Turn a feature on as Premium-only only after its user experience and server-side cost protection are ready.</p>
        </div>
        <div className="space-y-3">
          {features.map((feature) => (
            <div key={feature.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-800/70 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{feature.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${feature.is_premium ? 'bg-orange-500/20 text-orange-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                    {feature.is_premium ? 'PREMIUM' : 'FREE'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-400">{feature.description}</p>
                <p className="mt-1 text-[11px] text-gray-500">Key: {feature.key}</p>
              </div>
              <Switch
                checked={feature.is_premium}
                onCheckedChange={(checked) => void updateFeature(feature, checked)}
                disabled={saving === `feature:${feature.key}`}
                aria-label={`Make ${feature.name} Premium-only`}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-cyan-500/15 p-2 text-cyan-300"><BookOpen size={20} /></div>
          <div>
            <h3 className="text-lg font-bold text-white">Individual lesson access</h3>
            <p className="mt-1 text-sm text-gray-400">Mark selected lessons Premium without changing their content. Users without an active grant will see the Premium message when they try to open a marked lesson.</p>
          </div>
        </div>
        <div className="relative mb-3">
          <Input value={lessonSearch} onChange={(event) => setLessonSearch(event.target.value)} placeholder="Search lessons by title" className="border-white/10 bg-slate-950 pr-8 text-white placeholder:text-gray-500" />
          {lessonSearch && <button type="button" onClick={() => setLessonSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-white" aria-label="Clear lesson search"><X size={14} /></button>}
        </div>
        <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
          {filteredLessons.map((lesson) => (
            <div key={lesson.subtopic_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-800/70 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{lesson.title}</p>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${lesson.is_premium ? 'bg-orange-500/20 text-orange-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                  {lesson.is_premium ? 'PREMIUM' : 'FREE'}
                </span>
              </div>
              <Switch
                checked={lesson.is_premium}
                onCheckedChange={(checked) => void updateLessonPremium(lesson, checked)}
                disabled={saving === `lesson:${lesson.subtopic_id}`}
                aria-label={`Make ${lesson.title} Premium-only`}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>
          ))}
          {filteredLessons.length === 0 && <p className="py-5 text-center text-sm text-gray-500">No matching lessons.</p>}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-sky-500/15 p-2 text-sky-300"><Clock3 size={20} /></div>
          <div>
            <h3 className="text-lg font-bold text-white">Payment-ready plan draft</h3>
            <p className="mt-1 text-sm text-gray-400">This is configuration only. Checkout is disabled because no Ethiopian merchant account or provider credentials are connected.</p>
            <p className="mt-2 inline-flex rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-200">Payment status: manual/test mode — payment provider not connected</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.key} className="rounded-lg border border-white/10 bg-slate-800/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-white">{plan.name}</p>
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-gray-300">DRAFT</span>
              </div>
              <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-400">Price (ETB)
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={plan.price_birr}
                    onChange={(event) => setPlans((current) => current.map((item) => item.key === plan.key ? { ...item, price_birr: Number(event.target.value) } : item))}
                    onBlur={(event) => void updatePlan(plan, 'price_birr', event.target.value)}
                    className="mt-1 border-white/10 bg-slate-950 text-white"
                    disabled={saving === `plan:${plan.key}:price_birr`}
                  />
                </label>
                <label className="text-xs text-gray-400">Duration (days)
                  <Input
                    type="number"
                    min="1"
                    max="3650"
                    step="1"
                    value={plan.duration_days}
                    onChange={(event) => setPlans((current) => current.map((item) => item.key === plan.key ? { ...item, duration_days: Number(event.target.value) } : item))}
                    onBlur={(event) => void updatePlan(plan, 'duration_days', event.target.value)}
                    className="mt-1 border-white/10 bg-slate-950 text-white"
                    disabled={saving === `plan:${plan.key}:duration_days`}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-violet-500/15 p-2 text-violet-300"><UserPlus size={20} /></div>
          <div>
            <h3 className="text-lg font-bold text-white">Manual user access</h3>
            <p className="mt-1 text-sm text-gray-400">Grant, review, expire, or revoke Premium without collecting money. Every action is recorded in the audit log.</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div className="rounded-lg border border-white/10 bg-slate-800/70 p-4">
            <label className="text-sm font-semibold text-white">Find a user</label>
            <div className="relative mt-2">
              <Input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search by username or email" className="border-white/10 bg-slate-950 pr-8 text-white placeholder:text-gray-500" />
              {userSearch && <button type="button" onClick={() => setUserSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-white" aria-label="Clear user search"><X size={14} /></button>}
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {filteredUsers.map((candidate) => {
                const active = entitlements.some((entitlement) => entitlement.user_id === candidate.id && isEntitlementCurrentlyActive(entitlement));
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setSelectedUserId(candidate.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${selectedUserId === candidate.id ? 'border-orange-400 bg-orange-500/10' : 'border-white/10 bg-slate-900/60 hover:border-white/25'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-white">{candidate.username || '(no username)'}</span>
                      {active && <span className="shrink-0 text-[11px] font-semibold text-emerald-300">ACTIVE</span>}
                    </div>
                    <span className="block truncate text-xs text-gray-400">{candidate.email}</span>
                  </button>
                );
              })}
              {filteredUsers.length === 0 && <p className="py-5 text-center text-sm text-gray-500">No matching users.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-800/70 p-4">
            {!selectedUser ? (
              <div className="flex min-h-48 items-center justify-center text-center text-sm text-gray-500">Select a user to manage Premium access.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{selectedUser.username || '(no username)'}</p>
                    <p className="text-sm text-gray-400">{selectedUser.email}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${selectedActiveEntitlement ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-gray-300'}`}>
                    {selectedActiveEntitlement ? `Premium until ${formatDate(selectedActiveEntitlement.expires_at)}` : 'No active Premium'}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-gray-400">Grant duration (days)
                    <Input value={grantDays} onChange={(event) => setGrantDays(event.target.value)} type="number" min="1" max="3650" step="1" className="mt-1 border-white/10 bg-slate-950 text-white" disabled={grantWithoutExpiry} />
                  </label>
                  <label className="text-xs text-gray-400">Or choose exact expiry
                    <Input value={grantExpiry} onChange={(event) => setGrantExpiry(event.target.value)} type="datetime-local" className="mt-1 border-white/10 bg-slate-950 text-white" disabled={grantWithoutExpiry} />
                  </label>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={grantWithoutExpiry} onChange={(event) => setGrantWithoutExpiry(event.target.checked)} className="h-4 w-4 accent-orange-500" />
                  Grant without an expiry date
                </label>
                <label className="mt-3 block text-xs text-gray-400">Internal note (optional)
                  <Input value={grantNote} onChange={(event) => setGrantNote(event.target.value)} placeholder="Reason for the manual grant" className="mt-1 border-white/10 bg-slate-950 text-white placeholder:text-gray-500" />
                </label>
                <Button onClick={() => void grantPremium()} disabled={saving === 'grant'} className="mt-4 w-full bg-orange-500 text-white hover:bg-orange-600">
                  <UserCheck size={16} className="mr-2" /> {saving === 'grant' ? 'Granting…' : 'Grant Premium manually'}
                </Button>

                <div className="mt-5 space-y-2">
                  <p className="text-sm font-semibold text-white">Entitlement history</p>
                  {selectedEntitlements.length === 0 && <p className="text-sm text-gray-500">No entitlement records for this user.</p>}
                  {selectedEntitlements.map((entitlement) => (
                    <div key={entitlement.id} className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`text-xs font-semibold ${entitlement.status === 'active' && isEntitlementCurrentlyActive(entitlement) ? 'text-emerald-300' : entitlement.status === 'revoked' ? 'text-red-300' : 'text-gray-400'}`}>
                          {entitlement.status === 'revoked' ? 'REVOKED' : isEntitlementCurrentlyActive(entitlement) ? 'ACTIVE' : 'EXPIRED'} · {entitlement.source.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">Started {formatDate(entitlement.starts_at)}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">Expires: {formatDate(entitlement.expires_at)}</p>
                      {entitlement.note && <p className="mt-1 text-xs text-gray-500">Note: {entitlement.note}</p>}
                      {entitlement.status === 'active' && (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <label className="text-[11px] text-gray-500">Set expiry
                            <Input
                              type="datetime-local"
                              defaultValue={toDateTimeLocal(entitlement.expires_at)}
                              onBlur={(event) => { if (event.target.value) void expireEntitlement(entitlement, event.target.value); }}
                              className="mt-1 h-8 border-white/10 bg-slate-900 text-xs text-white"
                              disabled={saving === `expiry:${entitlement.id}`}
                            />
                          </label>
                          <Button onClick={() => void revokeEntitlement(entitlement)} disabled={saving === `revoke:${entitlement.id}`} variant="outline" className="h-8 border-red-400/30 px-3 text-xs text-red-300 hover:bg-red-500/10">
                            Revoke now
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 sm:p-6">
        <h3 className="text-lg font-bold text-white">Recent Premium audit activity</h3>
        <p className="mt-1 text-sm text-gray-400">This is an append-only record of setting, feature, plan, entitlement, and payment-ledger mutations.</p>
        <div className="mt-4 space-y-2">
          {auditLog.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-800/60 p-3 text-sm">
              <div>
                <span className="font-semibold text-white">{entry.action.toUpperCase()}</span>
                <span className="ml-2 text-gray-300">{entry.entity_type}</span>
                {entry.target_user_id && <span className="ml-2 text-gray-500">for {users.find((candidate) => candidate.id === entry.target_user_id)?.email || entry.target_user_id.slice(0, 8)}</span>}
              </div>
              <span className="text-xs text-gray-500">{formatDate(entry.created_at)}</span>
            </div>
          ))}
          {auditLog.length === 0 && <p className="py-4 text-sm text-gray-500">No Premium changes have been recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
