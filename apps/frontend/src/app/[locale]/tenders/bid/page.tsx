'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TrackByOtp } from '@/components/services/shared/TrackByOtp';
import { TenderDocumentsStep } from '@/components/services/tender/TenderDocumentsStep';
import { publicApi } from '@/lib/public-api';
import { resolveI18n } from '@/lib/tendersApi';
import { cn } from '@/lib/utils';
import { clearBidSession, readBidSession, storeBidSession } from '@/lib/bidSession';
import {
  STATUS_COLORS,
  openTrackedBidDocument,
  trackedBidApi,
  uploadBidDocumentByTracking,
  type TenderDocumentPayload,
  type TenderDocumentType,
  type TenderMoreInfoField,
  type TrackedBid,
} from '@/lib/tenderApplicationApi';

// Same rules the apply wizard enforces — an edit must not be able to save a bid
// the original form would have rejected.
const PHONE_RE = /^07[2389][0-9]{7}$/;
const TIN_RE = /^[0-9]{9}$/;
const COVER_NOTE_MAX = 2000;

/** +250781234567 (API format) → 0781234567 (what the user sees/types). */
const toLocalPhone = (e164: string) => (e164?.startsWith('+250') ? `0${e164.slice(4)}` : e164);
/** 0781234567 (what the user types) → +250781234567 (API format). */
const toE164Phone = (local: string) => (local?.startsWith('0') ? `+250${local.slice(1)}` : local);

// Zod messages are i18n *keys*, resolved through t() at render — never English literals.
const editSchema = z.object({
  companyName: z.string().min(2, 'tooShort').max(200, 'tooLong'),
  companyTin: z.string().regex(TIN_RE, 'tinFormat'),
  contactName: z.string().min(3, 'tooShort').max(150, 'tooLong'),
  phone: z.string().regex(PHONE_RE, 'phoneFormat'),
  email: z.string().email('invalidEmail').optional().or(z.literal('')),
  districtId: z.string().optional().or(z.literal('')),
  sectorId: z.string().optional().or(z.literal('')),
  cell: z.string().max(100).optional().or(z.literal('')),
  village: z.string().max(100).optional().or(z.literal('')),
  bidAmount: z.string().optional().or(z.literal('')),
  coverNote: z.string().max(COVER_NOTE_MAX).optional().or(z.literal('')),
});
type EditData = z.infer<typeof editSchema>;

const DOC_ORDER: TenderDocumentType[] = ['rdb_certificate', 'tax_clearance', 'proposal'];

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * The bidder's own bid, reached from the tenders page by tracking code + SMS OTP
 * — no login. Shows everything they submitted, lets them open their attachments
 * (which are not readable by URL), and lets them correct the bid for as long as
 * the backend says it is still editable.
 *
 * The session token lives in sessionStorage, not the URL, so this page is not
 * shareable and cannot be deep-linked into. Arriving without one — or after the
 * 15-minute token lapses — drops the visitor onto the OTP gate right here rather
 * than bouncing them back to the tenders page to start over.
 */
