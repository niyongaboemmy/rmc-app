'use client';

import { useState } from 'react';
import { Smartphone, Landmark, Banknote, ArrowLeft, CreditCard, Check, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { WizardFormData } from '../MarriageWizard';
import { PaymentMethod, MarriageFees } from '@/lib/marriageApi';

const MOSQUE_FEE_FALLBACK = 30000;
const OUTSIDE_FEE_FALLBACK = 200000;

interface FeeTierCardProps {
  label: string;
  description: string;
  amount: number;
  selected: boolean;
  onSelect: () => void;
}

function FeeTierCard({ label, description, amount, selected, onSelect }: FeeTierCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 flex items-center gap-4',
        selected ? 'border-rose-500 bg-rose-50/60' : 'border-gray-200 hover:border-gray-300 bg-white',
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
        selected ? 'border-rose-500 bg-rose-500' : 'border-gray-300',
      )}>
        {selected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn('font-bold text-lg', selected ? 'text-rose-600' : 'text-gray-800')}>
          {amount.toLocaleString()}
        </p>
        <p className="text-[10px] text-gray-400 font-medium">RWF</p>
      </div>
    </div>
  );
}

interface PaymentMethodCardProps {
  value: PaymentMethod;
  selected: boolean;
  onSelect: (v: PaymentMethod) => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
  children?: React.ReactNode;
}

