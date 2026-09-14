'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Clock,
  ClipboardList,
  FileText,
  GraduationCap,
  Hash,
  MapPin,
  Paperclip,
  User,
  Users,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { InlineText } from '@/components/edit-mode/InlineText';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import {
  ContentKeys,
  SCHOLARSHIP_SERVICE_DEFAULT,
  boardLevels,
  isRtl,
  levelLabel,
  pick,
  raw,
  type Locale,
  type ScholarshipServiceContent,
} from '@/lib/content-api';
import { fileUrl } from '@/lib/api';
import {
  scholarshipPublicApi,
  type ScholarshipProgram,
  type I18nText,
} from '@/lib/scholarshipApi';

type Status = 'open' | 'closing' | 'closed' | 'upcoming';

function getDiffDays(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

/**
 * Same states as the card, plus `upcoming` — a scholarship can be published
 * ahead of the date applications open, and the detail page is where that has to
 * be said plainly rather than showing an Apply button that would be refused.
 */
function getStatus(p: ScholarshipProgram): Status {
  if (p.status === 'closed') return 'closed';
  const opens = getDiffDays(p.opensAt);
  if (opens !== null && opens > 0) return 'upcoming';
  const diff = getDiffDays(p.deadline);
  if (diff === null) return 'open';
  if (diff < 0) return 'closed';
  if (diff <= 7) return 'closing';
  return 'open';
}

/**
 * What an applicant should have to hand before starting. Generic to the service
 * rather than to one scholarship — the scholarship's OWN document list is
 * separate (`requiredDocuments`), and renders in its own panel.
 */
const NEED_ICONS = { i1: User, i2: MapPin, i3: GraduationCap, i4: Users, i5: FileText } as const;
const NEED_KEYS = ['i1', 'i2', 'i3', 'i4', 'i5'] as const;

const STATUS_CHIP: Record<Status, string> = {
  open: 'bg-rmc-green/10 text-rmc-green',
  closing: 'bg-amber-50 text-amber-600',
  closed: 'bg-gray-100 text-gray-500',
  upcoming: 'bg-blue-50 text-blue-600',
};

/**
 * Trilingual text, degrading in the order that loses the least.
 *
 *   reader's language → English → the single-language column
 *
 * The English step matters more than it looks. Eligibility and benefits have no
 * fallback column — they exist only as i18n — so without it a scholarship
 * authored in English alone would show an Arabic reader NO eligibility criteria
 * at all, and the panel would silently vanish. Showing them the English text is
 * plainly better than telling them nothing about who may apply.
 */
function localized(value: I18nText | null, fallback: string, locale: string): string {
  const picked = value?.[locale as keyof I18nText];
  if (picked && picked.trim()) return picked;
  if (value?.en && value.en.trim()) return value.en;
  return fallback || '';
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ScholarshipDetailPage() {
  const { locale, slug } = useParams<{ locale: string; slug: string }>();
  const t = useTranslations('services.scholarship');

  /* Section headings, the CTA and the page's notices are admin-managed. The field
     micro-labels and the deadline phrases stay in i18n: those carry `{days}` and
     plural forms, which an editor could silently break. */
  const { content, setField } = useEditableContent<ScholarshipServiceContent>(
    ContentKeys.scholarshipService,
    SCHOLARSHIP_SERVICE_DEFAULT,
  );
  const lang = locale as Locale;
  // Levels are CMS-managed now: the programme stores a key, the label for it
  // lives beside the rest of this page's copy. `levelLabel` returns null for a
  // key whose level has been deleted, and the chip below hides itself — a stale
  // `lvl1757…` on a public page is worse than no chip at all.
  const levels = boardLevels(content, SCHOLARSHIP_SERVICE_DEFAULT);
  const dir = isRtl(locale) ? ('rtl' as const) : ('ltr' as const);
  const copy = content.detail;

  /** One inline-editable heading from the `detail` group. */
  const heading = (
    key: 'aboutTitle' | 'documentsTitle' | 'attachmentsTitle',
  ) => (
    <InlineText
      as="span"
      lang={locale}
      value={pick(copy[key], locale)}
      editValue={raw(copy[key], locale)}
      onCommit={(v) => setField((d) => { d.detail[key][lang] = v; })}
      dir={dir}
      placeholder="Heading"
    />
  );

  const [program, setProgram] = useState<ScholarshipProgram | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    scholarshipPublicApi
      .getProgramBySlug(slug)
      .then((p) => !cancelled && setProgram(p))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const status = program ? getStatus(program) : 'closed';
  const canApply = status === 'open' || status === 'closing';

  const deadlineText = (() => {
    if (!program?.deadline) return t('landing.deadline.none');
    const d = getDiffDays(program.deadline);
    if (d === null || d < 0) return t('landing.deadline.closed');
    if (d === 0) return t('landing.deadline.today');
    if (d === 1) return t('landing.deadline.tomorrow');
    return t('landing.deadline.inDays', { days: d });
  })();

  const title = program ? localized(program.titleI18n, program.title, locale) : '';
  // Rich text now, and the only prose on the page: eligibility, benefits and the
  // award figure were folded into it in migration 077, so the editor's own
  // headings carry the structure three separate columns used to.
  //
  // NOT sanitised here. `lib/sanitize` bundles jsdom and its own header forbids
  // importing it from a 'use client' module — doing so 500s this page, which is
  // how that rule was rediscovered. The programme is fetched in the browser, so
  // there is no server component in the path to pre-sanitise and pass it down
  // the way the hajj and funeral pages do. It is cleaned at the API boundary
  // instead, on write: see backend scholarship-description.ts.
  const levelLabelTri = levelLabel(levels, program?.level);
  const levelText = levelLabelTri ? pick(levelLabelTri, locale) : '';

  const descriptionHtml = program
    ? localized(program.descriptionI18n, program.description, locale)
    : '';

  return (
    <div className="min-h-screen">
      <Navbar solid />
      <main>
        <section className="bg-gray-50 pattern-light pt-24 md:pt-28 pb-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            {loading && (
              <div className="animate-pulse space-y-6">
                <div className="h-40 rounded-lg border border-gray-100 bg-white" />
                <div className="h-64 rounded-lg border border-gray-100 bg-white" />
              </div>
            )}

            {!loading && !program && (
              <div className="py-24 text-center">
                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                  <AlertCircle className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-lg font-semibold text-gray-400">{pick(copy.notFound.title, locale)}</p>
                <p className="mt-1 text-sm text-gray-300">{pick(copy.notFound.body, locale)}</p>
                <Link
                  href={`/${locale}/services/scholarship`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rmc-green hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t('detail.backToList')}
                </Link>
              </div>
            )}

            {!loading && program && (
              <>
                {/* ── Header card ─────────────────────────────────────────── */}
                <div className="mb-6 rounded-lg border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                  <Link
                    href={`/${locale}/services/scholarship`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-rmc-green"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t('detail.backToList')}
                  </Link>

                  <div className="mt-3 flex items-start gap-5">
                    {/* The same emblem as the list row, so the page reads as
                        the card opened up rather than a different object. */}
                    <div className="relative hidden shrink-0 rounded-full bg-gradient-to-br from-rmc-green via-rmc-gold to-rmc-green p-[2px] shadow-sm shadow-rmc-green/20 sm:block">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rmc-green-deep ring-2 ring-white">
                        <GraduationCap className="h-7 w-7 text-white/90" strokeWidth={1.5} />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{title}</h1>
                      <div className="mt-3 flex flex-wrap items-center gap-2.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${STATUS_CHIP[status]}`}>
                          <Clock className="h-3 w-3" />
                          {status === 'upcoming' && program.opensAt
                            ? `${t('detail.opensLabel')} ${formatDate(program.opensAt, locale)}`
                            : deadlineText}
                        </span>
                        {levelText && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-600">
                            <GraduationCap className="h-3 w-3" /> {levelText}
                          </span>
                        )}
                        {program.referenceNumber && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-600">
                            <Hash className="h-3 w-3" /> {program.referenceNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* A closed or not-yet-open scholarship says so here, instead
                      of offering an Apply button the server would refuse. */}
                  {status === 'closed' && (
                    <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                      {pick(copy.closedNotice, locale)}
                    </p>
                  )}
                  {status === 'upcoming' && (
                    <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                      {pick(copy.notOpenYet, locale)}
                    </p>
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
                  {/* ── Main column ──────────────────────────────────────── */}
                  <div className="space-y-6 lg:col-span-2">
                    <Panel icon={FileText} title={heading('aboutTitle')}>
                      <div
                        dir={dir}
                        className="prose prose-sm max-w-none text-gray-600 prose-headings:text-rmc-green-dark prose-headings:font-semibold prose-a:text-rmc-green prose-strong:text-gray-900"
                        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                      />
                    </Panel>

                    {/* What to have ready before starting. Moved here from the
                        landing page: it is preparation for ONE application, so
                        it belongs beside this scholarship's eligibility and
                        deadline rather than beside a list the reader is still
                        choosing from. Full text, not just titles — there is room
                        for it here, and "Your personal details" alone does not
                        tell anyone what to actually go and find. */}
                    <Panel
                      icon={ClipboardList}
                      title={
                        <InlineText
                          as="span"
                          lang={locale}
                          value={pick(copy.need.title, locale)}
                          editValue={raw(copy.need.title, locale)}
                          onCommit={(v) => setField((d) => { d.detail.need.title[lang] = v; })}
                          dir={dir}
                          placeholder="Heading"
                        />
                      }
                    >
                      <p className="mb-3 text-xs text-gray-400">{pick(copy.need.subtitle, locale)}</p>
                      <ul className="space-y-3">
                        {NEED_KEYS.map((key) => {
                          const Icon = NEED_ICONS[key];
                          return (
                            <li key={key} className="flex items-start gap-2.5">
                              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rmc-green" />
                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {t(`detail.need.${key}.title`)}
                                </p>
                                <p className="text-xs leading-relaxed text-gray-500">
                                  {t(`detail.need.${key}.text`)}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </Panel>

                    {program.requiredDocuments.length > 0 && (
                      <Panel icon={Paperclip} title={heading('documentsTitle')}>
                        <ul className="space-y-2">
                          {program.requiredDocuments.map((doc) => (
                            <li key={doc.key} className="flex items-start gap-2.5">
                              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-rmc-green" />
                              <span className="text-sm text-gray-600">
                                {localized(doc.label as I18nText, doc.key, locale)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </Panel>
                    )}

                    {program.attachments.length > 0 && (
                      <Panel icon={Paperclip} title={heading('attachmentsTitle')}>
                        <ul className="space-y-2">
                          {program.attachments.map((att) => (
                            <li key={att.key}>
                              <a
                                href={fileUrl(att.key)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:border-rmc-green hover:bg-rmc-green-light/30"
                              >
                                <span className="min-w-0 truncate text-sm text-gray-700">{att.name}</span>
                                <span className="shrink-0 text-xs text-gray-400">{formatSize(att.size)}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </Panel>
                    )}
                  </div>

                  {/* ── Aside: the facts, then the CTA ───────────────────── */}
                  <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                    <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
                      <dl className="space-y-3.5">
                        {program.slots != null && (
                          <Fact icon={Users} label={t('detail.slotsLabel')}>{program.slots}</Fact>
                        )}
                        {program.opensAt && (
                          <Fact icon={CalendarClock} label={t('detail.opensLabel')}>
                            {formatDate(program.opensAt, locale)}
                          </Fact>
                        )}
                        {program.deadline && (
                          <Fact icon={Clock} label={t('landing.deadlineLabel')}>
                            {formatDate(program.deadline, locale)}
                          </Fact>
                        )}
                      </dl>
                    </div>

                    {canApply && (
                      <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
                        <p className="text-sm font-bold text-gray-900">{pick(copy.cta.title, locale)}</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{pick(copy.cta.body, locale)}</p>
                        <Link
                          href={`/${locale}/services/scholarship/apply?program=${program.id}`}
                          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rmc-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
                        >
                          {t('landing.applyCta')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                        </Link>
                      </div>
                    )}
                  </aside>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileText;
  /** A node, not a string — the headings are inline-editable in Edit Mode. */
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-rmc-green" />
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rmc-green/70" />
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
        <dd className="text-sm font-medium text-gray-800">{children}</dd>
      </div>
    </div>
  );
}