export default function TenderBidPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('services.tender.bid');

  const [token, setToken] = useState<string | null>(null);
  const [bid, setBid] = useState<TrackedBid | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  const load = useCallback(async (sessionToken: string) => {
    setLoading(true);
    try {
      setBid(await trackedBidApi.get(sessionToken));
      setToken(sessionToken);
      setExpired(false);
    } catch {
      // The only failure that matters here is "no longer a valid session" — the
      // token is the sole credential, so anything else is equally unrecoverable.
      clearBidSession();
      setToken(null);
      setBid(null);
      setExpired(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = readBidSession();
    if (!stored) {
      setLoading(false);
      return;
    }
    load(stored);
  }, [load]);

  return (
    <div className="min-h-screen">
      {/* `solid` because this page opens straight onto a light background. The
          bar is transparent-with-white-text by default, for the dark PageHero it
          usually floats over — without this it paints white on near-white and
          disappears. */}
      <Navbar solid />
      <main>
        <section className="pt-24 md:pt-28 pb-12 sm:pb-14 bg-gray-50 pattern-light">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <PageHeaderCard bid={bid} />

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-7 w-7 animate-spin text-rmc-green" />
              </div>
            ) : bid && token ? (
              <BidView bid={bid} token={token} onReload={() => load(token)} />
            ) : (
              <SessionGate expired={expired} onVerified={load} />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/**
 * Standing header — back link, eyebrow, title and chips — matching the tender
 * detail page. Rendered in every state, so the page has the same shape whether it
 * is loading, asking for an OTP, or showing a bid; the title falls back to a
 * generic heading until a bid is actually loaded.
 */
function PageHeaderCard({ bid }: { bid: TrackedBid | null }) {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('services.tender.bid');
  const status = useTranslations('services.tender.status');

  const title = bid ? resolveI18n(bid.tenderTitleI18n, bid.tenderTitle ?? '', locale) : '';

  return (
    <div className="mb-6 rounded-lg border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <Link
        href={`/${locale}/services/tender`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-rmc-green"
      >
        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t('backToTenders')}
      </Link>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-rmc-green">
        {t('eyebrow')}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
        {bid ? bid.companyName : t('heroTitle')}
      </h1>

      {bid ? (
        <>
          <p className="mt-1.5 font-mono text-xs text-gray-400">{bid.applicationNumber}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-semibold',
                STATUS_COLORS[bid.status],
              )}
            >
              {status(`statusLabel.${bid.status}`)}
            </span>
            {bid.tenderDeadline && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-500">
                <Calendar className="h-3 w-3" />
                {t('deadline')}: {new Date(bid.tenderDeadline).toLocaleDateString(locale)}
              </span>
            )}
          </div>
          {title && (
            <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-500">
              {t('tender')}:{' '}
              {bid.tenderSlug ? (
                <Link
                  href={`/${locale}/tenders/${bid.tenderSlug}`}
                  className="font-semibold text-rmc-green hover:underline"
                >
                  {title}
                </Link>
              ) : (
                <span className="font-semibold text-gray-900">{title}</span>
              )}
            </p>
          )}
        </>
      ) : (
        <p className="mt-1.5 text-sm text-gray-500">{t('heroSubtitle')}</p>
      )}
    </div>
  );
}

/**
 * No session (or a lapsed one) — verify here rather than sending the bidder back
 * to the tenders page, so a refresh after the token expires costs one OTP, not a
 * lost place in the flow.
 */
function SessionGate({
  expired,
  onVerified,
}: {
  expired: boolean;
  onVerified: (token: string) => void;
}) {
  const t = useTranslations('services.tender.bid');
  const landing = useTranslations('services.tender.landing');

  return (
    <div className="mx-auto max-w-md rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
      {expired && (
        <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('sessionExpired')}
        </div>
      )}
      <TrackByOtp
        basePath="/tenders/applications/track"
        accent="green"
        title={landing('statusTitle')}
        subtitle={landing('statusText')}
        codePlaceholder={landing('trackPlaceholder')}
        codeHint={landing('trackHint')}
        onVerified={(_info, session) => {
          storeBidSession(session.token);
          onVerified(session.token);
        }}
      />
    </div>
  );
}

// ── The bid ───────────────────────────────────────────────────────────────────

