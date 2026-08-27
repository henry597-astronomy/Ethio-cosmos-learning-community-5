import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Eye, FileImage, FileText, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/supabase';
import { toast } from 'sonner';

type ReviewStatus = 'all' | 'pending' | 'approved' | 'rejected';

type PaymentSubmission = {
  id: string;
  user_id: string;
  plan_key: string | null;
  plan_name: string;
  amount_birr: number | string;
  payment_method: string;
  transaction_reference: string;
  user_note: string;
  proof_path: string | null;
  proof_mime_type: string | null;
  proof_size_bytes: number | null;
  status: Exclude<ReviewStatus, 'all'>;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string;
  created_at: string;
};

type UserSummary = {
  id: string;
  email: string | null;
  username: string | null;
};

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

const formatAmount = (value: number | string) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
};

const statusLabel = (status: PaymentSubmission['status']) => (
  status === 'pending' ? 'Pending review' : status === 'approved' ? 'Approved' : 'Rejected'
);

export default function PremiumPaymentAdminPanel() {
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [users, setUsers] = useState<Record<string, UserSummary>>({});
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>('pending');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loadingProofId, setLoadingProofId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: submissionsError } = await supabase
        .from('premium_payment_submissions')
        .select('id, user_id, plan_key, plan_name, amount_birr, payment_method, transaction_reference, user_note, proof_path, proof_mime_type, proof_size_bytes, status, reviewed_by, reviewed_at, admin_note, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (submissionsError) throw submissionsError;

      const nextSubmissions = (data || []) as PaymentSubmission[];
      setSubmissions(nextSubmissions);
      setReviewNotes((current) => {
        const next = { ...current };
        nextSubmissions.forEach((submission) => {
          if (next[submission.id] === undefined) next[submission.id] = submission.admin_note || '';
        });
        return next;
      });

      const userIds = [...new Set(nextSubmissions.map((submission) => submission.user_id))];
      if (userIds.length === 0) {
        setUsers({});
        return;
      }
      const { data: userData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, username')
        .in('id', userIds)
        .limit(200);
      if (usersError) throw usersError;
      setUsers(Object.fromEntries(((userData || []) as UserSummary[]).map((user) => [user.id, user])));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load payment submissions.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const filteredSubmissions = useMemo(
    () => statusFilter === 'all' ? submissions : submissions.filter((submission) => submission.status === statusFilter),
    [statusFilter, submissions],
  );
  const pendingCount = submissions.filter((submission) => submission.status === 'pending').length;

  const reviewSubmission = async (submission: PaymentSubmission, status: Exclude<ReviewStatus, 'all'>) => {
    if (submission.status !== 'pending') return;
    setSavingId(submission.id);
    const { error: reviewError } = await supabase.rpc('review_premium_payment_submission', {
      p_submission_id: submission.id,
      p_status: status,
      p_admin_note: (reviewNotes[submission.id] || '').trim(),
    });
    setSavingId(null);
    if (reviewError) {
      toast.error(`Could not review submission: ${reviewError.message}`);
      return;
    }
    toast.success(status === 'approved' ? 'Payment approved and Premium access granted.' : 'Payment evidence rejected.');
    await loadSubmissions();
  };

  const syncApprovedSubmission = async (submission: PaymentSubmission) => {
    if (submission.status !== 'approved') return;
    setSavingId(submission.id);
    const { error: syncError } = await supabase.rpc('sync_approved_premium_payment_submission', {
      p_submission_id: submission.id,
    });
    setSavingId(null);
    if (syncError) {
      toast.error(`Could not sync Premium access: ${syncError.message}`);
      return;
    }
    toast.success('Premium access is synchronized for this approved payment.');
    await loadSubmissions();
  };

  const loadProof = async (submission: PaymentSubmission) => {
    if (!submission.proof_path || proofUrls[submission.id]) return;
    setLoadingProofId(submission.id);
    const { data, error: proofError } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(submission.proof_path, 10 * 60);
    setLoadingProofId(null);
    if (proofError || !data?.signedUrl) {
      toast.error(`Could not open proof: ${proofError?.message || 'No signed URL returned.'}`);
      return;
    }
    setProofUrls((current) => ({ ...current, [submission.id]: data.signedUrl }));
  };

  if (loading) {
    return <div className="rounded-xl border border-white/10 bg-slate-900/50 p-6 text-gray-300">Loading payment submissions…</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-950/20 p-6 text-red-200">
        <p className="font-semibold">Payment submissions could not be loaded.</p>
        <p className="mt-1 text-sm text-red-300">{error}</p>
        <Button onClick={() => void loadSubmissions()} className="mt-4 bg-orange-500 text-white hover:bg-orange-600">Try again</Button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <section className="rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-slate-900/70 to-slate-950/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/15 p-3 text-violet-300"><ShieldCheck size={24} aria-hidden="true" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">Payment submissions</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-300">Review payment references and private proof files submitted by users. Approving verified evidence grants the selected Premium plan through the existing Admin-only entitlement path; legacy approved records can be synchronized safely.</p>
            </div>
          </div>
          <Button onClick={() => void loadSubmissions()} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw size={15} className="mr-2" /> Refresh
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(['pending', 'all', 'approved', 'rejected'] as ReviewStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${statusFilter === status ? 'border-violet-300 bg-violet-500/20 text-violet-100' : 'border-white/10 text-gray-400 hover:border-white/25 hover:text-white'}`}
            >
              {status === 'pending' ? `Pending (${pendingCount})` : status === 'all' ? `All (${submissions.length})` : `${statusLabel(status)} (${submissions.filter((submission) => submission.status === status).length})`}
            </button>
          ))}
        </div>
      </section>

      {filteredSubmissions.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-8 text-center text-sm text-gray-400">No payment submissions in this view.</div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((submission) => {
            const submitter = users[submission.user_id];
            const proofIsPdf = submission.proof_mime_type === 'application/pdf';
            const isPending = submission.status === 'pending';
            return (
              <article key={submission.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4 shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${submission.status === 'pending' ? 'bg-amber-500/15 text-amber-200' : submission.status === 'approved' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>
                        {submission.status === 'pending' ? <Clock3 size={13} aria-hidden="true" /> : submission.status === 'approved' ? <CheckCircle2 size={13} aria-hidden="true" /> : <XCircle size={13} aria-hidden="true" />}
                        {statusLabel(submission.status)}
                      </span>
                      <span className="text-xs text-gray-500">Submitted {formatDate(submission.created_at)}</span>
                    </div>
                    <h3 className="mt-2 truncate text-base font-semibold text-white">{submitter?.username || submitter?.email || 'Unknown user'}</h3>
                    <p className="truncate text-xs text-gray-400">{submitter?.email || `User ID: ${submission.user_id}`}</p>
                  </div>
                  <div className="text-right text-sm text-white">
                    <p className="font-semibold">{formatAmount(submission.amount_birr)} ETB</p>
                    <p className="text-xs text-gray-400">{submission.plan_name}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Payment method</p>
                    <p className="mt-1 text-gray-200">{submission.payment_method}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Transaction reference</p>
                    <p className="mt-1 break-words font-mono text-xs text-gray-200">{submission.transaction_reference}</p>
                  </div>
                </div>

                {submission.user_note && <p className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-slate-950/40 p-3 text-sm leading-6 text-gray-300">{submission.user_note}</p>}

                {submission.proof_path && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-violet-300/20 bg-violet-500/5 p-3">
                    {proofIsPdf ? <FileText size={17} className="text-violet-300" aria-hidden="true" /> : <FileImage size={17} className="text-violet-300" aria-hidden="true" />}
                    <span className="text-xs text-violet-100">Private proof attached{submission.proof_size_bytes ? ` · ${Math.ceil(submission.proof_size_bytes / 1024)} KB` : ''}</span>
                    {!proofUrls[submission.id] ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => void loadProof(submission)} disabled={loadingProofId === submission.id} className="ml-auto h-8 border-violet-300/30 text-xs text-violet-100 hover:bg-violet-500/10">
                        <Eye size={14} className="mr-1.5" /> {loadingProofId === submission.id ? 'Preparing…' : 'Prepare secure view'}
                      </Button>
                    ) : (
                      <a href={proofUrls[submission.id]} target="_blank" rel="noreferrer" className="ml-auto inline-flex h-8 items-center rounded-md border border-violet-300/30 px-2.5 text-xs font-semibold text-violet-100 hover:bg-violet-500/10">
                        <Eye size={14} className="mr-1.5" /> Open proof
                      </a>
                    )}
                  </div>
                )}

                {isPending ? (
                  <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/40 p-3">
                    <label className="block text-xs font-semibold text-gray-300">Admin review note (optional)
                      <Textarea maxLength={1200} rows={2} value={reviewNotes[submission.id] || ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [submission.id]: event.target.value }))} placeholder="Record what was verified or why the evidence was rejected." className="mt-1 border-white/10 bg-slate-900 text-sm text-white placeholder:text-gray-500" />
                    </label>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => void reviewSubmission(submission, 'rejected')} disabled={savingId === submission.id} className="border-red-400/30 text-red-200 hover:bg-red-500/10">
                        <XCircle size={15} className="mr-1.5" /> Reject
                      </Button>
                      <Button type="button" onClick={() => void reviewSubmission(submission, 'approved')} disabled={savingId === submission.id} className="bg-emerald-600 text-white hover:bg-emerald-700">
                        <CheckCircle2 size={15} className="mr-1.5" /> Approve evidence
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/40 p-3 text-xs text-gray-400">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>Reviewed {formatDate(submission.reviewed_at)}</span>
                      {submission.status === 'approved' && (
                        <Button type="button" size="sm" variant="outline" onClick={() => void syncApprovedSubmission(submission)} disabled={savingId === submission.id} className="h-8 border-emerald-300/30 text-xs text-emerald-200 hover:bg-emerald-500/10">
                          {savingId === submission.id ? 'Syncing…' : 'Sync Premium access'}
                        </Button>
                      )}
                    </div>
                    {submission.admin_note ? <span className="mt-1 block whitespace-pre-wrap text-gray-300">{submission.admin_note}</span> : null}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
