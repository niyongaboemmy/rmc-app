'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { PhoneInput, toE164 } from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/Button';
import { WizardFormData } from '../MarriageWizard';

const nid = z.string().regex(/^\d{16}$/, 'Must be exactly 16 digits');
const fullName = z.string().trim().min(3, 'At least 3 characters required');
const phone = z.string().regex(/^07[2389]\d{7}$/, 'Enter a valid Rwanda number: 07XXXXXXXX');

const schema = z.object({
  groomName: fullName,
  groomNid: nid,
  groomPhone: phone,
  brideName: fullName,
  brideNid: nid,
  bridePhone: phone,
  notificationPhone: phone,
}).refine((d) => d.groomNid !== d.brideNid, {
  message: 'Groom and bride cannot share the same National ID',
  path: ['brideNid'],
});

type FormData = z.infer<typeof schema>;

interface Props {
  initialData: Partial<WizardFormData>;
  onNext: (data: Partial<WizardFormData>) => void;
}

function SectionLabel({ children, color = 'rose' }: { children: string; color?: 'blue' | 'rose' }) {
  return (
    <p className={`text-[10px] font-bold tracking-widest uppercase mb-4 ${color === 'blue' ? 'text-blue-500' : 'text-rose-500'}`}>
      {children}
    </p>
  );
}

export function Step1Couple({ initialData, onNext }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      groomName: initialData.groomName ?? '',
      groomNid: initialData.groomNid ?? '',
      groomPhone: initialData.groomPhone ?? '',
      brideName: initialData.brideName ?? '',
      brideNid: initialData.brideNid ?? '',
      bridePhone: initialData.bridePhone ?? '',
      notificationPhone: initialData.notificationPhone ?? '',
    },
  });

  const nidProps = { inputMode: 'numeric' as const, maxLength: 16, placeholder: '16-digit National ID' };

  const handleNext = (data: FormData) =>
    onNext({
      ...data,
      groomPhone:        toE164(data.groomPhone),
      bridePhone:        toE164(data.bridePhone),
      notificationPhone: toE164(data.notificationPhone),
    });

  return (
    <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
      {/* Groom */}
      <div>
        <SectionLabel color="blue">Groom</SectionLabel>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Full name"
            required
            placeholder="As on National ID"
            error={errors.groomName?.message}
            {...register('groomName')}
          />
          <Input
            label="National ID"
            required
            error={errors.groomNid?.message}
            {...nidProps}
            {...register('groomNid')}
          />
          <div className="sm:col-span-2">
            <PhoneInput
              label="Phone number"
              required
              error={errors.groomPhone?.message}
              {...register('groomPhone')}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-200" />

      {/* Bride */}
      <div>
        <SectionLabel color="rose">Bride</SectionLabel>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Full name"
            required
            placeholder="As on National ID"
            error={errors.brideName?.message}
            {...register('brideName')}
          />
          <Input
            label="National ID"
            required
            error={errors.brideNid?.message}
            {...nidProps}
            {...register('brideNid')}
          />
          <div className="sm:col-span-2">
            <PhoneInput
              label="Phone number"
              required
              error={errors.bridePhone?.message}
              {...register('bridePhone')}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-200" />

      {/* SMS notifications */}
      <div>
        <SectionLabel color="rose">SMS Notifications</SectionLabel>
        <PhoneInput
          label="Phone number for SMS updates"
          required
          hint="Your Application ID and all status updates will be sent via SMS to this number"
          error={errors.notificationPhone?.message}
          {...register('notificationPhone')}
        />
      </div>

      <div className="flex justify-end pt-2">
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
