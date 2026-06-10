'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { apiClient } from '@/lib/api';

interface MemberProfile {
  id: string;
  membershipNumber: string;
  category: string;
  approvalStatus: string;
  memberStatus: string;
  joinedDate: string;
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
    active: 'bg-green-100 text-green-700',
    suspended: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${classes[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function MemberDashboardPage() {
  const t = useTranslations('member.dashboard');
  const { locale } = useParams<{ locale: string }>();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/members/me')
      .then((res) => setProfile(res.data.data))
      .catch(() => setError('Profile not found. Please complete your registration.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rmc-green" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href={`/${locale}/member/register`}
            className="px-6 py-3 bg-rmc-green text-white rounded-xl font-semibold hover:bg-rmc-green-dark transition-colors"
          >
            Complete Registration
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('title')}</h1>

        {/* Status card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase mb-1">{t('membershipNo')}</p>
              <p className="font-bold text-rmc-green text-lg">{profile.membershipNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase mb-1">{t('category')}</p>
              <p className="font-semibold text-gray-900 capitalize">{profile.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase mb-1">{t('status')}</p>
              <StatusBadge status={profile.approvalStatus} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase mb-1">Joined</p>
              <p className="font-semibold text-gray-900">
                {new Date(profile.joinedDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.approvalStatus === 'approved' && (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/members/${profile.id}/id-card`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-rmc-green/30"
            >
              <div className="w-12 h-12 bg-rmc-green-light rounded-xl flex items-center justify-center text-2xl">📄</div>
              <div>
                <p className="font-semibold text-gray-900">{t('downloadId')}</p>
                <p className="text-gray-500 text-sm">PDF with QR code</p>
              </div>
            </a>
          )}

          {profile.approvalStatus === 'pending' && (
            <div className="flex items-center gap-4 p-5 bg-yellow-50 rounded-2xl border border-yellow-200">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl">⏳</div>
              <div>
                <p className="font-semibold text-gray-900">Application Pending</p>
                <p className="text-gray-500 text-sm">Awaiting admin review</p>
              </div>
            </div>
          )}

          {profile.approvalStatus === 'rejected' && (
            <div className="flex items-center gap-4 p-5 bg-red-50 rounded-2xl border border-red-200">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">❌</div>
              <div>
                <p className="font-semibold text-gray-900">Application Rejected</p>
                <p className="text-gray-500 text-sm">Contact admin for details</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