function PaymentMethodCard({ value, selected, onSelect, icon, title, subtitle, badge, disabled, disabledReason, children }: PaymentMethodCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border-2 overflow-hidden transition-all duration-200',
        disabled
          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
          : selected
            ? 'border-rose-500 cursor-pointer'
            : 'border-gray-200 hover:border-gray-300 cursor-pointer',
      )}
      onClick={() => { if (!disabled) onSelect(value); }}
    >
      <div className={cn('flex items-center gap-3 px-4 py-3.5', selected && !disabled && 'bg-rose-50/40')}>
        <span className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
          disabled ? 'bg-gray-100 text-gray-300' : selected ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-500',
        )}>
          {icon}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('font-semibold text-sm', disabled ? 'text-gray-400' : 'text-gray-900')}>{title}</p>
            {badge && !disabled && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 uppercase tracking-wide">
                {badge}
              </span>
            )}
            {disabled && disabledReason && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 uppercase tracking-wide">
                {disabledReason}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
          disabled ? 'border-gray-200' : selected ? 'border-rose-500 bg-rose-500' : 'border-gray-300',
        )}>
          {selected && !disabled && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
      </div>
      {selected && !disabled && children && (
        <div className="border-t border-rose-100 px-4 py-3 bg-white" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">{label}</span>
      <p className="text-sm font-medium text-gray-900 flex-1">{value}</p>
    </div>
  );
}

interface Props {
  formData: Partial<WizardFormData>;
  onBack: () => void;
  onSubmit: (data: Partial<WizardFormData>) => void;
  isSubmitting: boolean;
  fees?: MarriageFees;
}

export function Step6Payment({ formData, onBack, onSubmit, isSubmitting, fees }: Props) {
  const mosqueAmount  = fees?.mosque.amount  ?? MOSQUE_FEE_FALLBACK;
  const outsideAmount = fees?.outside.amount ?? OUTSIDE_FEE_FALLBACK;
  const mosqueLabel   = fees?.mosque.label   ?? 'Mosque Ceremony';
  const outsideLabel  = fees?.outside.label  ?? 'Outside Mosque';
  const mosqueDesc    = fees?.mosque.description  ?? 'Nikah inside the mosque';
  const outsideDesc   = fees?.outside.description ?? 'Nikah outside mosque premises';

  const [selectedFee, setSelectedFee] = useState<'mosque' | 'outside'>(
    formData.venueType === 'mosque' ? 'mosque' : 'outside',
  );
  const [payment, setPayment] = useState<PaymentMethod | undefined>(formData.paymentMethod ?? 'momo');
  const [mobilePhone, setMobilePhone] = useState(formData.mobilePhone ?? '');
  const [phoneError, setPhoneError] = useState('');

  const fee = selectedFee === 'mosque' ? mosqueAmount : outsideAmount;
  const feeFormatted = fee.toLocaleString() + ' RWF';

  const provinceLabels: Record<string, string> = {
    kigali: 'Kigali City', north: 'Northern Province', south: 'Southern Province',
    east: 'Eastern Province', west: 'Western Province',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    if (payment === 'momo') {
      const digits = mobilePhone.replace(/\D/g, '');
      if (digits.length < 9) {
        setPhoneError('Enter a valid Rwandan phone number');
        return;
      }
      setPhoneError('');
    }

    onSubmit({
      paymentMethod: payment,
      mobilePhone: payment === 'momo' ? mobilePhone : undefined,
      // fee tier can update venueType if user changed it here
      venueType: selectedFee,
    });
  };

  const isMomo = payment === 'momo';
  const canSubmit = !!payment && (!isMomo || mobilePhone.replace(/\D/g, '').length >= 9);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5 items-start">
        {/* Left column */}
        <div className="space-y-4">
          {/* Summary */}
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2">Application Summary</p>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 divide-y divide-gray-100">
              <ReviewRow label="Couple" value={`${formData.groomName ?? '—'} & ${formData.brideName ?? '—'}`} />
              <ReviewRow label="Venue" value={formData.venueType === 'mosque' ? 'Mosque' : 'Outside mosque'} />
              {(formData.province || formData.district) && (
                <ReviewRow
                  label="Location"
                  value={[
                    formData.province ? provinceLabels[formData.province] ?? formData.province : null,
                    formData.district,
                  ].filter(Boolean).join(', ')}
                />
              )}
              {formData.preferredDateFrom && (
                <ReviewRow
                  label="Dates"
                  value={[formData.preferredDateFrom, formData.preferredDateTo].filter(Boolean).join(' → ')}
                />
              )}
              {formData.witness1Nid && (
                <ReviewRow
                  label="Witnesses"
                  value={`${formData.witness1Name || 'W1'}, ${formData.witness2Name || 'W2'}`}
                />
              )}
              {formData.waliName && <ReviewRow label="Wali" value={formData.waliName} />}
            </div>
          </div>

          {/* Fee tier selection */}
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2">Service Fee</p>
            <div className="space-y-2">
              <FeeTierCard
                label={mosqueLabel}
                description={mosqueDesc}
                amount={mosqueAmount}
                selected={selectedFee === 'mosque'}
                onSelect={() => setSelectedFee('mosque')}
              />
              <FeeTierCard
                label={outsideLabel}
                description={outsideDesc}
                amount={outsideAmount}
                selected={selectedFee === 'outside'}
                onSelect={() => setSelectedFee('outside')}
              />
            </div>

            <div className="mt-3 rounded-xl bg-gray-900 px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total due</p>
                <p className="text-xl font-bold text-white">{feeFormatted}</p>
              </div>
              <CreditCard className="w-6 h-6 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Right column: payment method */}
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2">
            Payment Method <span className="text-rose-500">*</span>
          </p>
          <div className="space-y-2">
            <PaymentMethodCard
              value="momo"
              selected={payment === 'momo'}
              onSelect={setPayment}
              icon={<Smartphone className="w-4 h-4" />}
              title="Mobile Money"
              subtitle="Pay instantly via MoMo push"
              badge="Instant"
            >
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-1">
                  Enter your MoMo number — you will receive a payment prompt on your phone.
                </p>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={mobilePhone}
                    onChange={(e) => { setMobilePhone(e.target.value); setPhoneError(''); }}
                    placeholder="e.g. 0780 313 448"
                    className={cn(
                      'w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-rose-400',
                      phoneError ? 'border-red-400' : 'border-gray-200',
                    )}
                  />
                </div>
                {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                <p className="text-[10px] text-gray-400">
                  Amount: <strong>{feeFormatted}</strong> · Rwandan numbers only
                </p>
              </div>
            </PaymentMethodCard>

            <PaymentMethodCard
              value="bank"
              selected={payment === 'bank'}
              onSelect={setPayment}
              icon={<Landmark className="w-4 h-4" />}
              title="Bank Transfer"
              subtitle="Bank of Kigali · 1–2 business days"
              disabled
              disabledReason="Coming soon"
            />

            <PaymentMethodCard
              value="cash"
              selected={payment === 'cash'}
              onSelect={setPayment}
              icon={<Banknote className="w-4 h-4" />}
              title="Cash at Office"
              subtitle="Mon–Fri, 8:00 AM – 5:00 PM"
              disabled
              disabledReason="Coming soon"
            />
          </div>

          {!payment && (
            <p className="mt-2 text-xs text-gray-400">Select a payment method to continue.</p>
          )}

          {payment === 'momo' && (
            <div className="mt-3 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-800">
              After clicking "Pay Now", accept the MoMo prompt on your phone. Your application is submitted automatically once payment is confirmed.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="outline"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          isLoading={isSubmitting}
          rightIcon={isMomo ? <Smartphone className="w-4 h-4" /> : undefined}
          className="!bg-rose-600 hover:!bg-rose-700 !text-white !shadow-none disabled:opacity-40"
        >
          {isMomo ? `Pay ${feeFormatted}` : 'Submit Application'}
        </Button>
      </div>
    </form>
  );
}
