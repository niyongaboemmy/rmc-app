import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  ArrowLeft, Moon, UserRound, Phone, Mail, MapPin, CalendarClock, Landmark,
  FileText, Download, Users, Check, X, StickyNote, Hash, AlertCircle,
} from 'lucide-react';
import { funeralApi } from '@/lib/funeralApi';
import { buildStepLabels } from '@/components/funeral/stepLabels';
import { FuneralTimeline } from '@/components/funeral/FuneralTimeline';
import { FuneralProgress } from '@/components/funeral/FuneralProgress';

const SERVICE_ITEMS: { key: string; labelKey: string }[] = [
  { key: 'ghuslRequired', labelKey: 'ghusl' },
  { key: 'kafanRequired', labelKey: 'kafan' },
  { key: 'janazahPrayerRequired', labelKey: 'janazah' },
  { key: 'transportationRequired', labelKey: 'transport' },
  { key: 'gravePreparationRequired', labelKey: 'grave' },
];

export default async function FuneralDetailPage({
  params: { locale, reference },
}: {
  params: { locale: string; reference: string };
}) {
  const t = await getTranslations('services.funeral');
  const ref = decodeURIComponent(reference);
  const request = await funeralApi.getRequestByReference(ref);
  const steps = await funeralApi.listSteps().catch(() => []);

  const back = (
    <Link
      href={`/${locale}/services/funeral`}
      className="mb-8 inline-flex items-center gap-1.5 rounded-full bg-rmc-green-deep px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rmc-green-dark"
    >
      <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> {t('detail.back')}
    </Link>
  );

  if (!request) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="bg-gray-50/60 pattern-light">
          <div className="mx-auto max-w-2xl px-4 py-28 text-center sm:px-6">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-4 ring-amber-100">
              <AlertCircle className="h-7 w-7 text-amber-500" aria-hidden="true" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">{t('detail.notFoundTitle')}</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">{t('detail.notFoundText')}</p>
            <div className="mt-6">{back}</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { deceased, family, arrangements, timeline, stage } = request;

  const stepLabels = buildStepLabels(steps, locale);

  const timelineLabels = {
    ...stepLabels,
    status: { done: t('stageStatus.done'), active: t('stageStatus.active'), pending: t('stageStatus.pending') },
    assigned: t('status.assigned'),
  };

  const doneCount = timeline.filter((s) => s.status === 'done').length;

  // Distinct assigned people, with the stage they're handling.
  const assignments = timeline
    .filter((s) => s.assignedVolunteer)
    .map((s) => ({ name: s.assignedVolunteer as string, stage: s.stage }));
  const seen = new Set<string>();
  const volunteers = assignments.filter((a) => (seen.has(a.name) ? false : (seen.add(a.name), true)));

  const documents = [deceased.deathCertificate].filter(Boolean) as string[];
  const dod = new Date(deceased.dateOfDeath);

  const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : t('detail.none'));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="bg-gray-50/60 pattern-light">
        {/* ── Large header ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-rmc-green-deep via-slate-900 to-rmc-green-deep text-white">
          <div className="pointer-events-none absolute inset-0 pattern-islamic opacity-20" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-4 pt-28 pb-10 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                  <Moon className="h-7 w-7 text-rmc-gold-light" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold drop-shadow-lg md:text-3xl">{deceased.fullName}</h1>
                  <p className="mt-1 text-sm text-white/70">
                    {t(`request.deceased.${deceased.gender}`)} · {t('request.deceased.dod')}: {dod.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-[13px] font-bold text-rmc-gold-light ring-1 ring-white/20">
                  <Hash className="h-3.5 w-3.5" aria-hidden="true" /> {request.reference}
                </span>
                <span className="rounded-full bg-rmc-gold px-3 py-1 text-[12px] font-bold text-rmc-green-deep">
                  {stepLabels.stages[stage] ?? stage}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          {back}

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
                  <InfoRow icon={CalendarClock} label={t('request.arrangements.burialTime')} value={arrangements.preferredBurialTime || t('detail.none')} />
                </dl>
              </SectionCard>

              {/* Service checklist */}
              <SectionCard icon={Check} title={t('detail.checklist')}>
                <ul className="space-y-2">
                  {SERVICE_ITEMS.map((it) => {
                    const on = Boolean((arrangements as unknown as Record<string, unknown>)[it.key]);
                    return (
                      <li key={it.key} className="flex items-center gap-2.5 text-[13px]">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${on ? 'bg-rmc-green/10 text-rmc-green' : 'bg-gray-100 text-gray-300'}`}>
                          {on ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
                        </span>
                        <span className={on ? 'font-medium text-gray-800' : 'text-gray-400 line-through'}>
                          {t(`request.arrangements.${it.labelKey}`)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>

              {/* Assigned volunteers */}
              <SectionCard icon={Users} title={t('detail.volunteers')}>
                {volunteers.length === 0 ? (
                  <p className="text-[13px] text-gray-400">{t('detail.noVolunteers')}</p>
                ) : (
                  <ul className="space-y-2">
                    {volunteers.map((v) => (
                      <li key={v.name} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rmc-green-light text-[11px] font-bold text-rmc-green">
                          {v.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-gray-800">{v.name}</p>
                          <p className="text-[11px] text-gray-400">{stepLabels.stages[v.stage] ?? v.stage}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              {/* Documents & attachments */}
              <SectionCard icon={FileText} title={t('detail.documents')}>
                {documents.length === 0 ? (
                  <p className="text-[13px] text-gray-400">{t('detail.noDocuments')}</p>
                ) : (
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li key={doc} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2 ring-1 ring-black/5">
                        <FileText className="h-4 w-4 shrink-0 text-rmc-green" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-gray-700">{doc}</span>
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-400">
                          <Download className="h-3.5 w-3.5" aria-hidden="true" /> {t('detail.download')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ── helpers (server-safe) ──────────────────────────────────────────────────────

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

function InfoRow({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href?: string }) {
  const val = href ? (
    <a href={href} className="font-medium text-gray-800 hover:text-rmc-green">{value}</a>
  ) : (
    <span className="font-medium text-gray-800">{value}</span>
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
