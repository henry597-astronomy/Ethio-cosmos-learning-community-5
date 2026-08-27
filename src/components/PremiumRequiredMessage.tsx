import { Crown, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useAppLanguage } from '@/context/AppLanguageContext';
import { usePremium } from '@/context/usePremium';

type PremiumRequiredMessageProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
};

type PremiumRequiredScreenProps = {
  featureName?: string;
  onBack?: () => void;
};

export function ManualPaymentDetails() {
  const { t } = useAppLanguage();
  const { manualPayment, hasManualPaymentDetails } = usePremium();

  if (!hasManualPaymentDetails) return null;

  return (
    <div className="space-y-2 rounded-xl border border-orange-400/20 bg-orange-500/10 p-3 text-sm text-orange-50">
      <p className="font-semibold text-orange-200">{t('manualPaymentTitle')}</p>
      <p className="text-xs leading-5 text-orange-100">{t('manualPaymentDescription')}</p>
      <div className="grid gap-1 text-xs text-orange-100">
        <p><span className="font-semibold text-orange-200">{t('manualPaymentMethodLabel')}:</span> {manualPayment.manual_payment_method}</p>
        <p><span className="font-semibold text-orange-200">{t('manualPaymentReceiverLabel')}:</span> {manualPayment.manual_payment_receiver_name}</p>
        <p className="break-words"><span className="font-semibold text-orange-200">{t('manualPaymentAccountLabel')}:</span> {manualPayment.manual_payment_account}</p>
      </div>
      {manualPayment.manual_payment_instructions.trim() && (
        <p className="whitespace-pre-wrap border-t border-orange-300/15 pt-2 text-xs leading-5 text-orange-100">
          {manualPayment.manual_payment_instructions}
        </p>
      )}
      <p className="border-t border-orange-300/15 pt-2 text-xs leading-5 text-orange-100">{t('manualPaymentPending')}</p>
    </div>
  );
}

export function PremiumRequiredDialog({ open, onOpenChange, featureName }: PremiumRequiredMessageProps) {
  const { t } = useAppLanguage();
  const navigate = useNavigate();
  const subscriptionPath = featureName ? `/subscribe?feature=${encodeURIComponent(featureName)}` : '/subscribe';
  const namedDescription = featureName
    ? `${featureName} — ${t('premiumRequiredBody')}`
    : t('premiumRequiredBody');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-orange-400/30 bg-slate-950 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Crown className="h-5 w-5 text-orange-300" />
            {t('premiumRequiredTitle')}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            {namedDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-500/10 p-3 text-sm text-sky-100">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
          <p>{t('premiumManualMode')}</p>
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate(subscriptionPath);
            }}
            className="bg-orange-500 text-white hover:bg-orange-600"
          >
            {t('subscribe')}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600 bg-transparent text-white hover:bg-slate-800">
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PremiumRequiredScreen({ featureName, onBack }: PremiumRequiredScreenProps) {
  const { t } = useAppLanguage();
  const navigate = useNavigate();
  const subscriptionPath = featureName ? `/subscribe?feature=${encodeURIComponent(featureName)}` : '/subscribe';
  const namedDescription = featureName
    ? `${featureName} — ${t('premiumRequiredBody')}`
    : t('premiumRequiredBody');

  return (
    <div className="min-h-screen bg-[#0a0e1a] px-5 py-24 text-white">
      <div className="mx-auto flex min-h-[55vh] max-w-md items-center justify-center">
        <div className="w-full rounded-2xl border border-orange-400/30 bg-slate-950/90 p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/15 text-orange-300">
            <Crown className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">{t('premiumRequiredTitle')}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{namedDescription}</p>
          <p className="mt-4 rounded-xl border border-sky-400/20 bg-sky-500/10 p-3 text-sm leading-6 text-sky-100">
            {t('premiumManualMode')}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button type="button" onClick={() => navigate(subscriptionPath)} className="bg-orange-500 text-white hover:bg-orange-600">
              {t('subscribe')}
            </Button>
            {onBack && (
              <Button type="button" onClick={onBack} variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-slate-800">
                {t('backToLearning')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
