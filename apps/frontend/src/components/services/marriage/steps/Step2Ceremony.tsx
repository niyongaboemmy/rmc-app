'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, MapPin, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { WizardFormData } from '../MarriageWizard';
import { MarriageFees } from '@/lib/marriageApi';
import { useState } from 'react';

const PROVINCE_KEYS = ['kigali', 'north', 'south', 'east', 'west'] as const;
const PROVINCE_LABELS: Record<(typeof PROVINCE_KEYS)[number], string> = {
  kigali: 'Kigali City',
  north: 'Northern Province',
  south: 'Southern Province',
  east: 'Eastern Province',
  west: 'Western Province',
};
const DISTRICTS: Record<(typeof PROVINCE_KEYS)[number], string[]> = {
  kigali: ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  north: ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'],
  south: ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'],
  east: ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'],
  west: ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'],
};

const today = new Date();
const minDate = new Date(today);
minDate.setDate(today.getDate() + 14);
const minDateStr = minDate.toISOString().split('T')[0];

const schema = z.object({
  province: z.enum(PROVINCE_KEYS, { errorMap: () => ({ message: 'Select a province' }) }),
  district: z.string().min(1, 'Select a district'),
  venueType: z.enum(['mosque', 'outside'], { errorMap: () => ({ message: 'Select a venue type' }) }),
  venueAddress: z.string().optional(),
  preferredDateFrom: z.string().min(1, 'Select a preferred start date'),
  preferredDateTo: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  initialData: Partial<WizardFormData>;
  onNext: (data: Partial<WizardFormData>) => void;
  onBack: () => void;
  fees?: MarriageFees;
}

function VenueOption({
  value, selected, onChange, icon, title, fee,
}: {
  value: 'mosque' | 'outside';
  selected: boolean;
  onChange: (v: 'mosque' | 'outside') => void;
  icon: React.ReactNode;
  title: string;
  fee: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        'relative flex flex-col gap-3 w-full rounded-xl border-2 px-4 py-4 text-left transition-all duration-200',
        selected
          ? 'border-rose-500 bg-rose-50/60'
          : 'border-gray-200 bg-white hover:border-gray-300',
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
          selected ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-500',
        )}>
          {icon}
        </span>
        <div className={cn(
          'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
          selected ? 'border-rose-500 bg-rose-500' : 'border-gray-300',
        )}>
          {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </div>
      </div>
      <div>
        <p className={cn('font-semibold text-sm', selected ? 'text-gray-900' : 'text-gray-700')}>{title}</p>
        <p className={cn('text-xs mt-0.5 font-medium', selected ? 'text-rose-600' : 'text-gray-400')}>{fee}</p>
      </div>
    </button>
  );
}

export function Step2Ceremony({ initialData, onNext, onBack, fees }: Props) {
  const [venue, setVenue] = useState<'mosque' | 'outside' | undefined>(initialData.venueType);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      province: initialData.province as (typeof PROVINCE_KEYS)[number] | undefined,
      district: initialData.district ?? '',
      venueType: initialData.venueType,
      venueAddress: initialData.venueAddress ?? '',
      preferredDateFrom: initialData.preferredDateFrom ?? '',
      preferredDateTo: initialData.preferredDateTo ?? '',
    },
  });

  const province = watch('province');
  const provinceReg = register('province');
  const districtOptions = province ? DISTRICTS[province] : [];

  const onSubmit = (data: FormData) => onNext({ ...data, venueType: venue ?? data.venueType });

  const selectCls = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-colors';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      {/* Venue */}
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">Venue type <span className="text-rose-500">*</span></p>
        <div className="grid grid-cols-2 gap-3">
          <VenueOption
            value="mosque"
            selected={venue === 'mosque'}
            onChange={(v) => { setVenue(v); setValue('venueType', v); }}
            icon={<Building2 className="w-4 h-4" />}
            title={fees?.mosque.label ?? 'At a mosque'}
            fee={fees ? `${fees.mosque.amount.toLocaleString()} RWF` : '30,000 RWF'}
          />
          <VenueOption
            value="outside"
            selected={venue === 'outside'}
            onChange={(v) => { setVenue(v); setValue('venueType', v); }}
            icon={<MapPin className="w-4 h-4" />}
            title={fees?.outside.label ?? 'Outside a mosque'}
            fee={fees ? `${fees.outside.amount.toLocaleString()} RWF` : '200,000 RWF'}
          />
        </div>
        {errors.venueType && <p className="mt-2 text-xs text-red-500">{errors.venueType.message}</p>}
      </div>

      {/* Location */}
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">Location</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Province <span className="text-rose-500">*</span>
            </label>
            <select
              className={selectCls}
              {...provinceReg}
              onChange={(e) => { provinceReg.onChange(e); setValue('district', '', { shouldValidate: false }); }}
            >
              <option value="">Select province</option>
              {PROVINCE_KEYS.map((k) => (
                <option key={k} value={k}>{PROVINCE_LABELS[k]}</option>
              ))}
            </select>
            {errors.province && <p className="mt-1 text-xs text-red-500">{errors.province.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              District <span className="text-rose-500">*</span>
            </label>
            <select
              className={cn(selectCls, !province && 'opacity-50 cursor-not-allowed')}
              disabled={!province}
              {...register('district')}
            >
              <option value="">{province ? 'Select district' : 'Select province first'}</option>
              {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.district && <p className="mt-1 text-xs text-red-500">{errors.district.message}</p>}
          </div>
        </div>

        {venue === 'outside' && (
          <div className="mt-4">
            <Input
              label="Venue address"
              placeholder="Street, neighborhood, or location description"
              leftIcon={<MapPin className="w-4 h-4" />}
              {...register('venueAddress')}
            />
          </div>
        )}
      </div>

      {/* Dates */}
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">Preferred dates</p>
        <p className="text-xs text-gray-400 mb-3">Minimum 14 days processing time required.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="From"
            required
            type="date"
            min={minDateStr}
            error={errors.preferredDateFrom?.message}
            {...register('preferredDateFrom')}
          />
          <Input
            label="To (optional)"
            type="date"
            min={minDateStr}
            hint="Your flexibility window"
            error={errors.preferredDateTo?.message}
            {...register('preferredDateTo')}
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
