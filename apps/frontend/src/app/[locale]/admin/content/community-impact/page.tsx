'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { BarChart3, ArrowLeft, Save, Users, Building2, Map, LayoutGrid, TrendingUp } from 'lucide-react';

interface ImpactStats {
  members: string;
  mosques: string;
  provinces: string;
  services: string;
}

const INITIAL: ImpactStats = {
  members: '12500', mosques: '320', provinces: '5', services: '7',
};

const STATS = [
  { key: 'members' as const, label: 'Active Members', suffix: '+', icon: Users, gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', ring: 'focus:ring-emerald-400' },
  { key: 'mosques' as const, label: 'Registered Mosques', suffix: '+', icon: Building2, gradient: 'from-sky-500 to-blue-600', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100', ring: 'focus:ring-sky-400' },
  { key: 'provinces' as const, label: 'Provinces Covered', suffix: '', icon: Map, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', ring: 'focus:ring-violet-400' },
  { key: 'services' as const, label: 'Services Offered', suffix: '', icon: LayoutGrid, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', ring: 'focus:ring-amber-400' },
];

export default function CommunityImpactPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider><CommunityImpactManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function CommunityImpactManager() {
  const { locale } = useParams<{ locale: string }>();
  const { success } = useToast();
  const [form, setForm] = useState<ImpactStats>(INITIAL);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    success('Community impact stats saved successfully.');
  }, [success]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin/content`} className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Community Impact</h1>
            <p className="text-xs text-gray-400">Update homepage statistics</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-600/20 transition-colors">
          {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Stats preview (dark section like homepage) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rmc-green-deep to-rmc-green p-6">
        <div className="absolute inset-0 pattern-islamic opacity-20 pointer-events-none" />
        <div className="relative">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Preview — how it looks on homepage
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {STATS.map(({ key, label, suffix }) => (
              <div key={key} className="bg-white/10 border border-white/15 rounded-xl p-4 text-center backdrop-blur-sm">
                <p className="text-2xl font-bold text-white tabular-nums">
                  {Number(form[key]).toLocaleString()}{suffix}
                </p>
                <p className="text-white/50 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Input cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {STATS.map(({ key, label, suffix, icon: Icon, bg, text, border, ring, gradient }) => (
          <div key={key} className={`bg-white rounded-2xl border ${border} p-5`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{label}</p>
                <p className={`text-xs ${text}`}>Displays as {Number(form[key]).toLocaleString()}{suffix} on homepage</p>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                className={`w-full rounded-xl border ${border} px-4 py-3 text-xl font-bold ${text} focus:outline-none focus:ring-2 ${ring} focus:border-transparent bg-gray-50`}
              />
              {suffix && (
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold ${text}`}>{suffix}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-700">
        <BarChart3 className="w-4 h-4 shrink-0 mt-0.5" />
        <p>These statistics are displayed with an animated count-up effect on the homepage. Values are shown with a <strong>+</strong> suffix where applicable.</p>
      </div>
    </div>
  );
}
