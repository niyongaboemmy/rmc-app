'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Calendar, ArrowRight, HandHeart, Bell, Sparkles, HeartHandshake } from 'lucide-react';
import { InlineSubscribe } from '@/components/subscribe/InlineSubscribe';
import { MONTHS, fundedPercent } from '@/components/activities/data';
import { donationsApi, formatCurrency, type PublicCampaign } from '@/lib/donationsApi';
import { pick, isRtl } from '@/lib/content-api';
import { fileUrl } from '@/lib/api';

/** Resolve a program hero image (file-server key, or pass-through URL/path). */
function resolveImg(v: string): string {
  return /^https?:\/\//.test(v) || v.startsWith('/') ? v : fileUrl(v);
}

const startTs = (c: PublicCampaign) => {
  const t = new Date(c.startDate).getTime();
  return Number.isNaN(t) ? 0 : t;
};
const endTs = (c: PublicCampaign) => (c.endDate ? new Date(c.endDate).getTime() : NaN);

/** Friendly "starts in …" label for an upcoming program. */
function startsInLabel(startDate: string, locale: string): string {
  const days = Math.round((new Date(startDate).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return pick({ en: 'Starting soon', rw: 'Bigiye gutangira', ar: 'يبدأ قريبًا' }, locale);
  if (days === 1) return pick({ en: 'Starts tomorrow', rw: 'Bitangira ejo', ar: 'يبدأ غدًا' }, locale);
  if (days < 7) return pick({ en: `Starts in ${days} days`, rw: `Bitangira mu minsi ${days}`, ar: `يبدأ خلال ${days} أيام` }, locale);
  if (days < 30) return pick({ en: `Starts in ${Math.round(days / 7)} weeks`, rw: `Bitangira mu byumweru ${Math.round(days / 7)}`, ar: `يبدأ خلال ${Math.round(days / 7)} أسابيع` }, locale);
  return pick({ en: `Starts in ${Math.round(days / 30)} months`, rw: `Bitangira mu mezi ${Math.round(days / 30)}`, ar: `يبدأ خلال ${Math.round(days / 30)} أشهر` }, locale);
}

/* Slim funding progress line — raised / goal + a thin bar. */
function ProgressBar({ received, goal, currency, dark = false }: { received: number; goal: number; currency: string; dark?: boolean }) {
  const pct = fundedPercent(received, goal);
  const track = dark ? 'bg-white/15' : 'bg-gray-100';
  const fill = dark ? 'bg-rmc-gold-light' : 'bg-rmc-green';
  const amount = dark ? 'text-white' : 'text-gray-900';
  const muted = dark ? 'text-white/50' : 'text-gray-400';
  const pctColor = dark ? 'text-rmc-gold-light' : 'text-rmc-green';
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[11px]">
        <span className={`font-bold tabular-nums ${amount}`}>
          {formatCurrency(currency, received)}
          <span className={`font-medium ${muted}`}> / {formatCurrency(currency, goal)}</span>
        </span>
        <span className={`font-bold tabular-nums ${pctColor}`}>{pct}%</span>
      </div>
      <div className={`h-1.5 w-full overflow-hidden rounded-full ${track}`}>
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ActivitiesEventsSection() {
  const { locale } = useParams<{ locale: string }>();
  const rtl = isRtl(locale);
  const arFont = rtl ? 'font-arabic' : '';

  // Donation programs (campaigns) are the single source — the same ones shown on
  // /donate. A new program added in Admin → Donate appears here automatically.
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    donationsApi
      .listCampaigns()
      .then((data) => {
        if (active) setCampaigns(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        /* leave empty — section shows its empty state */
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Drop programs whose end date has passed; the rest split by whether they've started.
  const live = useMemo(() => {
    const now = Date.now();
    return campaigns.filter((c) => {
      const e = endTs(c);
      return Number.isNaN(e) || e >= now;
    });
  }, [campaigns]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return live
      .filter((c) => startTs(c) > now)
      .sort((a, b) => startTs(a) - startTs(b))
      .slice(0, 3);
  }, [live]);

  const latest = useMemo(() => {
    const now = Date.now();
    return live
      .filter((c) => startTs(c) <= now)
      .sort((a, b) => startTs(b) - startTs(a))
      .slice(0, 4);
  }, [live]);

  const [featured, ...restUpcoming] = upcoming;
  const nothingToShow = loaded && latest.length === 0 && upcoming.length === 0;

  return (
    <section className="relative bg-transparent py-12 md:py-16 overflow-hidden">
      {/* Faint geometric texture + single gold hairline at the top */}
      <div className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/40 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="max-w-2xl mx-auto text-center mb-14 animate-fade-up">
          <h2
            className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${arFont}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {pick({ en: 'Latest & Upcoming Programs', rw: 'Gahunda Ziheruka n’Izizaza', ar: 'البرامج الأحدث والقادمة' }, locale)}
          </h2>

          {/* Gold ornament flourish with a small Arabic touch */}
          <div className="ornament-divider max-w-xs mx-auto mt-4 mb-4">
            <p className="font-arabic text-rmc-green-dark text-base md:text-lg leading-loose px-2" dir="rtl">
              بِسْمِ اللَّهِ
            </p>
          </div>

          <p
            className={`text-gray-500 max-w-xl mx-auto text-sm md:text-base leading-relaxed ${arFont}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {pick(
              {
                en: 'Support the community programs RMC is running now — and the ones ahead. Every contribution is a Sadaqah.',
                rw: "Shyigikira gahunda z'umuryango RMC irimo gukora ubu — n'izigiye kuza. Buri nkunga ni Sadaka.",
                ar: 'ادعم برامج المجتمع التي ينفّذها المجتمع الإسلامي الرواندي الآن — والقادمة. كل مساهمة صدقة.',
              },
              locale,
            )}
          </p>
        </div>

        {/* Whole-section empty state — no live programs at all */}
        {nothingToShow ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-gray-200 bg-white/60 p-10 text-center animate-fade-up">
            <HeartHandshake className="mx-auto mb-3 h-8 w-8 text-gray-300" aria-hidden="true" />
            <p className={`text-sm font-semibold text-gray-700 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
              {pick({ en: 'No programs yet', rw: 'Nta gahunda irahari', ar: 'لا توجد برامج بعد' }, locale)}
            </p>
            <p className={`mt-1 text-[13px] text-gray-500 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
              {pick(
                { en: 'New donation programs will appear here as they launch.', rw: 'Gahunda nshya zo gutanga zizagaragara hano.', ar: 'ستظهر برامج التبرع الجديدة هنا عند إطلاقها.' },
                locale,
              )}
            </p>
            <Link
              href={`/${locale}/donate`}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-rmc-green px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-rmc-green-dark"
            >
              <HandHeart className="h-3.5 w-3.5" />
              {pick({ en: 'Visit the donate page', rw: 'Sura urupapuro rwo gutanga', ar: 'زر صفحة التبرع' }, locale)}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12">
            {/* ════════ LATEST PROGRAMS — left, wider (3 cols) ════════ */}
            <div className="lg:col-span-3 flex flex-col animate-fade-up" style={{ animationDelay: '120ms' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-rmc-green-light flex items-center justify-center ring-1 ring-rmc-green/10">
                    <Sparkles className="w-4 h-4 text-rmc-green" />
                  </span>
                  <div>
                    <h3 className={`text-base md:text-lg font-bold text-gray-900 leading-none ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                      {pick({ en: 'Active Programs', rw: 'Gahunda Zirimo Gukorwa', ar: 'البرامج النشطة' }, locale)}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {pick({ en: 'Give to a cause running right now', rw: 'Tanga ku mpamvu irimo gukorwa ubu', ar: 'تبرّع لقضية جارية الآن' }, locale)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/${locale}/donate`}
                  className="group inline-flex items-center gap-1 text-xs font-semibold text-rmc-green hover:text-rmc-green-dark transition-colors shrink-0"
                >
                  {pick({ en: 'View all', rw: 'Reba byose', ar: 'عرض الكل' }, locale)}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 rtl:rotate-180" />
                </Link>
              </div>

              {/* Empty state — no active programs, but some upcoming */}
              {latest.length === 0 ? (
                <div className="flex-1 rounded-lg border border-dashed border-gray-200 bg-white/50 p-8 text-center flex flex-col items-center justify-center">
                  <Sparkles className="w-8 h-8 text-gray-300 mb-2" aria-hidden="true" />
                  <p className={`text-sm font-semibold text-gray-600 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                    {pick({ en: 'No active programs right now', rw: 'Nta gahunda irimo gukorwa ubu', ar: 'لا توجد برامج نشطة الآن' }, locale)}
                  </p>
                </div>
              ) : (
                <div className="flex-1 rounded-lg border border-gray-200/70 bg-white divide-y divide-gray-100 overflow-hidden">
                  {latest.map((c, i) => (
                    <Link
                      key={c.id}
                      href={`/${locale}/donate`}
                      style={{ animationDelay: `${i * 90 + 220}ms` }}
                      className="group flex gap-4 p-4 sm:p-5 hover:bg-rmc-green-light/30 transition-colors duration-300 animate-fade-up"
                    >
                      {/* Thumbnail — hero image or a branded fallback tile */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 ring-1 ring-black/5">
                        {c.heroImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveImg(c.heroImageUrl)}
                            alt={c.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-rmc-green to-rmc-green-deep flex items-center justify-center">
                            <HandHeart className="w-7 h-7 text-white/80" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {c.fundType && (
                            <span className="inline-flex items-center rounded-lg bg-rmc-green-light px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-rmc-green-dark ring-1 ring-inset ring-rmc-green/15">
                              {c.fundType}
                            </span>
                          )}
                        </div>
                        <h4
                          className={`text-sm sm:text-[15px] font-bold text-gray-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-rmc-green transition-colors duration-200 ${arFont}`}
                          dir={rtl ? 'rtl' : 'ltr'}
                        >
                          {c.title}
                        </h4>
                        {c.description && (
                          <p className={`text-xs sm:text-[13px] text-gray-500 leading-relaxed line-clamp-1 mb-2.5 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                            {c.description}
                          </p>
                        )}
                        <ProgressBar received={c.receivedAmount} goal={c.targetAmount} currency={c.currency} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* ════════ UPCOMING PROGRAMS — right (2 cols) ════════ */}
            <div className="lg:col-span-2 flex flex-col animate-fade-up" style={{ animationDelay: '220ms' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-rmc-gold/10 flex items-center justify-center ring-1 ring-rmc-gold/20">
                    <Calendar className="w-4 h-4 text-rmc-gold" />
                  </span>
                  <div>
                    <h3 className={`text-base md:text-lg font-bold text-gray-900 leading-none ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                      {pick({ en: 'Upcoming Programs', rw: 'Gahunda Zizaza', ar: 'البرامج القادمة' }, locale)}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {pick({ en: 'Launching soon', rw: 'Zigiye gutangira', ar: 'تُطلق قريبًا' }, locale)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Empty state — nothing scheduled ahead */}
              {upcoming.length === 0 && (
                <div className="flex-1 rounded-lg border border-dashed border-gray-200 bg-white/50 p-8 text-center flex flex-col items-center justify-center animate-fade-up">
                  <Calendar className="w-8 h-8 text-gray-300 mb-2" aria-hidden="true" />
                  <p className={`text-sm font-semibold text-gray-600 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                    {pick({ en: 'No upcoming programs', rw: 'Nta gahunda izaza', ar: 'لا توجد برامج قادمة' }, locale)}
                  </p>
                  <p className={`text-[11px] text-gray-400 mt-1 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                    {pick({ en: 'Check back soon for new programs.', rw: 'Garuka vuba urebe gahunda nshya.', ar: 'تحقق قريبًا من البرامج الجديدة.' }, locale)}
                  </p>
                </div>
              )}

              {/* Featured — the soonest upcoming program */}
              {featured && (
                <Link
                  href={`/${locale}/donate`}
                  className="group relative block rounded-lg bg-rmc-green-deep text-white p-5 overflow-hidden motion-safe:hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 animate-fade-up"
                  style={{ animationDelay: '320ms' }}
                >
                  <div className="absolute inset-0 pattern-islamic opacity-10 pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/60 to-transparent pointer-events-none" />

                  <div className="relative flex items-start gap-4">
                    {/* Gold day-tile on green-deep */}
                    <div className="w-16 shrink-0 text-center rounded-lg bg-white/10 ring-1 ring-white/15 py-2.5 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70 leading-none">
                        {MONTHS[new Date(featured.startDate).getMonth()]}
                      </p>
                      <p className="text-3xl font-bold leading-tight text-rmc-gold-light tabular-nums">
                        {new Date(featured.startDate).getDate()}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rmc-gold-light">
                          <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                          {pick({ en: 'Next up', rw: 'Ibikurikira', ar: 'التالي' }, locale)}
                        </span>
                        <span className="text-[11px] font-semibold text-white/60">{startsInLabel(featured.startDate, locale)}</span>
                      </div>

                      <h4 className={`text-[15px] sm:text-base font-bold leading-snug mb-2 line-clamp-2 ${arFont}`} dir={rtl ? 'rtl' : 'ltr'}>
                        {featured.title}
                      </h4>

                      <ProgressBar received={featured.receivedAmount} goal={featured.targetAmount} currency={featured.currency} dark />
                    </div>
                  </div>
                </Link>
              )}

              {/* Remaining upcoming programs */}
              <div className="mt-3 space-y-3 flex-1">
                {restUpcoming.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/${locale}/donate`}
                    className="group flex items-start gap-3 p-4 rounded-lg border border-gray-200/70 bg-white hover:border-rmc-green/30 hover:shadow-md motion-safe:hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                    style={{ animationDelay: `${i * 80 + 380}ms` }}
                  >
                    {/* Date tile — gold day on green-deep, flips to solid green on hover */}
                    <div className="w-12 shrink-0 text-center rounded-lg bg-rmc-green-deep py-2 group-hover:bg-rmc-green transition-colors duration-300">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 leading-none">
                        {MONTHS[new Date(c.startDate).getMonth()]}
                      </p>
                      <p className="text-xl font-bold leading-tight text-rmc-gold-light tabular-nums">
                        {new Date(c.startDate).getDate()}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-rmc-green transition-colors duration-200 ${arFont}`}
                        dir={rtl ? 'rtl' : 'ltr'}
                      >
                        {c.title}
                      </h4>
                      <p className="mt-1.5 text-[11px] font-semibold text-gray-400">{startsInLabel(c.startDate, locale)}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Subscribe CTA — matches the home-page system */}
              <div className="mt-4 p-4 rounded-lg border border-rmc-green/15 bg-rmc-green-light/50 animate-fade-up" style={{ animationDelay: '620ms' }}>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-white flex items-center justify-center ring-1 ring-rmc-green/15 shadow-sm">
                    <Bell className="w-4 h-4 text-rmc-green" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-tight">
                      {pick({ en: 'Never miss a program', rw: 'Ntuzigere usiba gahunda', ar: 'لا تفوّت أي برنامج' }, locale)}
                    </p>
                    <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                      {pick(
                        {
                          en: 'Get notified when RMC launches a new program near you.',
                          rw: 'Menyeshwa igihe RMC itangije gahunda nshya hafi yawe.',
                          ar: 'احصل على إشعار عند إطلاق المجتمع الإسلامي الرواندي برنامجًا جديدًا بالقرب منك.',
                        },
                        locale,
                      )}
                    </p>
                  </div>
                </div>
                <InlineSubscribe source="programs-home" className="mt-3.5" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
