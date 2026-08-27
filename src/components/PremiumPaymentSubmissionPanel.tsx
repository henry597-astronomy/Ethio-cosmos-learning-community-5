import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileImage, FileText, Loader2, Paperclip, Send, ShieldCheck, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { useAuth } from '@/context/AuthContext';
import { usePremium } from '@/context/usePremium';
import { supabase } from '@/supabase';
import { toast } from 'sonner';

const MAX_PROOF_SIZE = 10 * 1024 * 1024;
const ACCEPTED_PROOF_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const PROOF_EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const PROOF_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

const getProofMimeType = (file: File) => {
  if (ACCEPTED_PROOF_TYPES.has(file.type)) return file.type;
  const extension = file.name.toLowerCase().split('.').pop() || '';
  return PROOF_MIME_BY_EXTENSION[extension] || null;
};

type ActivePlan = {
  key: string;
  name: string;
  description: string;
  price_birr: number;
  duration_days: number;
};

type PaymentSubmission = {
  id: string;
  plan_key: string | null;
  plan_name: string;
  amount_birr: number | string;
  payment_method: string;
  transaction_reference: string;
  user_note: string;
  proof_mime_type: string | null;
  proof_size_bytes: number | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  admin_note: string;
  created_at: string;
};

const makeId = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `submission-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

const formatDate = (value: string, language: string) => new Intl.DateTimeFormat(
  language === 'am' ? 'am-ET' : 'en-US',
  { dateStyle: 'medium', timeStyle: 'short' },
).format(new Date(value));

const formatAmount = (value: number | string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
};

const statusIcon = (status: PaymentSubmission['status']) => {
  if (status === 'approved') return <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />;
  if (status === 'rejected') return <XCircle className="h-4 w-4 text-red-300" aria-hidden="true" />;
  return <Clock3 className="h-4 w-4 text-amber-300" aria-hidden="true" />;
};

export default function PremiumPaymentSubmissionPanel() {
  const { t, language } = useAppLanguage();
  const { user } = useAuth();
  const { hasManualPaymentDetails } = usePremium();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<ActivePlan[]>([]);
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [userNote, setUserNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofMimeType, setProofMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadSubmissionData = useCallback(async () => {
    if (!user?.id || !hasManualPaymentDetails) {
      setPlans([]);
      setSubmissions([]);
      return;
    }

    setLoading(true);
    try {
      const [plansResult, submissionsResult] = await Promise.all([
        supabase
          .from('premium_plans')
          .select('key, name, description, price_birr, duration_days')
          .eq('is_active', true)
          .order('name')
          .limit(20),
        supabase
          .from('premium_payment_submissions')
          .select('id, plan_key, plan_name, amount_birr, payment_method, transaction_reference, user_note, proof_mime_type, proof_size_bytes, status, reviewed_at, admin_note, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (plansResult.error) throw plansResult.error;
      if (submissionsResult.error) throw submissionsResult.error;

      const nextPlans = (plansResult.data || []).map((plan) => ({
        ...plan,
        price_birr: Number(plan.price_birr) || 0,
        duration_days: Number(plan.duration_days) || 0,
      })) as ActivePlan[];
      setPlans(nextPlans);
      setSubmissions((submissionsResult.data || []) as PaymentSubmission[]);
      if (!selectedPlanKey && nextPlans.length === 1) {
        setSelectedPlanKey(nextPlans[0].key);
        if (Number(nextPlans[0].price_birr) > 0) setAmount(String(nextPlans[0].price_birr));
      }
    } catch (error) {
      console.warn('Could not load Premium payment submissions:', error);
      toast.error(t('paymentSubmissionLoadError'));
    } finally {
      setLoading(false);
    }
  }, [hasManualPaymentDetails, selectedPlanKey, t, user?.id]);

  useEffect(() => {
    void loadSubmissionData();
  }, [loadSubmissionData]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.key === selectedPlanKey) || null,
    [plans, selectedPlanKey],
  );
  const pendingSubmission = useMemo(
    () => submissions.find((submission) => submission.status === 'pending') || null,
    [submissions],
  );

  const handlePlanChange = (nextKey: string) => {
    setSelectedPlanKey(nextKey);
    const nextPlan = plans.find((plan) => plan.key === nextKey);
    if (nextPlan && nextPlan.price_birr > 0) setAmount(String(nextPlan.price_birr));
  };

  const handleProofChange = (file: File | null) => {
    if (!file) {
      setProofFile(null);
      setProofMimeType(null);
      return;
    }
    const mimeType = getProofMimeType(file);
    if (!mimeType) {
      toast.error(t('paymentSubmissionProofTypeError'));
      return;
    }
    if (file.size <= 0 || file.size > MAX_PROOF_SIZE) {
      toast.error(t('paymentSubmissionProofSizeError'));
      return;
    }
    setProofFile(file);
    setProofMimeType(mimeType);
  };

  const resetForm = () => {
    setAmount(selectedPlan && selectedPlan.price_birr > 0 ? String(selectedPlan.price_birr) : '');
    setPaymentMethod('');
    setTransactionReference('');
    setUserNote('');
    setProofFile(null);
    setProofMimeType(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) {
      navigate('/login');
      return;
    }
    if (pendingSubmission) {
      toast.info(t('paymentSubmissionAlreadyPending'));
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(t('paymentSubmissionAmountError'));
      return;
    }
    const method = paymentMethod.trim();
    const reference = transactionReference.trim();
    const note = userNote.trim();
    if (!method || !reference) {
      toast.error(t('paymentSubmissionRequiredError'));
      return;
    }
    if (method.length > 80 || reference.length > 160 || note.length > 1200) {
      toast.error(t('paymentSubmissionLengthError'));
      return;
    }
    if (/\b(pin|password|otp|cvv|cvc|card(?: number)?|api[ -]?key|secret)\b/i.test(`${method} ${reference} ${note}`)) {
      toast.error(t('paymentSubmissionNoSecrets'));
      return;
    }
    if (proofFile && (!proofMimeType || !ACCEPTED_PROOF_TYPES.has(proofMimeType) || proofFile.size > MAX_PROOF_SIZE)) {
      toast.error(t('paymentSubmissionProofSizeError'));
      return;
    }

    setSubmitting(true);
    let proofPath: string | null = null;
    let submissionId: string | null = null;
    let submissionCreated = false;
    try {
      submissionId = makeId();
      if (proofFile) {
        const extension = PROOF_EXTENSION_BY_TYPE[proofMimeType || ''];
        proofPath = `${user.id}/${submissionId}-${makeId()}.${extension}`;
      }

      if (proofFile && proofPath) {
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(proofPath, proofFile, {
            cacheControl: '3600',
            contentType: proofMimeType || undefined,
            upsert: false,
          });
        if (uploadError) throw uploadError;
      }

      const { error: insertError } = await supabase
        .from('premium_payment_submissions')
        .insert({
          id: submissionId,
          user_id: user.id,
          plan_key: selectedPlan?.key || null,
          plan_name: selectedPlan?.name || 'Premium access',
          amount_birr: parsedAmount,
          payment_method: method,
          transaction_reference: reference,
          user_note: note,
          proof_path: proofPath,
          proof_mime_type: proofMimeType,

          proof_size_bytes: proofFile?.size || null,
        });
      if (insertError) throw insertError;
      submissionCreated = true;

      toast.success(t('paymentSubmissionSubmitted'));
      resetForm();
      await loadSubmissionData();
    } catch (error) {
      if (proofPath && !submissionCreated) {
        await supabase.storage.from('payment-proofs').remove([proofPath]).catch(() => undefined);
      }
      console.error('Could not submit Premium payment evidence:', error);
      toast.error(error instanceof Error && error.message.includes('duplicate')
        ? t('paymentSubmissionAlreadyPending')
        : t('paymentSubmissionError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasManualPaymentDetails) return null;

  if (!user) {
    return (
      <section className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-4 text-violet-50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-violet-100">{t('paymentSubmissionTitle')}</h2>
            <p className="mt-1 text-sm leading-6 text-violet-100/80">{t('paymentSubmissionRequiresSignIn')}</p>
            <Button type="button" onClick={() => navigate('/login')} className="mt-3 bg-violet-500 text-white hover:bg-violet-600">
              {t('paymentSubmissionSignIn')}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-4 text-violet-50" aria-labelledby="payment-submission-title">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-violet-500/20 p-2 text-violet-200"><Paperclip className="h-5 w-5" aria-hidden="true" /></div>
        <div className="min-w-0">
          <h2 id="payment-submission-title" className="font-semibold text-violet-100">{t('paymentSubmissionTitle')}</h2>
          <p className="mt-1 text-sm leading-6 text-violet-100/80">{t('paymentSubmissionDescription')}</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-violet-300/20 bg-slate-950/30 p-3 text-xs leading-5 text-violet-100/80">
        {t('paymentSubmissionNoSecrets')}
      </div>

      {pendingSubmission && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/25 bg-amber-500/10 p-3 text-sm text-amber-100">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{t('paymentSubmissionAlreadyPending')}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {plans.length > 0 && (
          <label className="block text-xs text-violet-100/80">
            {t('paymentSubmissionPlanLabel')}
            <select
              value={selectedPlanKey}
              onChange={(event) => handlePlanChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-violet-300/20 bg-slate-950 px-3 text-sm text-white outline-none focus:border-violet-300"
              disabled={submitting || Boolean(pendingSubmission)}
            >
              <option value="">{t('paymentSubmissionNoPlan')}</option>
              {plans.map((plan) => (
                <option key={plan.key} value={plan.key}>
                  {plan.name} — {formatAmount(plan.price_birr)} ETB / {plan.duration_days} days
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-violet-100/80">
            {t('paymentSubmissionAmountLabel')}
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={submitting || Boolean(pendingSubmission)} className="mt-1 border-violet-300/20 bg-slate-950 text-white placeholder:text-slate-500" placeholder="0.00" />
          </label>
          <label className="block text-xs text-violet-100/80">
            {t('paymentSubmissionMethodLabel')}
            <Input maxLength={80} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={submitting || Boolean(pendingSubmission)} className="mt-1 border-violet-300/20 bg-slate-950 text-white placeholder:text-slate-500" placeholder="CBE or telebirr" />
          </label>
        </div>

        <label className="block text-xs text-violet-100/80">
          {t('paymentSubmissionReferenceLabel')}
          <Input maxLength={160} value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} disabled={submitting || Boolean(pendingSubmission)} className="mt-1 border-violet-300/20 bg-slate-950 text-white placeholder:text-slate-500" placeholder="Transaction/reference number" />
        </label>

        <label className="block text-xs text-violet-100/80">
          {t('paymentSubmissionNoteLabel')}
          <Textarea maxLength={1200} rows={3} value={userNote} onChange={(event) => setUserNote(event.target.value)} disabled={submitting || Boolean(pendingSubmission)} className="mt-1 border-violet-300/20 bg-slate-950 text-sm text-white placeholder:text-slate-500" placeholder={t('paymentSubmissionNotePlaceholder')} />
        </label>

        <label className="block text-xs text-violet-100/80">
          {t('paymentSubmissionProofLabel')}
          <Input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => handleProofChange(event.target.files?.[0] || null)} disabled={submitting || Boolean(pendingSubmission)} className="mt-1 border-violet-300/20 bg-slate-950 text-xs text-white file:mr-3 file:rounded file:border-0 file:bg-violet-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
          <span className="mt-1 block text-[11px] leading-5 text-violet-100/60">{t('paymentSubmissionProofHint')}</span>
        </label>

        {proofFile && (
          <div className="flex items-center gap-2 rounded-lg border border-violet-300/20 bg-slate-950/30 p-2 text-xs text-violet-100">
            {proofMimeType === 'application/pdf' ? <FileText className="h-4 w-4 shrink-0" aria-hidden="true" /> : <FileImage className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span className="min-w-0 truncate">{proofFile.name}</span>
            <span className="shrink-0 text-violet-100/60">{Math.ceil(proofFile.size / 1024)} KB</span>
          </div>
        )}

        <Button type="submit" disabled={submitting || loading || Boolean(pendingSubmission)} className="w-full bg-violet-500 text-white hover:bg-violet-600">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="mr-2 h-4 w-4" aria-hidden="true" />}
          {submitting ? t('paymentSubmissionSending') : t('paymentSubmissionSend')}
        </Button>
      </form>

      <div className="mt-5 border-t border-violet-300/15 pt-4">
        <h3 className="text-sm font-semibold text-violet-100">{t('paymentSubmissionStatus')}</h3>
        {loading ? (
          <p className="mt-2 text-xs text-violet-100/70">{t('loading')}</p>
        ) : submissions.length === 0 ? (
          <p className="mt-2 text-xs text-violet-100/70">{t('paymentSubmissionNoSubmissions')}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {submissions.map((submission) => (
              <article key={submission.id} className="rounded-lg border border-violet-300/15 bg-slate-950/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-violet-100">
                    {statusIcon(submission.status)}
                    {submission.status === 'pending' ? t('paymentSubmissionPending') : submission.status === 'approved' ? t('paymentSubmissionApproved') : t('paymentSubmissionRejected')}
                  </span>
                  <span className="text-violet-100/60">{formatDate(submission.created_at, language)}</span>
                </div>
                <p className="mt-2 text-xs text-violet-100/80">{submission.plan_name} · {formatAmount(submission.amount_birr)} ETB · {submission.payment_method}</p>
                {submission.proof_mime_type && <p className="mt-1 text-[11px] text-violet-100/60">{t('paymentSubmissionProofAttached')}</p>}
                {submission.admin_note && <p className="mt-2 whitespace-pre-wrap rounded-md border border-violet-300/10 bg-violet-500/5 p-2 text-xs leading-5 text-violet-100/80">{submission.admin_note}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
