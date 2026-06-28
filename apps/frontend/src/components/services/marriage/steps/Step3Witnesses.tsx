'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { PhoneInput, toE164, toLocalPhone } from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/Button';
import { WizardFormData } from '../MarriageWizard';

interface Props {
  initialData: Partial<WizardFormData>;
  groomNid: string;
  brideNid: string;
  onNext: (data: Partial<WizardFormData>) => void;
  onBack: () => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">{children}</p>
  );
}

export function Step3Witnesses({ initialData, groomNid, brideNid, onNext, onBack }: Props) {
  const nid = z.string().regex(/^\d{16}$/, 'Must be exactly 16 digits');

  const schema = z.object({
    witness1Nid: nid,
    witness1Name: z.string().trim().min(3, 'Min. 3 characters'),
    witness2Nid: nid,
    witness2Name: z.string().trim().min(3, 'Min. 3 characters'),
    waliName: z.string().trim().min(3, 'Min. 3 characters').optional().or(z.literal('')),
    waliNid: nid.optional().or(z.literal('')),
    waliPhone: z.string().regex(/^7[2389]\d{7}$/, 'Enter a valid Rwanda number: 7XXXXXXXX').optional().or(z.literal('')),
  }).superRefine((d, ctx) => {
    if (d.witness1Nid === d.witness2Nid) {
      ctx.addIssue({ code: 'custom', path: ['witness2Nid'], message: 'Witnesses cannot have the same NID' });
    }
    if (d.witness1Nid === groomNid || d.witness1Nid === brideNid) {
      ctx.addIssue({ code: 'custom', path: ['witness1Nid'], message: 'A witness cannot be one of the couple' });
    }
    if (d.witness2Nid === groomNid || d.witness2Nid === brideNid) {
      ctx.addIssue({ code: 'custom', path: ['witness2Nid'], message: 'A witness cannot be one of the couple' });
    }
  });

  type FormData = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      witness1Nid: initialData.witness1Nid ?? '',
      witness1Name: initialData.witness1Name ?? '',
      witness2Nid: initialData.witness2Nid ?? '',
      witness2Name: initialData.witness2Name ?? '',
      waliName: initialData.waliName ?? '',
      waliNid: initialData.waliNid ?? '',
      waliPhone: toLocalPhone(initialData.waliPhone),
    },
  });

  const nidProps = { inputMode: 'numeric' as const, maxLength: 16, placeholder: '16-digit National ID' };

  const handleNext = (data: FormData) =>
    onNext({ ...data, waliPhone: data.waliPhone ? toE164(data.waliPhone) : undefined });

  return (
    <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
      {/* Islamic context note */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-500">
        Both witnesses (Shahidain) must be adult Muslim males. Their identities are verified during the ceremony.
      </div>

      {/* Witnesses side-by-side */}
      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
        <div>
          <SectionLabel>Witness 1</SectionLabel>
          <div className="space-y-4">
            <Input label="National ID" required error={errors.witness1Nid?.message} {...nidProps} {...register('witness1Nid')} />
            <Input label="Full name" required placeholder="Witness full name" error={errors.witness1Name?.message} {...register('witness1Name')} />
          </div>
        </div>
        <div>
          <SectionLabel>Witness 2</SectionLabel>
          <div className="space-y-4">
            <Input label="National ID" required error={errors.witness2Nid?.message} {...nidProps} {...register('witness2Nid')} />
            <Input label="Full name" required placeholder="Witness full name" error={errors.witness2Name?.message} {...register('witness2Name')} />
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-200" />

      {/* Wali */}
      <div>
        <SectionLabel>Wali (Bride&apos;s Guardian)</SectionLabel>
        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Full name"
            placeholder="Guardian's name"
            error={errors.waliName?.message}
            {...register('waliName')}
          />
          <Input
            label="National ID"
            error={errors.waliNid?.message}
            {...nidProps}
            {...register('waliNid')}
          />
          <PhoneInput
            label="Phone number"
            error={errors.waliPhone?.message}
            {...register('waliPhone')}
          />
        </div>
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
