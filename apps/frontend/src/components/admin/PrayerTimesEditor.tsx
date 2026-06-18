'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { Clock, ArrowLeft, Save, MapPin, Moon, Sunrise, Sun, CloudSun, Sunset, Star } from 'lucide-react';

const PRAYERS = [
  { key: 'fajr',    label: 'Fajr',    icon: Moon,    color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  { key: 'sunrise', label: 'Sunrise', icon: Sunrise,  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100'  },
  { key: 'dhuhr',   label: 'Dhuhr',   icon: Sun,      color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
  { key: 'asr',     label: 'Asr',     icon: CloudSun, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  { key: 'maghrib', label: 'Maghrib', icon: Sunset,   color: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-100'   },
  { key: 'isha',    label: 'Isha',    icon: Star,     color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
] as const;

type PrayerKey = typeof PRAYERS[number]['key'];

interface PrayerTimesContent {
  fajr: string; sunrise: string; dhuhr: string;
  asr: string; maghrib: string; isha: string;
  location: string;
}

const INITIAL: PrayerTimesContent = {
  fajr: '04:45', sunrise: '06:15', dhuhr: '12:30',
  asr: '15:45', maghrib: '18:15', isha: '19:30',
  location: 'Kigali, Rwanda',
};

interface PrayerTimesEditorProps {
  backHref?: string;
}

export function PrayerTimesEditor({ backHref }: PrayerTimesEditorProps) {
  const { success } = useToast();
  const [form, setForm] = useState<PrayerTimesContent>(INITIAL);
  const [saving, setSaving] = useState(false);

  const setTime = useCallback((key: PrayerKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    success('Prayer times saved successfully.');
  }, [success]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-rmc-green hover:border-rmc-green/30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div className="w-10 h-10 rounded-xl bg-rmc-green/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Prayer Times</h1>
            <p className="text-xs text-gray-400">Update daily prayer schedule</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rmc-green hover:bg-rmc-green/90 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm shadow-rmc-green/20 transition-colors"
        >
          {saving
            ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-rmc-green" />
          Default Location
        </label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent"
          placeholder="Kigali, Rwanda"
        />
        <p className="text-xs text-gray-400 mt-1.5">Shown on the homepage when user location is unavailable.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-700 mb-5">Daily Prayer Schedule</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {PRAYERS.map(({ key, label, icon: PrayerIcon, color, bg, border }) => (
            <div key={key} className={`rounded-2xl ${bg} border ${border} p-4`}>
              <div className={`flex items-center gap-2 mb-3 ${color}`}>
                <PrayerIcon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
              </div>
              <input
                type="time"
                value={form[key]}
                onChange={(e) => setTime(key, e.target.value)}
                className={`w-full bg-white/80 rounded-xl border ${border} px-3 py-2.5 text-base font-bold ${color} focus:outline-none focus:ring-2 focus:ring-rmc-green/50 focus:border-transparent text-center`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-rmc-green/5 border border-rmc-green/15 text-sm text-rmc-green">
        <Clock className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Prayer times shown here are the <strong>default values</strong> for Kigali. When a visitor grants
          location access, the system automatically fetches accurate prayer times for their coordinates.
        </p>
      </div>
    </div>
  );
}