function BidView({
  bid,
  token,
  onReload,
}: {
  bid: TrackedBid;
  token: string;
  onReload: () => void;
}) {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const t = useTranslations('services.tender.bid');
  const status = useTranslations('services.tender.status');
  const [editing, setEditing] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const signOut = () => {
    clearBidSession();
    router.push(`/${locale}/services/tender`);
  };

  const withdraw = async () => {
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      await trackedBidApi.withdraw(token);
      setConfirmWithdraw(false);
      onReload();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number } })?.response;
      setWithdrawError(res?.status === 401 ? t('sessionExpired') : t('withdrawFailed'));
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Reviewer messages */}
      {bid.status === 'more_info_requested' && bid.moreInfoRequested && (
        <Banner tone="amber" title={status('banner.moreInfoTitle')} body={bid.moreInfoRequested}>
          <MoreInfoChecklist bid={bid} />
        </Banner>
      )}
      {bid.status === 'rejected' && bid.rejectionReason && (
        <Banner tone="red" title={status('banner.rejectedTitle')} body={bid.rejectionReason} />
      )}

      {editing ? (
        <EditForm
          bid={bid}
          token={token}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onReload();
          }}
        />
      ) : (
        <>
          <DetailsCard bid={bid} onEdit={bid.editable ? () => setEditing(true) : undefined} />
          <DocumentsCard bid={bid} token={token} />
        </>
      )}

      {/* Withdrawal is terminal and lives away from the edit controls, so it can't
          be hit while reaching for Save. */}
      {!editing && bid.withdrawable && (
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">{t('withdrawTitle')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('withdrawHint')}</p>
          {withdrawError && (
            <div
              role="alert"
              className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800 ring-1 ring-red-200"
            >
              {withdrawError}
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-3 border-red-200 text-red-600 hover:border-red-300 hover:text-red-700"
            leftIcon={<Ban className="h-4 w-4" />}
            onClick={() => setConfirmWithdraw(true)}
          >
            {t('withdraw')}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          {t('submittedOn')}: {new Date(bid.submittedAt).toLocaleDateString(locale)}
        </p>
        <button onClick={signOut} className="text-xs font-medium text-gray-500 hover:text-gray-700">
          {t('endSession')}
        </button>
      </div>

      <ConfirmModal
        open={confirmWithdraw}
        onClose={() => setConfirmWithdraw(false)}
        onConfirm={withdraw}
        title={t('withdrawConfirmTitle')}
        message={t('withdrawConfirmBody')}
        confirmLabel={t('withdraw')}
        cancelLabel={t('cancel')}
        variant="danger"
        isLoading={withdrawing}
      />
    </div>
  );
}

function Banner({
  tone,
  title,
  body,
  children,
}: {
  tone: 'amber' | 'red';
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const styles =
    tone === 'amber'
      ? 'bg-amber-50 ring-amber-100 text-amber-700'
      : 'bg-red-50 ring-red-100 text-red-600';
  return (
    <div className={cn('rounded-lg px-4 py-3 ring-1', styles)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-sm leading-relaxed">{body}</p>
      {children}
    </div>
  );
}

/**
 * Spells out exactly what the reviewer asked for. The note is free text and often
 * vague ("your paperwork is out of date"); this is the authoritative list, and it
 * matches precisely what the edit form will let the bidder change.
 */
function MoreInfoChecklist({ bid }: { bid: TrackedBid }) {
  const t = useTranslations('services.tender.bid');
  const apply = useTranslations('services.tender.apply');

  if (!bid.moreInfoFields.length && !bid.moreInfoDocumentTypes.length) return null;

  return (
    <div className="mt-3 border-t border-amber-200/70 pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide">{t('checklistTitle')}</p>
      <ul className="mt-1.5 space-y-1 text-sm text-amber-800">
        {bid.moreInfoFields.map((field) => (
          <li key={field} className="flex items-start gap-2">
            <span aria-hidden>•</span> {t(`field.${field}`)}
          </li>
        ))}
        {bid.moreInfoDocumentTypes.map((docType) => (
          <li key={docType} className="flex items-start gap-2">
            <span aria-hidden>•</span> {apply(`docs.${docType}.label`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DetailsCard({ bid, onEdit }: { bid: TrackedBid; onEdit?: () => void }) {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('services.tender.bid');

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-900">{t('detailsTitle')}</h2>
        {onEdit ? (
          <Button size="xs" variant="outline" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>
            {t('edit')}
          </Button>
        ) : (
          // Says WHY rather than just hiding the button — a bidder who cannot
          // find Edit will otherwise assume the page is broken.
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <Lock className="h-3.5 w-3.5" /> {t('lockedHint')}
          </span>
        )}
      </div>

      <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        <Field label={t('contactName')} value={bid.contactName} />
        <Field label={t('tin')} value={bid.companyTin} />
        <Field label={t('phone')} value={bid.phone} />
        <Field label={t('email')} value={bid.email ?? '—'} />
        <Field
          label={t('bidAmount')}
          value={bid.bidAmount != null ? `${Number(bid.bidAmount).toLocaleString(locale)} RWF` : '—'}
        />
        <Field
          label={t('address')}
          value={[bid.cell, bid.village].filter(Boolean).join(', ') || '—'}
        />
      </dl>

      {bid.coverNote && (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {t('coverNote')}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
            {bid.coverNote}
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-gray-900">{value}</dd>
    </div>
  );
}

function DocumentsCard({ bid, token }: { bid: TrackedBid; token: string }) {
  const t = useTranslations('services.tender.bid');
  const docs = useTranslations('services.tender.apply');
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (documentId: string) => {
    setOpening(documentId);
    setError(null);
    try {
      await openTrackedBidDocument(token, documentId);
    } catch {
      setError(t('openFailed'));
    } finally {
      setOpening(null);
    }
  };

  const ordered = [...bid.documents].sort(
    (a, b) => DOC_ORDER.indexOf(a.docType) - DOC_ORDER.indexOf(b.docType),
  );

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-bold text-gray-900">{t('documentsTitle')}</h2>

      {error && (
        <div role="alert" className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <ul className="space-y-2">
        {ordered.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50">
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{docs(`docs.${doc.docType}.label`)}</p>
              <p className="truncate text-xs text-gray-400">
                {doc.fileName} · {fmtSize(doc.fileSize)}
              </p>
            </div>
            <Button
              size="xs"
              variant="outline"
              isLoading={opening === doc.id}
              leftIcon={<Eye className="h-3.5 w-3.5" />}
              onClick={() => open(doc.id)}
            >
              {t('view')}
            </Button>
          </li>
        ))}
      </ul>

      <p className="mt-4 inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-400">
        <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" /> {t('documentsPrivacy')}
      </p>
    </div>
  );
}

// ── Edit ──────────────────────────────────────────────────────────────────────

function EditForm({
  bid,
  token,
  onCancel,
  onSaved,
}: {
  bid: TrackedBid;
  token: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('services.tender.bid');
  const apply = useTranslations('services.tender.apply');

  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The reviewer's scope, straight from the backend. A group they did not name is
   * not rendered at all — showing a disabled copy of the whole form would just be
   * a wall of greyed-out boxes. The same list is enforced on the update, so this
   * is presentation, not protection.
   */
  const allows = (field: TenderMoreInfoField) => bid.editableFields.includes(field);
  const allowedDocs = bid.editableDocuments;

  // The slots start seeded from the saved bid, so `documents` is complete from
  // the first render. It is only SENT when a key actually differs: the backend
  // replaces each supplied document, which would otherwise churn rows — and clear
  // the reviewer's verification flags — on every text-only edit.
  const [documents, setDocuments] = useState<TenderDocumentPayload[] | null>(null);
  const [docsBusy, setDocsBusy] = useState(false);

  // Compared against the same subset the slots offer: under a scoped request
  // `documents` holds only the requested types, so measuring it against all three
  // would always look changed.
  const keyOf = (docs: { docType: TenderDocumentType; fileKey: string }[]) =>
    docs
      .filter((d) => allowedDocs.includes(d.docType))
      .map((d) => `${d.docType}:${d.fileKey}`)
      .sort()
      .join('|');

  const documentsChanged = documents !== null && keyOf(documents) !== keyOf(bid.documents);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditData>({
    resolver: zodResolver(editSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    // Seeded in the initializer, not an effect: react-hook-form reads
    // defaultValues once at mount, so a later value is silently ignored.
    defaultValues: {
      companyName: bid.companyName,
      companyTin: bid.companyTin,
      contactName: bid.contactName,
      phone: toLocalPhone(bid.phone),
      email: bid.email ?? '',
      districtId: bid.districtId ?? '',
      sectorId: bid.sectorId ?? '',
      cell: bid.cell ?? '',
      village: bid.village ?? '',
      bidAmount: bid.bidAmount != null ? String(bid.bidAmount) : '',
      coverNote: bid.coverNote ?? '',
    },
  });

  const districtId = watch('districtId');
  const coverNote = watch('coverNote') ?? '';

  useEffect(() => {
    publicApi.getDistricts().then(setDistricts).catch(() => setDistricts([]));
  }, []);

  useEffect(() => {
    if (!districtId) {
      setSectors([]);
      return;
    }
    publicApi.getSectors(districtId).then(setSectors).catch(() => setSectors([]));
  }, [districtId]);

  const onSubmit = async (data: EditData) => {
    setSaving(true);
    setError(null);
    try {
      // Only the groups the reviewer opened are sent. The backend ignores
      // anything outside the scope regardless — this just keeps the request
      // honest about what the bidder was actually offered.
      await trackedBidApi.update(token, {
        ...(allows('company')
          ? { companyName: data.companyName, companyTin: data.companyTin }
          : {}),
        ...(allows('contact') ? { contactName: data.contactName } : {}),
        ...(allows('phone') ? { phone: toE164Phone(data.phone) } : {}),
        ...(allows('email') ? { email: data.email || undefined } : {}),
        ...(allows('address')
          ? {
              districtId: data.districtId || undefined,
              sectorId: data.sectorId || undefined,
              cell: data.cell || undefined,
              village: data.village || undefined,
            }
          : {}),
        ...(allows('bid_amount')
          ? { bidAmount: data.bidAmount ? Number(data.bidAmount) : undefined }
          : {}),
        ...(allows('cover_note') ? { coverNote: data.coverNote || undefined } : {}),
        ...(documentsChanged && documents ? { documents } : {}),
      });
      onSaved();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { error?: { message?: string } } } })
        ?.response;
      const message = res?.data?.error?.message;
      setError(
        res?.status === 401
          ? t('sessionExpired')
          : res?.status === 403
            ? t('noLongerEditable')
            : Array.isArray(message)
              ? message.join(', ')
              : message || t('saveFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  // A replacement is mid-flight, or one was cleared and not replaced — saving now
  // would post an incomplete set, so hold the button until it settles. Guarded on
  // there being documents in scope at all: with none, the step never renders, so
  // `documents` stays null and this would disable Save forever.
  const docsIncomplete = allowedDocs.length > 0 && (docsBusy || documents === null);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4 rounded-lg border border-gray-100 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-900">{t('editTitle')}</h2>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <X className="h-3.5 w-3.5" /> {t('cancel')}
        </button>
      </div>

      {allows('company') && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={apply('companyName')}
            required
            {...register('companyName')}
            error={errors.companyName && apply('companyNameError')}
          />
          <Input
            label={apply('companyTin')}
            required
            maxLength={9}
            {...register('companyTin')}
            error={errors.companyTin && apply('tinFormatError')}
          />
        </div>
      )}

      {(allows('contact') || allows('phone')) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {allows('contact') && (
            <Input
              label={apply('contactName')}
              required
              {...register('contactName')}
              error={errors.contactName && apply('contactNameError')}
            />
          )}
          {allows('phone') && (
            <Input
              label={apply('phone')}
              required
              placeholder="0781234567"
              maxLength={10}
              {...register('phone')}
              error={errors.phone && apply('phoneFormatError')}
              hint={!errors.phone ? apply('phoneHint') : undefined}
            />
          )}
        </div>
      )}

      {allows('email') && (
        <Input
          label={`${apply('email')} (${apply('optional')})`}
          type="email"
          {...register('email')}
          error={errors.email && apply('emailError')}
        />
      )}

      {allows('address') && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={`${apply('district')} (${apply('optional')})`}
              placeholder={apply('districtPlaceholder')}
              {...register('districtId', { onChange: () => setValue('sectorId', '') })}
              options={districts.map((d) => ({ value: d.id, label: d.name }))}
            />
            <Select
              label={`${apply('sector')} (${apply('optional')})`}
              placeholder={districtId ? apply('sectorPlaceholder') : apply('selectDistrictFirst')}
              disabled={!districtId}
              {...register('sectorId')}
              options={sectors.map((s) => ({ value: s.id, label: s.name }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={`${apply('cell')} (${apply('optional')})`}
              maxLength={100}
              {...register('cell')}
            />
            <Input
              label={`${apply('village')} (${apply('optional')})`}
              maxLength={100}
              {...register('village')}
            />
          </div>
        </>
      )}

      {allows('bid_amount') && (
        <Input
          label={`${apply('bidAmount')} (${apply('optional')})`}
          type="number"
          min={0}
          inputMode="numeric"
          rightAddon="RWF"
          {...register('bidAmount')}
          hint={apply('bidAmountHint')}
        />
      )}

      {allows('cover_note') && (
        <Textarea
          label={`${apply('coverNote')} (${apply('optional')})`}
          rows={4}
          maxLength={COVER_NOTE_MAX}
          {...register('coverNote')}
          hint={`${coverNote.length}/${COVER_NOTE_MAX}`}
        />
      )}

      {/* Documents. Untouched slots keep the file already on the bid; replacing
          one re-uploads through the tracking session, never the file server. */}
      {allowedDocs.length > 0 && (
      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-sm font-bold text-gray-900">{t('documentsTitle')}</h3>
        <p className="mb-4 mt-1 text-xs text-gray-400">{t('documentsEditHint')}</p>
        <TenderDocumentsStep
          embedded
          initialDocuments={bid.documents.map((doc) => ({
            docType: doc.docType,
            fileKey: doc.fileKey,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            fileSize: doc.fileSize,
          }))}
          upload={(file, docType, onProgress) =>
            uploadBidDocumentByTracking(token, file, docType, onProgress)
          }
          onChange={(docs, busy) => {
            setDocuments(docs);
            setDocsBusy(busy);
          }}
          allowedDocTypes={allowedDocs}
        />
      </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          isLoading={saving}
          disabled={docsIncomplete}
          leftIcon={<CheckCircle2 className="h-4 w-4" />}
        >
          {t('save')}
        </Button>
      </div>
    </form>
  );
}
