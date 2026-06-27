'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Heart,
  MapPin,
  Building2,
  Smartphone,
  Landmark,
  Banknote,
  Calendar,
  UserCheck,
  Loader2,
  Award,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Download,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const ROLE_LABELS: Record<string, string> = {
  bride: 'Bride (Umugeni)',
  groom: 'Groom (Umugabo)',
  wali: "Guardian (Wali)",
  imam: 'Officiating Imam',
};

function PartyConfirmationsPanel({ applicationNumber }: { applicationNumber: string }) {
  const [parties, setParties] = useState<Array<{ role: string; confirmedAt: string | null }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/marriage/applications/by-number/${applicationNumber}/parties`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json) {
          const data = Array.isArray(json) ? json : json?.data ?? [];
          setParties(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [applicationNumber]);

  if (!loaded || parties.length === 0) return null;

  const allConfirmed = parties.every((p) => p.confirmedAt);

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-rmc-green/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-rmc-green" />
        </div>
        <h3 className="font-bold text-gray-900">Party Confirmations</h3>
        {allConfirmed && (
          <span className="ml-auto text-xs font-semibold text-rmc-green bg-rmc-green/10 px-2.5 py-1 rounded-full">
            All confirmed
          </span>
        )}
      </div>
      <ul className="space-y-3">
        {parties.map((p) => (
          <li key={p.role} className="flex items-center gap-3">
            {p.confirmedAt ? (
              <CheckCircle className="w-5 h-5 text-rmc-green shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{ROLE_LABELS[p.role] ?? p.role}</p>
              {p.confirmedAt && (
                <p className="text-xs text-gray-400">
                  Confirmed {new Date(p.confirmedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.confirmedAt ? 'bg-rmc-green/10 text-rmc-green' : 'bg-amber-50 text-amber-600'}`}>
              {p.confirmedAt ? 'Confirmed' : 'Pending'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  marriageApi,
  type MarriageApplication,
  type MarriageApplicationStatus,
} from '@/lib/marriageApi';

const PAYMENT_ICONS = { momo: Smartphone, bank: Landmark, cash: Banknote } as const;

// Public-facing linear progress flow — collapses the nine backend states into the
// four milestones an applicant cares about. Terminal / branch states (rejected,
// cancelled, amendments_requested) are surfaced with a dedicated banner instead.
const PUBLIC_FLOW = ['submitted', 'review', 'approved', 'ready'] as const;

function stepIndexFor(status: MarriageApplicationStatus): number {
  switch (status) {
    case 'draft':
    case 'submitted':
      return 0;
    case 'under_review':
    case 'amendments_requested':
      return 1;
    case 'approved':
    case 'completed':
      return 2;
    case 'closed':
      return 3;
    default:
      return 0;
  }
}

// The date a public milestone was reached, sourced from the status-history trail
// (with reliable fallbacks for the first/last steps).
function stageDateFor(app: MarriageApplication, stage: string): string | null {
  const hist = (s: string) => app.statusHistory?.find((h) => h.toStatus === s)?.changedAt ?? null;
  switch (stage) {
    case 'submitted':
      return app.submittedAt ?? hist('submitted') ?? app.createdAt;
    case 'review':
      return hist('under_review');
    case 'approved':
      return hist('approved');
    case 'ready':
      return app.certificateIssuedAt ?? hist('closed');
    default:
      return null;
  }
}

