'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import {
  CheckCircle2, Clock, XCircle, Download,
  User, Star, ArrowRight, Bell, BookOpen,
  Heart, Shield, Moon, ClipboardList,
  Hash, Calendar, Timer,
} from 'lucide-react';

interface MemberProfile {
  id: string;
  membershipNumber: string;
  category: string;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  memberStatus: string;
  joinedDate: string;
}

const DAILY_VERSES = [
  { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',            translation: 'Indeed, Allah is with the patient.',                       ref: 'Quran 2:153'  },
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', translation: 'Whoever relies upon Allah — He is sufficient for him.', ref: 'Quran 65:3'  },
  { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',                translation: 'Indeed, with hardship will be ease.',                      ref: 'Quran 94:6'  },
  { arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',               translation: 'My Lord, increase me in knowledge.',                        ref: 'Quran 20:114' },
  { arabic: 'وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ',           translation: 'And Allah loves the doers of good.',                       ref: 'Quran 3:134' },
];

// ─── CountUp ──────────────────────────────────────────────────────────────────
function CountUp({ to, duration = 1000 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration]);
  return <>{val}</>;
}

// ─── Membership Card ──────────────────────────────────────────────────────────
function MembershipCard({ profile, name }: { profile: MemberProfile; name: string }) {
  return (
    <div className="rounded-2xl bg-rmc-green p-6 text-white relative overflow-hidden shadow-md animate-fade-up">
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/[0.06]" />
      <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/[0.06]" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <p className="text-white/55 text-[10px] tracking-widest uppercase font-semibold">Rwanda Muslim Community</p>
            <p className="text-white font-bold mt-0.5">Member Card</p>
          </div>
          <div className="flex items-start gap-0.5 text-white/60">
            <Moon className="w-4 h-4" fill="currentColor" />
            <Star className="w-2 h-2 mt-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Number */}
        <div className="mb-7">
          <p className="text-white/50 text-[10px] tracking-widest uppercase mb-1">Membership Number</p>
          <p className="text-xl font-bold font-mono tracking-wider">{profile.membershipNumber}</p>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Card Holder</p>
            <p className="text-white font-semibold text-sm">{name}</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Category</p>
            <p className="text-white font-semibold text-sm capitalize">{profile.category}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Timeline ──────────────────────────────────────────────────────────
function StatusTimeline({ status }: { status: 'approved' | 'pending' | 'rejected' }) {
  const steps = [
    { key: 'submitted', label: 'Submitted',   icon: User },
    { key: 'review',    label: 'Under Review', icon: Clock },
    { key: 'approved',  label: 'Approved',     icon: CheckCircle2 },
  ];
  const stepIndex  = status === 'approved' ? 2 : 1;
  const isRejected = status === 'rejected';

  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const Icon     = step.icon;
        const done     = i < stepIndex || (i === 2 && status === 'approved');
        const active   = i === stepIndex && !isRejected;
        const rejected = isRejected && i === 1;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                rejected ? 'bg-red-50 text-red-400 ring-2 ring-red-100' :
                done     ? 'bg-rmc-green text-white' :
                active   ? 'bg-rmc-green-light text-rmc-green ring-2 ring-rmc-green/25' :
                           'bg-gray-100 text-gray-300'
              }`}>
                {rejected ? <XCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${
                rejected ? 'text-red-400' : done || active ? 'text-rmc-green' : 'text-gray-300'
              }`}>
                {rejected && i === 1 ? 'Rejected' : step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mb-5 mx-1 ${done ? 'bg-rmc-green' : 'bg-gray-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Info Tile ────────────────────────────────────────────────────────────────
function InfoTile({ label, value, sub, icon: Icon }: {
  label: string; value: string; sub?: string; icon?: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 animate-fade-up">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-300 mb-2.5" />}
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">{label}</p>
      <p className="text-base font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Action Row ───────────────────────────────────────────────────────────────
function ActionRow({
  icon: Icon, title, desc, href, iconColor, external = false,
}: {
  icon: React.ElementType; title: string; desc: string;
  href?: string; iconColor: string; external?: boolean;
}) {
  const inner = (
    <div className="group flex items-center gap-3.5 py-3.5 border-b border-gray-50 last:border-0 cursor-pointer">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 group-hover:text-rmc-green transition-colors duration-150">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-rmc-green group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
    </div>
  );

  if (!href) return inner;
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return <Link href={href}>{inner}</Link>;
}

// ══════════════════════════════════ PAGE ══════════════════════════════════════
export default function MemberDashboardPage() {
  const { locale } = useParams<{ locale: string }>();
  const { user }   = useAuth();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    apiClient.get('/members/me')
      .then((res) => setProfile(res.data.data))
      .catch(() => setError('Profile not found. Please complete your registration.'))
      .finally(() => setLoading(false));
  }, []);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  const hijriDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date());
    } catch { return ''; }
  }, []);

  const verse = useMemo(() => DAILY_VERSES[new Date().getDate() % DAILY_VERSES.length], []);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-rmc-green animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center">
              <Moon className="w-4 h-4 text-rmc-green" />
            </span>
          </div>
          <p className="text-gray-400 text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // ── No profile ──
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-md mx-auto px-6 py-24 text-center animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-rmc-green-light flex items-center justify-center mx-auto mb-5">
            <ClipboardList className="w-7 h-7 text-rmc-green" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Complete Your Registration</h2>
          <p className="text-gray-500 text-sm mb-7">{error || "You haven't submitted a membership application yet."}</p>
          <Link
            href={`/${locale}/member/register`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rmc-green text-white rounded-xl text-sm font-semibold hover:bg-rmc-green-dark transition-colors shadow-sm"
          >
            Start Application <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const isApproved = profile.approvalStatus === 'approved';
  const isPending  = profile.approvalStatus === 'pending';
  const isRejected = profile.approvalStatus === 'rejected';

  const joinedDate = profile.joinedDate
    ? new Date(profile.joinedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const daysSince = profile.joinedDate
    ? Math.floor((Date.now() - new Date(profile.joinedDate).getTime()) / 86_400_000)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Hero with mosque cover image ────────────────────────────────── */}
      <div
        className="relative bg-gray-900 bg-cover bg-center"
        style={{
          // Sheikh Zayed Grand Mosque, Abu Dhabi
          backgroundImage: `url("https://images.unsplash.com/photo-1469827160215-9d29e96e72f4?auto=format&fit=crop&w=1920&q=80")`,
          minHeight: '230px',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 flex flex-col justify-end h-full" style={{ minHeight: '230px' }}>
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-2.5">
            <div className="flex items-center gap-1.5 text-rmc-gold">
              <Moon className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold tracking-[0.16em] uppercase">Member Portal</span>
            </div>
            {hijriDate && (
              <>
                <span className="text-white/25 text-xs">·</span>
                <span className="text-white/40 text-[11px]">{hijriDate}</span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
            Assalamu Alaikum,{' '}
            <span className="text-rmc-gold">{user?.firstName}</span>
          </h1>
          <p className="text-white/50 text-sm mt-1">Welcome to your Rwanda Muslim Community member dashboard.</p>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Membership card */}
            <MembershipCard profile={profile} name={fullName} />

            {/* Application status */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-fade-up" style={{ animationDelay: '120ms' }}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Application Status</p>
              <StatusTimeline status={profile.approvalStatus} />

              {isPending && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-2.5">
                  <Bell className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-700">Under Review</p>
                    <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed">Our team is reviewing your application. You'll be notified once approved.</p>
                  </div>
                </div>
              )}
              {isApproved && (
                <div className="mt-4 p-3 bg-rmc-green-light border border-rmc-green/10 rounded-xl flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-rmc-green mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-rmc-green">Active Member</p>
                    <p className="text-[11px] text-rmc-green/70 mt-0.5 leading-relaxed">Your membership is confirmed. Welcome to the community!</p>
                  </div>
                </div>
              )}
              {isRejected && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2.5">
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-600">Application Rejected</p>
                    <p className="text-[11px] text-red-500 mt-0.5 leading-relaxed">Please contact the admin for more information or reapply.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Verse of the day */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-fade-up" style={{ animationDelay: '160ms' }}>
              <div className="flex items-center gap-1.5 mb-3">
                <BookOpen className="w-3.5 h-3.5 text-rmc-green/60" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verse of the Day</p>
              </div>
              <p className="font-arabic text-right text-gray-800 text-base leading-loose mb-2">{verse.arabic}</p>
              <p className="text-gray-500 text-xs italic leading-relaxed">"{verse.translation}"</p>
              <p className="text-gray-300 text-[10px] mt-1.5 font-semibold tracking-widest uppercase">{verse.ref}</p>
            </div>
          </div>

          {/* ── Right column ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* 4 info tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoTile
                label="Membership #"
                value={profile.membershipNumber.split('-').pop() ?? '—'}
                sub="ID number"
                icon={Hash}
              />
              <InfoTile
                label="Category"
                value={profile.category.charAt(0).toUpperCase() + profile.category.slice(1)}
                icon={Star}
              />
              <InfoTile
                label="Joined"
                value={joinedDate.split(' ').slice(1).join(' ')}
                sub={joinedDate.split(' ')[0]}
                icon={Calendar}
              />
              <InfoTile
                label="Member for"
                value={`${daysSince}`}
                sub="days"
                icon={Timer}
              />
            </div>

            {/* Quick actions — single card with divider rows */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-fade-up" style={{ animationDelay: '200ms' }}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Quick Actions</p>

              {isApproved && (
                <ActionRow
                  icon={Download}
                  title="Download ID Card"
                  desc="PDF with QR code — carry it anywhere"
                  href={`${API_URL}/members/${profile.id}/id-card`}
                  iconColor="bg-rmc-green-light text-rmc-green"
                  external
                />
              )}
              <ActionRow
                icon={User}
                title="My Profile"
                desc="Update personal details and photo"
                href={`/${locale}/profile`}
                iconColor="bg-blue-50 text-blue-400"
              />
              <ActionRow
                icon={Shield}
                title="Change Password"
                desc="Keep your account secure"
                href={`/${locale}/change-password`}
                iconColor="bg-purple-50 text-purple-400"
              />
              <ActionRow
                icon={BookOpen}
                title="Community Resources"
                desc="Prayer times, announcements & more"
                href={`/${locale}`}
                iconColor="bg-amber-50 text-amber-400"
              />
            </div>

            {/* Community stats */}
            <div className="bg-rmc-green rounded-2xl p-5 text-white relative overflow-hidden animate-fade-up" style={{ animationDelay: '240ms' }}>
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/[0.06]" />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/[0.06]" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-5">
                  <Heart className="w-4 h-4 text-white/60" />
                  <p className="text-sm font-bold text-white">Rwanda Muslim Community</p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: 'Members',   value: 1200 },
                    { label: 'Mosques',   value: 48   },
                    { label: 'Provinces', value: 5    },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-2xl font-bold text-white">
                        <CountUp to={value} />+
                      </p>
                      <p className="text-[11px] text-white/50 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-rmc-gold fill-rmc-gold" />
                    <p className="text-[11px] text-white/50">Serving the Ummah since 1992</p>
                  </div>
                  <Link
                    href={`/${locale}/about`}
                    className="text-[11px] text-white/70 hover:text-white font-semibold flex items-center gap-1 transition-colors"
                  >
                    Learn more <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
