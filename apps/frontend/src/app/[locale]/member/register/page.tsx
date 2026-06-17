'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navbar } from '@/components/layout/Navbar';
import { Select } from '@/components/ui/Select';
import { publicApi } from '@/lib/public-api';
import { User } from 'lucide-react';
import { apiClient } from '@/lib/api';

const schema = z.object({
  nationalId: z.string().length(16, 'Must be 16 digits').regex(/^\d+$/, 'Digits only').optional().or(z.literal('')),
  occupation: z.string().max(100).optional(),
  educationLevel: z.enum(['primary', 'secondary', 'bachelors', 'masters', 'phd', 'other', '']).optional(),
  category: z.enum(['standard', 'student', 'scholar', 'partner', 'vip']).default('standard'),
  mosqueId: z.string().uuid().optional().or(z.literal('')),
  provinceId: z.string().uuid().optional().or(z.literal('')),
  districtId: z.string().uuid().optional().or(z.literal('')),
  sectorId: z.string().uuid().optional().or(z.literal('')),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  consentGiven: z.boolean().refine((v) => v === true, 'You must give consent'),
});

type FormValues = z.infer<typeof schema>;

interface Province { id: string; name: string; }
interface District { id: string; name: string; }
interface Sector { id: string; name: string; }
interface Mosque { id: string; name: string; }

export default function MemberRegisterPage() {
  const t = useTranslations('member.register');
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    register, handleSubmit, watch, formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const provinceId = watch('provinceId');
  const districtId = watch('districtId');

  useEffect(() => { publicApi.getProvinces().then(setProvinces); }, []);

  useEffect(() => {
    if (!provinceId) { setDistricts([]); return; }
    publicApi.getDistricts(provinceId).then(setDistricts);
  }, [provinceId]);

  useEffect(() => {
    if (!districtId) { setSectors([]); setMosques([]); return; }
    publicApi.getSectors(districtId).then(setSectors);
    publicApi.getMosques(districtId).then(setMosques);
  }, [districtId]);

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    setError('');
    try {
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== '' && v !== undefined),
      );
      await apiClient.post('/members/register', payload);
      router.push(`/${locale}/member/dashboard`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-rmc-green-light rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-rmc-green" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* National ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('nationalId')}</label>
              <input
                type="text"
                maxLength={16}
                placeholder="1234567890123456"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rmc-green focus:border-transparent outline-none"
                {...register('nationalId')}
              />
              {errors.nationalId && <p className="text-red-500 text-xs mt-1">{errors.nationalId.message}</p>}
            </div>

            {/* Category */}
            <Select label={t('category')} {...register('category')}>
              {(['standard', 'student', 'scholar', 'partner', 'vip'] as const).map((cat) => (
                <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
              ))}
            </Select>

            {/* Occupation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('occupation')}</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rmc-green focus:border-transparent outline-none"
                {...register('occupation')}
              />
            </div>

            {/* Education */}
            <Select label={t('education')} placeholder="Select level" {...register('educationLevel')}>
              {['primary', 'secondary', 'bachelors', 'masters', 'phd', 'other'].map((level) => (
                <option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>
              ))}
            </Select>

            {/* Location cascade */}
            <div className="grid grid-cols-2 gap-4">
              <Select label={t('province')} placeholder="Select Province" {...register('provinceId')}>
                {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Select
                label={t('district')}
                placeholder="Select District"
                disabled={!provinceId}
                {...register('districtId')}
              >
                {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </div>

            {/* Mosque */}
            {mosques.length > 0 && (
              <Select label={t('mosque')} placeholder="Select Mosque" {...register('mosqueId')}>
                {mosques.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            )}

            {/* Emergency Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('emergencyName')}</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rmc-green focus:border-transparent outline-none"
                  {...register('emergencyContactName')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('emergencyPhone')}</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-rmc-green focus:border-transparent outline-none"
                  {...register('emergencyContactPhone')}
                />
              </div>
            </div>

            {/* Consent */}
            <div className="flex items-start gap-3 p-4 bg-rmc-green-light rounded-lg">
              <input
                type="checkbox"
                id="consent"
                className="mt-0.5 h-4 w-4 text-rmc-green rounded border-gray-300"
                {...register('consentGiven')}
              />
              <label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer">
                {t('consent')}
              </label>
            </div>
            {errors.consentGiven && (
              <p className="text-red-500 text-xs">{errors.consentGiven.message}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-rmc-green text-white font-semibold rounded-xl hover:bg-rmc-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '...' : t('submit')}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
