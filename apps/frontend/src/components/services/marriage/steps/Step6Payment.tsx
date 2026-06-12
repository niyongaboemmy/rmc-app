'use client';

import { useState } from 'react';
import { Smartphone, Landmark, Banknote, ArrowLeft, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { WizardFormData } from '../MarriageWizard';
import { PaymentMethod } from '@/lib/marriageApi';

const MOSQUE_FEE = 30000;
const OUTSIDE_FEE = 200000;

interface PaymentCardProps {
  value: PaymentMethod;
  selected: boolean;
  onSelect: (v: PaymentMethod) => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  instructions?: React.ReactNode;
}

function PaymentCard({ value, selected, onSelect, icon, title, subtitle, instructions }: PaymentCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border-2 overflow-hidden transition-all duration-200 cursor-pointer',
        selected ? 'border-rose-500' : 'border-gray-200 hover:border-gray-300',
      )}
      onClick={() => onSelect(value)}
    >
      <div className={cn('flex items-center gap-3 px-4 py-3.5', selected && 'bg-rose-50/60')}>
        <span className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
          selected ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-500',
        )}>
          {icon}
        </span>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{title}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
          selected ? 'border-rose-500 bg-rose-500' : 'border-gray-300',
        )}>
          {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
      </div>
      {selected && instructions && (
        <div className="border-t border-rose-100 px-4 py-3 bg-white text-sm">
          {instructions}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
      <p className="text-sm font-medium text-gray-900 flex-1">{value}</p>
    </div>
  );
}

interface Props {
  formData: Partial<WizardFormData>;
  onBack: () => void;
  onSubmit: (data: Partial<WizardFormData>) => void;
  isSubmitting: boolean;
}

export function Step6Payment({ formData, onBack, onSubmit, isSubmitting }: Props) {
  const [payment, setPayment] = useState<PaymentMethod | undefined>(formData.paymentMethod);

  const fee = formData.venueType === 'mosque' ? MOSQUE_FEE : OUTSIDE_FEE;
  const feeFormatted = fee.toLocaleString() + ' RWF';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;
    onSubmit({ paymentMethod: payment });
  };

  const provinceLabels: Record<string, string> = {
    kigali: 'Kigali City', north: 'Northern Province', south: 'Southern Province',
    east: 'Eastern Province', west: 'Western Province',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Two-column layout on sm+: summary left, payment right */}
      <div className="grid sm:grid-cols-2 gap-5 items-start">
        {/* Left: Summary + Fee */}
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2">Summary</p>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 divide-y divide-gray-100">
              <ReviewRow label="Couple" value={`${formData.groomName} & ${formData.brideName}`} />
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
              {formData.mahrAmount != null && (
                <ReviewRow label="Mahr" value={`${Number(formData.mahrAmount).toLocaleString()} RWF`} />
              )}
            </div>
          </div>

          {/* Fee */}
          <div className="rounded-xl bg-gray-900 px-4 py-4">
            <p className="text-xs text-gray-400 mb-0.5">Service fee</p>
            <p className="text-2xl font-bold text-white">{feeFormatted}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {formData.venueType === 'mosque' ? 'Mosque rate' : 'Outside mosque rate'}
            </p>
          </div>
        </div>

        {/* Right: Payment method */}
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-2">
            Payment method <span className="text-rose-500">*</span>
          </p>
          <div className="space-y-2">
            <PaymentCard
              value="momo"
              selected={payment === 'momo'}
              onSelect={setPayment}
              icon={<Smartphone className="w-4 h-4" />}
              title="Mobile Money"
              subtitle="MTN MoMo or Airtel"
              instructions={
                <div className="space-y-1 text-xs text-gray-600">
                  <p>Dial <strong>*182#</strong> → Pay Bills → RMC Services</p>
                  <p>Amount: <strong>{feeFormatted}</strong></p>
                  <p className="text-gray-400">Reference: your application number</p>
                </div>
              }
            />
            <PaymentCard
              value="bank"
              selected={payment === 'bank'}
              onSelect={setPayment}
              icon={<Landmark className="w-4 h-4" />}
              title="Bank Transfer"
              subtitle="Bank of Kigali"
              instructions={
                <div className="space-y-0.5 text-xs text-gray-600">
                  <p><strong>Acc:</strong> 00012-345678-01 · Rwanda Muslim Community</p>
                  <p><strong>Amount:</strong> {feeFormatted} · <strong>Ref:</strong> application number</p>
                  <p className="text-gray-400 mt-1">Confirmed in 1–2 business days</p>
                </div>
              }
            />
            <PaymentCard
              value="cash"
              selected={payment === 'cash'}
              onSelect={setPayment}
              icon={<Banknote className="w-4 h-4" />}
              title="Cash at Office"
              subtitle="Mon–Fri, 8:00 AM – 5:00 PM"
              instructions={
                <p className="text-xs text-gray-600">
                  Bring your application number and pay <strong>{feeFormatted}</strong> at the desk.
                </p>
              }
            />
          </div>
          {!payment && (
            <p className="mt-2 text-xs text-gray-400">Select a payment method to continue.</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button
          type="submit"
          disabled={!payment || isSubmitting}
          isLoading={isSubmitting}
          rightIcon={<Send className="w-4 h-4" />}
          className="!bg-rose-600 hover:!bg-rose-700 !text-white !shadow-none disabled:opacity-40"
        >
          Submit Application
        </Button>
      </div>
    </form>
  );
}