export function MarriageStatusChecker() {
  const t = useTranslations('services.marriage');
  const { locale } = useParams<{ locale: string }>();
  const searchParams = useSearchParams();

  const [id, setId] = useState('');
  const [result, setResult] = useState<MarriageApplication | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (value: string) => {
    const num = value.trim();
    if (!num) return;
    setLoading(true);
    setSearched(true);
    try {
      const app = await marriageApi.getByNumber(num);
      setResult(app);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-check when arriving with ?id= (from the application success screen or a
  // certificate / verification link).
  useEffect(() => {
    const queryId = searchParams.get('id');
    if (queryId) {
      setId(queryId.toUpperCase());
      lookup(queryId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(id);
  };

  return (
    <div className="space-y-8">
      {/* Search box */}
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Input
              label={t('status.idLabel')}
              value={id}
              onChange={(e) => setId(e.target.value.toUpperCase())}
              placeholder={t('status.idPlaceholder')}
              leftIcon={<Search className="w-4 h-4" />}
              inputSize="lg"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={id.trim().length === 0 || loading}
            leftIcon={
              loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />
            }
            className="!bg-gradient-to-br !from-rose-600 !to-rose-800 !text-white hover:!shadow-lg hover:!shadow-rose-900/30 focus:!ring-rose-500 sm:w-auto"
          >
            {loading ? t('status.checking') : t('status.checkButton')}
          </Button>
        </div>
      </form>

      {/* Not found */}
      {searched && !loading && !result && (
        <div className="flex gap-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 animate-fade-in">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-900 mb-1">{t('status.notFoundTitle')}</h3>
            <p className="text-amber-900/80 text-sm leading-relaxed">{t('status.notFoundText')}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {!loading && result && <StatusResult app={result} locale={locale} />}
    </div>
  );
}

function StatusResult({ app, locale }: { app: MarriageApplication; locale: string }) {
  const t = useTranslations('services.marriage');
  const currentIndex = stepIndexFor(app.status);
  const isClosed = app.status === 'closed' && !!app.certificateIssuedAt;
  const isTerminal = app.status === 'rejected' || app.status === 'cancelled';

  const showProvisional = app.paymentStatus === 'paid' && !isClosed;

  const venueTitle =
    app.venueType === 'mosque' ? t('apply.venueMosqueTitle') : t('apply.venueOutsideTitle');
  const VenueIcon = app.venueType === 'mosque' ? Building2 : MapPin;
  const fee = app.amountDue ? `${Number(app.amountDue).toLocaleString()} RWF` : (app.venueType === 'mosque' ? t('apply.feeMosque') : t('apply.feeOutside'));

  const payment = app.paymentMethod
    ? t(`apply.pay${app.paymentMethod === 'momo' ? 'Momo' : app.paymentMethod === 'bank' ? 'Bank' : 'Cash'}`)
    : '—';
  const PaymentIcon = app.paymentMethod ? PAYMENT_ICONS[app.paymentMethod] : Banknote;

  const submittedRaw = app.submittedAt ?? app.createdAt;
  const submitted = submittedRaw
    ? new Date(submittedRaw).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';
  const location = [app.province, app.district].filter(Boolean).join(' — ') || '—';

  return (
    <div className="animate-fade-up space-y-6">
      {/* Certificate ready — prominent link to the issued certificate */}
      {isClosed && (
        <Link
          href={`/${locale}/certificates/${app.applicationNumber}`}
          className="group flex items-center gap-4 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 text-white p-5 sm:p-6 shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold">{t('status.certificateReadyTitle')}</p>
            <p className="text-white/80 text-sm">
              {app.certificateIssuedAt
                ? `${t('status.issuedOn')} ${new Date(app.certificateIssuedAt).toLocaleDateString(
                    locale,
                    { year: 'numeric', month: 'long', day: 'numeric' },
                  )}`
                : t('status.certificateReadyText')}
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium ring-1 ring-white/25 group-hover:bg-white/25 transition-colors shrink-0">
            <Award className="w-4 h-4" /> {t('status.viewCertificate')}
          </span>
        </Link>
      )}

      {/* Provisional certificate — available as soon as payment is completed */}
      {showProvisional && (
        <Link
          href={`/${locale}/certificates/${app.applicationNumber}/provisional`}
          className="group flex items-center gap-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 sm:p-6"
        >
          <div className="w-12 h-12 rounded-xl bg-rmc-green/10 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-rmc-green" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">Provisional certificate ready</p>
            <p className="text-gray-500 text-sm">
              Payment received — preview and download your provisional marriage certificate.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-rmc-green/10 px-4 py-2 text-sm font-medium text-rmc-green group-hover:bg-rmc-green/20 transition-colors shrink-0">
            <Download className="w-4 h-4" /> Download
          </span>
        </Link>
      )}

      {/* Branch / terminal state banners */}
      {app.status === 'amendments_requested' && (
        <StateBanner
          tone="amber"
          icon={<AlertTriangle className="w-6 h-6" />}
          title={t('status.banner.amendmentsTitle')}
          text={app.amendmentsRequestedText || t('status.banner.amendmentsText')}
        />
      )}
      {app.status === 'rejected' && (
        <StateBanner
          tone="red"
          icon={<XCircle className="w-6 h-6" />}
          title={t('status.banner.rejectedTitle')}
          text={app.rejectionReason || t('status.banner.rejectedText')}
        />
      )}
      {app.status === 'cancelled' && (
        <StateBanner
          tone="gray"
          icon={<XCircle className="w-6 h-6" />}
          title={t('status.banner.cancelledTitle')}
          text={t('status.banner.cancelledText')}
        />
      )}

      {/* Header card — matches the top-nav background */}
      <div className="rounded-2xl bg-rmc-green-deep text-white p-6 sm:p-8 shadow-lg ring-1 ring-white/10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25">
            <Heart className="w-6 h-6 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-white/70 text-xs">{t('status.detailsTitle')}</p>
            <p className="text-xl font-bold tracking-wider">{app.applicationNumber}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Detail
            label={t('status.couple')}
            value={`${app.groomName} & ${app.brideName}`}
            icon={<Heart className="w-4 h-4" />}
          />
          <Detail
            label={t('status.submittedOn')}
            value={submitted}
            icon={<Calendar className="w-4 h-4" />}
          />
          <Detail label={t('status.location')} value={location} icon={<MapPin className="w-4 h-4" />} />
          <Detail
            label={t('status.venue')}
            value={`${venueTitle} — ${fee}`}
            icon={<VenueIcon className="w-4 h-4" />}
          />
          <Detail
            label={t('status.payment')}
            value={payment}
            icon={<PaymentIcon className="w-4 h-4" />}
          />
          {app.requestedOfficiant && (
            <Detail
              label={t('status.officiant')}
              value={app.requestedOfficiant}
              icon={<UserCheck className="w-4 h-4" />}
            />
          )}
        </div>
      </div>

      {/* Wedding photo — only public once the certificate has been issued */}
      {isClosed && app.weddingPhotoUrl && (
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={app.weddingPhotoUrl}
            alt={`${app.groomName} & ${app.brideName}`}
            className="w-full object-cover max-h-72"
          />
        </div>
      )}

      {/* Party Confirmations */}
      <PartyConfirmationsPanel applicationNumber={app.applicationNumber} />

      {/* Status tracker — hidden for terminal states (a banner already explains them) */}
      {!isTerminal && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sm:p-8">
          <h3 className="font-bold text-gray-900 mb-6">{t('status.currentStatus')}</h3>
          <ol className="relative">
            <div className="absolute start-[15px] top-2 bottom-2 w-px bg-gray-200" />
            {PUBLIC_FLOW.map((stage, i) => {
              const done = i < currentIndex || (isClosed && i <= currentIndex);
              const active = !done && i === currentIndex;
              const rawDate = done || active ? stageDateFor(app, stage) : null;
              const dateLabel = rawDate
                ? new Date(rawDate).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : null;
              return (
                <li key={stage} className="relative flex gap-4 pb-8 last:pb-0">
                  <span
                    className={cn(
                      'relative z-10 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ring-4 ring-white',
                      done && 'bg-rose-600 text-white',
                      active &&
                        'bg-gradient-to-br from-rose-600 to-rose-800 text-white shadow-md shadow-rose-900/30',
                      !done && !active && 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className={cn('pt-1', !done && !active && 'opacity-50')}>
                    <p className={cn('font-semibold', active ? 'text-rose-700' : 'text-gray-900')}>
                      {t(`status.stages.${stage}`)}
                    </p>
                    <p className="text-gray-500 text-sm mt-0.5">{t(`status.stageDesc.${stage}`)}</p>
                    {dateLabel && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {dateLabel}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function StateBanner({
  tone,
  icon,
  title,
  text,
}: {
  tone: 'amber' | 'red' | 'gray';
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  const tones = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
  } as const;
  const iconTones = { amber: 'text-amber-600', red: 'text-red-600', gray: 'text-gray-500' } as const;
  return (
    <div className={cn('flex gap-4 border-2 rounded-2xl p-6 animate-fade-in', tones[tone])}>
      <span className={cn('shrink-0 mt-0.5', iconTones[tone])}>{icon}</span>
      <div>
        <h3 className="font-bold mb-1">{title}</h3>
        <p className="text-sm leading-relaxed opacity-80">{text}</p>
      </div>
    </div>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-white/60 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-white/60 text-xs">{label}</p>
        <p className="font-semibold break-words">{value}</p>
      </div>
    </div>
  );
}
