'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Moon, UserRound, Phone, Mail, MapPin, CalendarClock, Landmark,
  FileText, Download, StickyNote, AlertCircle, Loader2, SlidersHorizontal,
  Fingerprint, Cake, Activity, Truck, Clock, CalendarDays, Hourglass, Eye, X,
} from 'lucide-react';
import { funeralApi } from '@/lib/funeralApi';
import { buildStepLabels } from '@/components/funeral/stepLabels';
import { FuneralTimeline } from '@/components/funeral/FuneralTimeline';
import { FuneralProgress } from '@/components/funeral/FuneralProgress';
import { RequestStageDialog } from '@/components/funeral/RequestStageDialog';
import { type FuneralRequest, type FuneralStepConfig } from '@/components/funeral/types';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';

export default function AdminFuneralRequestPage() {
  return (
    <ProtectedRoute permissions={[Permission.FUNERAL_VIEW]}>
      <RequestDetail />
    </ProtectedRoute>
  );
}

function RequestDetail() {
  const t = useTranslations('services.funeral');
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.FUNERAL_MANAGE);
  const params = useParams();
  const locale = String(params.locale);
  const id = String(params.id);

  const [request, setRequest] = useState<FuneralRequest | null>(null);
  const [steps, setSteps] = useState<FuneralStepConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [managing, setManaging] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      funeralApi.getRequest(id).catch(() => null),
      funeralApi.listSteps().catch(() => [] as FuneralStepConfig[]),
    ]).then(([req, st]) => {
      if (!active) return;
      setRequest(req);
      setSteps(st);
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  const back = (
    <Link
      href={`/${locale}/admin/funeral`}
      className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green-deep px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rmc-green-dark"
    >
      <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> {t('detail.back')}
    </Link>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-28">
        <Loader2 className="h-7 w-7 animate-spin text-rmc-green" aria-hidden="true" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-4 ring-amber-100">
          <AlertCircle className="h-7 w-7 text-amber-500" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-bold text-gray-900">{t('detail.notFoundTitle')}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">{t('detail.notFoundText')}</p>
        <div className="mt-6">{back}</div>
      </div>
    );
  }

  const { deceased, family, arrangements, timeline, stage, createdAt } = request;

  const stepLabels = buildStepLabels(steps, locale);
  const stageLabel = (s: string) => stepLabels.stages[s] ?? s;
  const stageColor = stepLabels.colors?.[stage];
  const timelineLabels = {
    ...stepLabels,
    status: { done: t('stageStatus.done'), active: t('stageStatus.active'), pending: t('stageStatus.pending') },
  };

  const doneCount = timeline.filter((s) => s.status === 'done').length;
  const dod = new Date(deceased.dateOfDeath);
  const dob = deceased.dateOfBirth ? new Date(deceased.dateOfBirth) : null;

  const fmtLong = (v?: string | Date | null) =>
    v ? new Date(v).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : t('detail.none');
  const fmtDate = (v?: string) => fmtLong(v);

  // Facts
  const ageAtDeath = dob ? Math.max(0, Math.floor((dod.getTime() - dob.getTime()) / 31557600000)) : null;
  const daysSince = Math.max(0, Math.floor((Date.now() - dod.getTime()) / 86400000));

  const saveStage = async (next: string) => {
    setSaving(true);
    try {
      const updated = await funeralApi.updateRequestStage(request.id, next);
      setRequest(updated);
      setManaging(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {canManage && (
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => setManaging(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green px-4 py-2 text-sm font-bold text-white shadow-sm shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> {t('detail.manage')}
          </button>
        </div>
      )}

      {/* Header card */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-rmc-green-deep via-slate-900 to-rmc-green-deep text-white shadow-sm">
        <div className="relative p-6">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-20" aria-hidden="true" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                <Moon className="h-6 w-6 text-rmc-gold-light" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-bold drop-shadow-lg">{deceased.fullName}</h1>
                <p className="mt-1 text-sm text-white/70">
                  {t(`request.deceased.${deceased.gender}`)} · {t('request.deceased.dod')}: {fmtLong(dod)}
                  {ageAtDeath !== null && <> · {t('detail.ageAtDeath')}: {ageAtDeath}</>}
                </p>
              </div>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[12px] font-bold ring-1 ring-inset ring-white/25"
              style={stageColor ? { backgroundColor: stageColor, color: '#fff' } : { backgroundColor: '#eab308', color: '#0b3d2e' }}
            >
              {stageLabel(stage)}
            </span>
          </div>
        </div>
      </section>

      {/* Facts strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Fact icon={CalendarDays} label={t('detail.submitted')} value={fmtLong(createdAt)} />
        <Fact icon={Hourglass} label={t('detail.daysSinceDeath')} value={String(daysSince)} />
        <Fact icon={Phone} label={t('request.family.phone')} value={family.phone} href={`tel:${family.phone.replace(/\s+/g, '')}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left: progress + timeline + notes ── */}
        <div className="space-y-6 lg:col-span-2">
          <SectionCard icon={CalendarClock} title={t('status.timelineTitle')}>
            <FuneralProgress
              done={doneCount}
              total={timeline.length}
              label={t('status.progressLabel', { done: doneCount, total: timeline.length })}
            />
            <div className="mt-6">
              <FuneralTimeline steps={timeline} labels={timelineLabels} locale={locale} />
            </div>
          </SectionCard>

          <SectionCard icon={StickyNote} title={t('detail.notes')}>
            {arrangements.notes ? (
              <p className="text-[13px] leading-relaxed text-gray-600">{arrangements.notes}</p>
            ) : (
              <p className="text-[13px] text-gray-400">{t('detail.noNotes')}</p>
            )}
          </SectionCard>
        </div>

        {/* ── Right: details ── */}
        <div className="space-y-6">
          {/* Deceased details */}
          <SectionCard icon={UserRound} title={t('request.deceased.heading')}>
            <dl className="space-y-2.5">
              <InfoRow icon={UserRound} label={t('request.deceased.gender')} value={t(`request.deceased.${deceased.gender}`)} />
              {dob && <InfoRow icon={Cake} label={t('request.deceased.dob')} value={fmtLong(dob)} />}
              <InfoRow icon={CalendarClock} label={t('request.deceased.dod')} value={fmtLong(dod)} />
              {deceased.nationalId && <InfoRow icon={Fingerprint} label={t('request.deceased.nationalId')} value={deceased.nationalId} mono />}
              {deceased.placeOfDeath && <InfoRow icon={MapPin} label={t('request.deceased.placeOfDeath')} value={deceased.placeOfDeath} />}
              {deceased.causeOfDeath && <InfoRow icon={Activity} label={t('request.deceased.cause')} value={deceased.causeOfDeath} />}
            </dl>
          </SectionCard>

          {/* Family contact */}
          <SectionCard icon={UserRound} title={t('request.family.heading')}>
            <dl className="space-y-2.5">
              <InfoRow icon={UserRound} label={t('request.family.nextOfKin')} value={family.nextOfKin} />
              <InfoRow icon={Phone} label={t('request.family.phone')} value={family.phone} href={`tel:${family.phone.replace(/\s+/g, '')}`} />
              {family.email && <InfoRow icon={Mail} label={t('request.family.email')} value={family.email} href={`mailto:${family.email}`} />}
              <InfoRow icon={MapPin} label={t('request.family.address')} value={family.address} />
              {family.emergencyContact && <InfoRow icon={Phone} label={t('request.family.emergency')} value={family.emergencyContact} href={`tel:${family.emergencyContact.replace(/\s+/g, '')}`} />}
            </dl>
          </SectionCard>

          {/* Prayer & burial */}
          <SectionCard icon={Landmark} title={t('detail.prayer')}>
            <dl className="space-y-2.5">
              <InfoRow icon={Landmark} label={t('request.arrangements.mosque')} value={arrangements.preferredMosque || t('detail.none')} />
              <InfoRow icon={MapPin} label={t('request.arrangements.cemetery')} value={arrangements.preferredCemetery || t('detail.none')} />
              <InfoRow icon={CalendarClock} label={t('request.arrangements.burialDate')} value={fmtDate(arrangements.preferredBurialDate)} />
              <InfoRow icon={Clock} label={t('request.arrangements.burialTime')} value={arrangements.preferredBurialTime || t('detail.none')} />
              <InfoRow
                icon={Truck}
                label={t('detail.transport')}
                value={arrangements.transportationRequired ? t('detail.yes') : t('detail.no')}
                accent={arrangements.transportationRequired}
              />
            </dl>
          </SectionCard>

          {/* Documents & attachments — the real uploaded certificate */}
          <SectionCard icon={FileText} title={t('detail.documents')}>
            <DeathCertificateCard requestId={request.id} deceased={deceased} />
          </SectionCard>
        </div>
      </div>

      {managing && (
        <RequestStageDialog
          request={request}
          steps={steps}
          stageLabel={stageLabel}
          onSave={saveStage}
          onClose={() => !saving && setManaging(false)}
        />
      )}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
        <Icon className="h-4 w-4 text-rmc-green" aria-hidden="true" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Fact({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rmc-green/10 text-rmc-green">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
        {href ? (
          <a href={href} className="block truncate text-[13px] font-bold text-gray-900 hover:text-rmc-green">{value}</a>
        ) : (
          <p className="truncate text-[13px] font-bold text-gray-900">{value}</p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, href, mono, accent }: {
  icon: React.ElementType; label: string; value: string; href?: string; mono?: boolean; accent?: boolean;
}) {
  const valueClass = `font-medium ${accent ? 'text-rmc-green' : 'text-gray-800'} ${mono ? 'font-mono tracking-tight' : ''}`;
  const val = href ? (
    <a href={href} className={`${valueClass} hover:text-rmc-green`}>{value}</a>
  ) : (
    <span className={valueClass}>{value}</span>
  );
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
      <div className="min-w-0 text-[13px]">
        <span className="text-gray-400">{label}: </span>
        {val}
      </div>
    </div>
  );
}

// ── Death certificate ────────────────────────────────────────────────────────

/**
 * The real uploaded certificate. It is NOT publicly readable — the file server
 * refuses the key without a token — so the bytes come through the authenticated
 * admin route and render from a blob URL.
 *
 * Reports filed before uploads existed carry only a filename (no mime type). We say
 * so plainly rather than showing a Download button that does nothing.
 */
function DeathCertificateCard({
  requestId,
  deceased,
}: {
  requestId: string;
  deceased: {
    deathCertificate?: string;
    deathCertificateName?: string;
    deathCertificateMime?: string;
    deathCertificateSize?: number;
  };
}) {
  const t = useTranslations('admin.funeral');
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const hasFile = Boolean(deceased.deathCertificate && deceased.deathCertificateMime);
  const isImage = deceased.deathCertificateMime?.startsWith('image/') ?? false;

  useEffect(() => {
    if (!hasFile) return;
    let cancelled = false;
    let objectUrl = '';
    funeralApi
      .deathCertificateObjectUrl(requestId)
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [requestId, hasFile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!deceased.deathCertificate) {
    return <p className="text-[13px] text-gray-400">{t('detail.noDocuments')}</p>;
  }

  // Legacy: a filename with no file behind it.
  if (!hasFile) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-gray-900">{deceased.deathCertificate}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-amber-700">
            {t('detail.certificateLegacy')}
          </p>
        </div>
      </div>
    );
  }

  const name = deceased.deathCertificateName ?? 'death-certificate';
  const sizeKb = deceased.deathCertificateSize
    ? `${Math.max(1, Math.round(deceased.deathCertificateSize / 1024))} KB`
    : '';

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white ring-1 ring-black/5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-28 w-full items-center justify-center bg-gray-50"
          aria-label={`${t('detail.inspect')} ${name}`}
        >
          {failed ? (
            <AlertCircle className="h-7 w-7 text-red-300" aria-hidden="true" />
          ) : isImage && url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={name} className="h-full w-full object-cover" />
          ) : isImage ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" aria-hidden="true" />
          ) : (
            <FileText className="h-8 w-8 text-gray-300" aria-hidden="true" />
          )}
        </button>
        <div className="space-y-1.5 px-3 py-2.5">
          <p className="truncate text-[13px] font-medium text-gray-900">{name}</p>
          {sizeKb && <p className="text-[11px] text-gray-400">{sizeKb}</p>}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
            >
              <Eye className="h-3 w-3" aria-hidden="true" /> {t('detail.inspect')}
            </button>
            <a
              href={url || undefined}
              download={name}
              className={`inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green ${url ? '' : 'pointer-events-none opacity-50'}`}
            >
              <Download className="h-3 w-3" aria-hidden="true" /> {t('detail.download')}
            </a>
          </div>
        </div>
      </div>

      {open && (
        <Portal>
          <div
            className="fixed inset-0 z-[10001] flex flex-col bg-black/85 p-6"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-label={name}
          >
            <div className="mb-3 flex items-center justify-between text-white" onClick={(e) => e.stopPropagation()}>
              <div>
                <p className="text-sm font-semibold">{t('detail.certificate')}</p>
                <p className="text-xs text-white/60">{name} {sizeKb && `· ${sizeKb}`}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {failed ? (
                <p className="rounded-xl bg-white/10 px-5 py-4 text-sm text-white">{t('detail.certificateFailed')}</p>
              ) : !url ? (
                <Loader2 className="h-7 w-7 animate-spin text-white/70" aria-hidden="true" />
              ) : isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={name} className="max-h-full max-w-full rounded-lg object-contain" />
              ) : (
                <iframe src={url} title={name} className="h-full w-full rounded-lg bg-white" />
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

/**
 * Renders into <body>. The admin shell's <main> carries a transform (from the
 * global `main { animation: pageFadeIn … both }`), which makes it the containing
 * block for `position: fixed` children — an overlay rendered in place would be
 * clipped to the content area instead of covering the viewport.
 */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
