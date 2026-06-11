'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import {
  CheckCircle2, Clock, XCircle, Download, CreditCard,
  MapPin, User, Calendar, Star, Sparkles, ArrowRight,
  Bell, BookOpen, Heart, Shield, Moon, ClipboardList,
} from 'lucide-react';

interface MemberProfile {
  id: string;
  membershipNumber: string;
  category: string;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  memberStatus: string;
  joinedDate: string;
}

/* ─── Animated number ─── */
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

/* ─── Membership card ─── */
function MembershipCard({ profile, name }: { profile: MemberProfile; name: string }) {
  const isApproved = profile.approvalStatus === 'approved';
  return (
    <div className="relative w-full max-w-sm mx-auto animate-fade-up" style={{ animationDelay: '100ms' }}>
      {/* Glow */}
      <div className={`absolute inset-0 rounded-3xl blur-2xl opacity-30 transition-opacity ${isApproved ? 'bg-rmc-green' : 'bg-amber-400'}`} />

      <div className={`relative rounded-3xl p-6 overflow-hidden shadow-2xl text-white ${isApproved ? 'bg-gradient-to-br from-rmc-green via-rmc-green-dark to-rmc-green-deep' : 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700'}`}>

        {/* Islamic geometric overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M20 0L24 8L32 4L28 12L36 16L28 20L32 28L24 24L20 32L16 24L8 28L12 20L4 16L12 12L8 4L16 8Z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Card top */}
        <div className="flex items-start justify-between mb-6 relative z-10">
          <div>
            <p className="text-white/60 text-[10px] font-semibold tracking-widest uppercase">Rwanda Muslim Community</p>
            <p className="text-white font-bold text-lg mt-0.5">Member Card</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Moon className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Membership number */}
        <div className="relative z-10 mb-6">
          <p className="text-white/50 text-[10px] tracking-widest uppercase mb-1">Membership Number</p>
          <p className="text-2xl font-bold tracking-wider font-mono">{profile.membershipNumber}</p>
        </div>

        {/* Card bottom */}
        <div className="flex items-end justify-between relative z-10">
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Card Holder</p>
            <p className="text-white font-semibold">{name}</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Category</p>
            <p className="text-white font-semibold capitalize">{profile.category}</p>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/5" />
      </div>
    </div>
  );
}

