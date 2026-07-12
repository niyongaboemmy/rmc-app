import { getLocale } from 'next-intl/server';
import {
  ContentKeys, getSiteContent, mergeContent, pick, isRtl,
  hajjSteps, HAJJ_DEFAULT, type HajjContent,
} from '@/lib/content-api';
import { requirementIcon } from './requirementIcons';

/**
 * Section: "How it works" — the ordered journey, shown after the requirements
 * checklist. Both the heading and the steps themselves are admin-managed
 * (Content → Hajj Service).
 *
 * A server component, like the description above it: the page is force-dynamic,
 * so an admin's edit shows up on the next request without a client fetch.
 * Renders nothing once an admin removes every step.
 */
export async function HajjSteps() {
  const locale = await getLocale();

  const saved = await getSiteContent<HajjContent>(ContentKeys.hajj).catch(() => null);
  const heading = mergeContent(HAJJ_DEFAULT, saved).steps;
  const items = hajjSteps(saved);

  if (!items.length) return null;

  const rtl = isRtl(locale);

  return (
    <section id="hajj-steps" className="relative scroll-mt-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="mb-10 max-w-2xl">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold">
            {pick(heading.eyebrow, locale)}
          </p>
          <h2 className="text-2xl font-bold text-rmc-green-deep md:text-3xl">
            {pick(heading.title, locale)}
          </h2>
          <p className="mt-2 text-sm text-gray-500">{pick(heading.subtitle, locale)}</p>
        </div>

        <ol className="relative">
          {items.map((step, i) => {
            const Icon = requirementIcon(step.icon);
            const last = i === items.length - 1;
            return (
              <li key={step.id} className="relative flex gap-5 pb-8 last:pb-0">
                {/* Node + the connector running down to the next step. */}
                <div className="relative flex flex-col items-center">
                  <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rmc-green/20 bg-rmc-green-light text-rmc-green shadow-sm">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rmc-green text-[10px] font-bold text-white ring-2 ring-white">
                      {i + 1}
                    </span>
                  </span>
                  {!last && (
                    <span
                      className="absolute top-11 h-full w-px bg-gradient-to-b from-rmc-green/25 to-rmc-green/5"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className={`min-w-0 pt-1.5 ${rtl ? 'font-arabic' : ''}`}>
                  <h3 className="text-base font-bold text-rmc-green-deep md:text-lg">
                    {pick(step.title, locale)}
                  </h3>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-600">
                    {pick(step.description, locale)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
