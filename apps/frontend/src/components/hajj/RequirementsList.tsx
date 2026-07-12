'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { hajjApi, type HajjRequirementItem } from '@/lib/hajjApi';
import {
  ContentKeys, getSiteContent, mergeContent, pick,
  HAJJ_DEFAULT, type HajjContent,
} from '@/lib/content-api';
import { requirementIcon } from './requirementIcons';

/**
 * Section: "Hajj Requirements".
 *
 * Both halves are admin-managed: the heading copy comes from the Hajj Service
 * content block, and the cards themselves from the requirements CMS (ordered,
 * per-locale, with the RWF amounts the registration form also charges).
 */
export function RequirementsList() {
  const t = useTranslations('services.hajj.requirements');
  const locale = useLocale();

  const [items, setItems] = useState<HajjRequirementItem[]>([]);
  const [heading, setHeading] = useState<HajjContent['requirements']>(HAJJ_DEFAULT.requirements);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    hajjApi.getRequirements()
      .then((res) => { if (active) setItems(res); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });

    getSiteContent<HajjContent>(ContentKeys.hajj)
      .then((data) => {
        if (active && data) setHeading(mergeContent(HAJJ_DEFAULT, data).requirements);
      })
      .catch(() => { /* keep the seeded heading */ });

    return () => { active = false; };
  }, []);

  const money = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  return (
    <section id="hajj-requirements" className="scroll-mt-24">
      <div className="mb-8 max-w-2xl">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold">{pick(heading.eyebrow, locale)}</p>
        <h2 className="text-2xl font-bold text-rmc-green-deep md:text-3xl">{pick(heading.title, locale)}</h2>
        <p className="mt-2 text-sm text-gray-500">{pick(heading.subtitle, locale)}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" aria-label={t('loading')} />
        </div>
      ) : (
        <ol className="relative flex flex-col gap-5 lg:flex-row lg:gap-0">
          {items.map((item, i) => {
            const Icon = requirementIcon(item.icon);
            const last = i === items.length - 1;
            return (
              <li
                key={item.id}
                className="relative flex flex-1 items-start gap-4 lg:flex-col lg:items-center lg:gap-4 lg:px-3 lg:text-center"
              >
                {/* Vertical connector (mobile) */}
                {!last && (
                  <span className="absolute left-[21px] top-11 h-[calc(100%+1.25rem)] w-px bg-gray-200 lg:hidden" aria-hidden="true" />
                )}
                {/* Horizontal connector (desktop) */}
                {!last && (
                  <span className="absolute left-1/2 top-[22px] hidden h-px w-full bg-gray-200 lg:block" aria-hidden="true" />
                )}

                {/* Node */}
                <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rmc-green/20 bg-rmc-green/10 text-rmc-green ring-4 ring-gray-50">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold text-gray-900">{pick(item.title, locale)}</h3>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-gray-500">{pick(item.description, locale)}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 lg:justify-center">
                    {item.amount != null && (
                      <span className="inline-flex items-center rounded-full bg-rmc-gold/20 px-2.5 py-0.5 text-[12px] font-bold text-rmc-green-deep">
                        {money.format(item.amount)} {item.currency}
                      </span>
                    )}
                    <span
                      className={[
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        item.mandatory ? 'bg-gray-100 text-gray-500' : 'bg-rmc-green-light text-rmc-green',
                      ].join(' ')}
                    >
                      {item.mandatory ? t('required') : t('recommended')}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