/* ─── Status timeline ─── */
function StatusTimeline({ status }: { status: 'approved' | 'pending' | 'rejected' }) {
  const steps = [
    { key: 'submitted', label: 'Submitted', icon: User },
    { key: 'review', label: 'Under Review', icon: Clock },
    { key: 'approved', label: 'Approved', icon: CheckCircle2 },
  ];

  const stepIndex = status === 'approved' ? 2 : status === 'rejected' ? 1 : 1;
  const isRejected = status === 'rejected';

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const done = i < stepIndex || (i === 2 && status === 'approved');
        const active = i === stepIndex && !isRejected;
        const rejected = isRejected && i === 1;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                rejected ? 'bg-red-100 text-red-500 ring-2 ring-red-200' :
                done ? 'bg-rmc-green text-white shadow-md shadow-rmc-green/30' :
                active ? 'bg-rmc-green-light text-rmc-green ring-2 ring-rmc-green/30 animate-pulse-glow' :
                'bg-gray-100 text-gray-300'
              }`}>
                {rejected ? <XCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${
                rejected ? 'text-red-500' : done || active ? 'text-rmc-green' : 'text-gray-300'
              }`}>
                {rejected && i === 1 ? 'Rejected' : step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mb-5 mx-1 transition-all duration-700 ${done ? 'bg-rmc-green' : 'bg-gray-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Quick action card ─── */
function ActionCard({
  icon: Icon, title, desc, href, color, external = false, delay = 0
}: {
  icon: React.ElementType; title: string; desc: string;
  href?: string; color: string; external?: boolean; delay?: number;
}) {
  const inner = (
    <div
      className={`group flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-fade-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-rmc-green group-hover:translate-x-1 transition-all duration-200 shrink-0" />
    </div>
  );

  if (!href) return inner;
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return <Link href={href}>{inner}</Link>;
}

/* ─── Info tile ─── */
function InfoTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-1 animate-fade-up">
      <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

/* ══════════════════════════ PAGE ══════════════════════════ */
export default function MemberDashboardPage() {
  const t = useTranslations('member.dashboard');
  const { locale } = useParams<{ locale: string }>();
  const { user } = useAuth();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/members/me')
      .then((res) => setProfile(res.data.data))
      .catch(() => setError('Profile not found. Please complete your registration.'))
      .finally(() => setLoading(false));
  }, []);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-4 border-rmc-green-light border-t-rmc-green animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center">
              <Moon className="w-5 h-5 text-rmc-green" />
            </span>
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  /* ─── No profile ─── */
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-24 text-center animate-fade-up">
          <div className="w-20 h-20 rounded-3xl bg-rmc-green-light flex items-center justify-center mx-auto mb-6">
            <ClipboardList className="w-9 h-9 text-rmc-green" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Complete Your Registration</h2>
          <p className="text-gray-500 text-sm mb-8">{error || 'You haven\'t submitted a membership application yet.'}</p>
          <Link
            href={`/${locale}/member/register`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-rmc-green text-white rounded-xl font-semibold hover:bg-rmc-green-dark transition-all duration-200 shadow-lg shadow-rmc-green/25 hover:shadow-xl hover:scale-105"
          >
            Start Application <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const isApproved = profile.approvalStatus === 'approved';
  const isPending = profile.approvalStatus === 'pending';
  const isRejected = profile.approvalStatus === 'rejected';

  const joinedDate = profile.joinedDate
    ? new Date(profile.joinedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const daysSince = profile.joinedDate
    ? Math.floor((Date.now() - new Date(profile.joinedDate).getTime()) / 86_400_000)
    : 0;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Navbar />

      {/* ── Decorative hero band ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rmc-green-deep via-rmc-green-dark to-rmc-green">
        {/* Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M30 0L36 12L48 6L42 18L54 24L42 30L48 42L36 36L30 48L24 36L12 42L18 30L6 24L18 18L12 6L24 12Z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-20">
          {/* Greeting */}
          <div className="animate-fade-up">
            <div className="flex items-center gap-2 text-rmc-gold text-sm font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Member Portal</span>
            </div>
            <h1 className="text-3xl font-bold text-white">
              Assalamu Alaikum, <span className="text-rmc-gold">{user?.firstName}</span>
            </h1>
            <p className="text-white/60 text-sm mt-1">Welcome to your Rwanda Muslim Community member dashboard.</p>
          </div>
        </div>
      </div>

      {/* ── Main content overlapping the band ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-12 pb-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Membership card + timeline */}
          <div className="lg:col-span-1 space-y-5">
            <MembershipCard profile={profile} name={fullName} />

            {/* Status timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-fade-up" style={{ animationDelay: '200ms' }}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Application Status</p>
              <StatusTimeline status={profile.approvalStatus} />

              {/* Status message */}
              {isPending && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5">
                  <Bell className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-700">Under Review</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">Our team is reviewing your application. You'll be notified once approved.</p>
                  </div>
                </div>
              )}
              {isApproved && (
                <div className="mt-4 p-3 bg-rmc-green-light border border-rmc-green/20 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-rmc-green mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-rmc-green">Active Member</p>
                    <p className="text-[11px] text-rmc-green/70 mt-0.5">Your membership is confirmed. Welcome to the community!</p>
                  </div>
                </div>
              )}
              {isRejected && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-600">Application Rejected</p>
                    <p className="text-[11px] text-red-500 mt-0.5">Please contact the admin for more information or reapply.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Info + actions */}
          <div className="lg:col-span-2 space-y-5">

            {/* Quick info tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoTile label="Membership #" value={profile.membershipNumber.split('-').pop() ?? '—'} sub="ID number" />
              <InfoTile label="Category" value={profile.category.charAt(0).toUpperCase() + profile.category.slice(1)} />
              <InfoTile label="Joined" value={joinedDate.split(' ').slice(1).join(' ')} sub={joinedDate.split(' ')[0]} />
              <InfoTile label="Member for" value={`${daysSince}`} sub="days" />
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Quick Actions</p>

              {isApproved && (
                <ActionCard
                  icon={Download}
                  title={t('downloadId')}
                  desc="PDF with QR code — carry it anywhere"
                  href={`${API_URL}/members/${profile.id}/id-card`}
                  color="bg-rmc-green-light text-rmc-green"
                  external
                  delay={300}
                />
              )}

              <ActionCard
                icon={User}
                title="My Profile"
                desc="Update personal details and photo"
                href={`/${locale}/profile`}
                color="bg-blue-50 text-blue-500"
                delay={360}
              />

              <ActionCard
                icon={Shield}
                title="Change Password"
                desc="Keep your account secure"
                href={`/${locale}/change-password`}
                color="bg-purple-50 text-purple-500"
                delay={420}
              />

              <ActionCard
                icon={BookOpen}
                title="Community Resources"
                desc="Prayer times, announcements & more"
                href={`/${locale}`}
                color="bg-amber-50 text-amber-500"
                delay={480}
              />
            </div>

            {/* Community stats */}
            <div className="bg-gradient-to-br from-rmc-green-deep to-rmc-green-dark rounded-2xl p-5 text-white relative overflow-hidden animate-fade-up" style={{ animationDelay: '520ms' }}>
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M20 0L24 8L32 4L28 12L36 16L28 20L32 28L24 24L20 32L16 24L8 28L12 20L4 16L12 12L8 4L16 8Z'/%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: '40px 40px',
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-4 h-4 text-rmc-gold" />
                  <p className="text-sm font-bold text-white">Rwanda Muslim Community</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: 'Members', value: 1200 },
                    { label: 'Mosques', value: 48 },
                    { label: 'Provinces', value: 5 },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-2xl font-bold text-rmc-gold">
                        <CountUp to={value} />+
                      </p>
                      <p className="text-[11px] text-white/60 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-rmc-gold fill-rmc-gold" />
                    <p className="text-[11px] text-white/70">Serving the Ummah since 1992</p>
                  </div>
                  <Link href={`/${locale}/about`} className="text-[11px] text-rmc-gold hover:underline font-semibold flex items-center gap-1">
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
