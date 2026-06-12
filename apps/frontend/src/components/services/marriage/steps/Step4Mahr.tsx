'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { WizardFormData } from '../MarriageWizard';

const schema = z.object({
  mahrAmount: z.coerce.number().min(0, 'Must be a positive number').optional(),
  mahrDescription: z.string().optional(),
  requestedOfficiant: z.string().trim().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  initialData: Partial<WizardFormData>;
  onNext: (data: Partial<WizardFormData>) => void;
  onBack: () => void;
}

export function Step4Mahr({ initialData, onNext, onBack }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      mahrAmount: initialData.mahrAmount,
      mahrDescription: initialData.mahrDescription ?? '',
      requestedOfficiant: initialData.requestedOfficiant ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      {/* Mahr */}
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">Mahr (Dowry)</p>
        <p className="text-xs text-gray-400 mb-4">
          The Mahr is an obligatory gift from the groom to the bride — it can be money, property, or any agreed item.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Amount (RWF)"
            type="number"
            min="0"
            placeholder="e.g. 500,000"
            error={errors.mahrAmount?.message}
            {...register('mahrAmount')}
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-colors resize-none"
              rows={3}
              placeholder="Full mahr agreement — e.g. '500,000 RWF + 1 cow, to be paid upon marriage'"
              {...register('mahrDescription')}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-200" />

      {/* Officiant */}
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">Preferred Officiant <span className="text-gray-300 normal-case font-normal">(optional)</span></p>
        <Input
          label="Imam or Sheikh name"
          placeholder="Leave blank to let RMC assign"
          error={errors.requestedOfficiant?.message}
          {...register('requestedOfficiant')}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={onBack}>
          Back
        </Button>
        <Button
          type="submit"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="!bg-rose-600 hover:!bg-rose-700 !text-white !shadow-none"
        >
          Continue
        </Button>
      </div>
    </form>
  );
}
