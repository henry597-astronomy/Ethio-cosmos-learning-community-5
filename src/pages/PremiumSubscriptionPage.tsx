import { Crown, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { ManualPaymentDetails } from '@/components/PremiumRequiredMessage';
import PremiumPaymentSubmissionPanel from '@/components/PremiumPaymentSubmissionPanel';

export default function PremiumSubscriptionPage() {
  const { t } = useAppLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const featureName = searchParams.get('feature');

  return (
    <div className="min-h-full bg-[#0a0e1a] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-md items-center justify-center">
        <section
          className="w-full rounded-2xl border border-orange-400/30 bg-slate-950/95 p-5 shadow-2xl sm:p-6"
          aria-labelledby="premium-subscription-title"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/15 text-orange-300">
            <Crown className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 id="premium-subscription-title" className="mt-4 text-center text-2xl font-bold">
            {t('premiumSubscriptionTitle')}
          </h1>
          {featureName && (
            <p className="mt-3 text-center text-sm leading-6 text-slate-300">
              {featureName} — {t('premiumRequiredBody')}
            </p>
          )}
          <p className="mt-4 text-center text-sm leading-6 text-slate-300">
            {t('premiumSubscriptionBody')}
          </p>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-500/10 p-3 text-sm leading-6 text-sky-100">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
            <p>{t('premiumManualMode')}</p>
          </div>
          <div className="mt-5">
            <ManualPaymentDetails />
          </div>
          <div className="mt-5">
            <PremiumPaymentSubmissionPanel />
          </div>
          <Button
            type="button"
            onClick={() => navigate(-1)}
            variant="outline"
            className="mt-6 w-full border-slate-600 bg-transparent text-white hover:bg-slate-800"
          >
            {t('backToLearning')}
          </Button>
        </section>
      </div>
    </div>
  );
}

