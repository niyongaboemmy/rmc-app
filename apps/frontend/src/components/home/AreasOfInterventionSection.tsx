'use client';

import { BookOpen, Heart, GraduationCap, Globe, Check } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface Area {
  key: string;
  index: string;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  items: string[];
}

const AREAS: Area[] = [
  {
    key: 'dawa',
    index: '01',
    Icon: BookOpen,
    title: 'Dawa',
    description:
      "Islamic outreach and propagation of the faith across Rwanda, supporting imams, madrassas, and Islamic education programs in communities.",
    items: ['Imam training programs', 'Quran distribution', 'Community preaching', 'Islamic literacy'],
  },
  {
    key: 'social',
    index: '02',
    Icon: Heart,
    title: 'Social & Development',
    description:
      "Uplifting vulnerable Muslim families through welfare programs, microfinance, food assistance, and community infrastructure development.",
    items: ['Zakat distribution', 'Orphan support', 'Widow programs', 'Community development'],
  },
  {
    key: 'education',
    index: '03',
    Icon: GraduationCap,
    title: 'Education',
    description:
      "Investing in the future of the Rwandan Muslim community through schools, scholarships, teacher training, and digital learning initiatives.",
    items: ['Scholarships', 'School construction', 'Teacher training', 'Digital learning'],
  },
  {
    key: 'foreign',
    index: '04',
    Icon: Globe,
    title: 'Foreign Affairs',
    description:
      "Building international bridges with Islamic organizations, governments, and diaspora communities to bring resources and recognition to Rwandan Muslims.",
    items: ['International partnerships', 'Hajj coordination', 'Diaspora engagement', 'Diplomatic relations'],
  },
];

function PillarCard({ area, delay }: { area: Area; delay: number }) {
  const { ref, visible } = useScrollReveal(0.12);
  const { Icon } = area;

  return (
    <article
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-gray-200/70 bg-white p-9 lg:p-11 shadow-[0_1px_2px_rgba(13,61,36,0.04),0_12px_32px_-18px_rgba(13,61,36,0.18)] transition-all duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none hover:-translate-y-2 hover:border-rmc-green/30 hover:shadow-[0_28px_64px_-24px_rgba(26,122,74,0.3)] ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Always-on gold left rail — gives every card a co-equal green+gold identity at rest */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rmc-gold via-rmc-gold-light to-rmc-gold"
      />

      {/* Ghosted index numeral — anchors the card. -webkit-text-stroke draws a hairline outline;
          a faint solid green fill is the cross-engine fallback so it never vanishes.
          One of the two hover events: it warms to gold. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2 right-5 select-none font-bold leading-none tracking-tighter text-rmc-green/10 text-[6rem] md:text-[7rem] [-webkit-text-stroke:1.5px_rgba(26,122,74,0.14)] [-webkit-text-fill-color:transparent] transition-all duration-500 group-hover:text-rmc-gold/30 group-hover:[-webkit-text-stroke-color:rgba(212,160,23,0.5)]"
      >
        {area.index}
      </span>

      {/* Icon tile — self-contained green+gold brand object: green gradient body + inset gold ring */}
      <span className="relative grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-md shadow-rmc-green/25 ring-1 ring-inset ring-rmc-gold/30">
        <Icon className="w-8 h-8" />
      </span>

      {/* Always-visible gold pillar label + title — gold reads at rest, not only on hover */}
      <p className="relative mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-rmc-gold">
        Pillar {area.index}
      </p>
      <h3 className="relative mt-1.5 text-xl font-bold text-gray-900">{area.title}</h3>

      {/* Gold hairline beneath the title — static, on-brand accent */}
      <span
        aria-hidden
        className="relative mt-3 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
      />

      {/* Description */}
      <p className="relative mt-4 text-sm leading-relaxed text-gray-500">{area.description}</p>

      {/* Focus items — pushed to the base of the card for an even bottom edge. The list sits above a
          gold→green→transparent hairline divider rather than a flat gray rule. */}
      <ul className="relative mt-auto space-y-2.5 pt-6 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-rmc-gold/40 before:via-rmc-green/15 before:to-transparent before:content-['']">
        {area.items.map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
            <span className="grid place-items-center w-5 h-5 shrink-0 rounded-full bg-rmc-green-light text-rmc-green ring-1 ring-rmc-green/10">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
            <span className="leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function AreasOfInterventionSection() {
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);

  return (
    <section className="relative overflow-hidden bg-transparent py-20 md:py-28">
      {/* Light Islamic geometry + symmetric gold hairline seams to the darker neighbouring sections */}
      <div aria-hidden className="absolute inset-0 pattern-light opacity-60" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />
      {/* Airy brand glow anchors — subtle, never heavy */}
      <div aria-hidden className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-rmc-green-light/50 blur-3xl" />
      <div aria-hidden className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-rmc-gold/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Section header — light-styled echo of the hero / sibling-light eyebrow rhythm ── */}
        <div
          ref={titleRef}
          className={`mx-auto mb-16 max-w-2xl text-center transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          {/* Gold-dot eyebrow chip — matches the WhoWeAre light-section grammar exactly */}
          <span className="inline-flex items-center gap-2.5 rounded-full border border-rmc-green/15 bg-rmc-green-light/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-rmc-green-dark backdrop-blur-sm">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
            Our Impact
          </span>

          {/* Heading keyword carries the canonical brand .title-underline (green→gold→green bar) —
              the single strongest brand echo. No second rule stacked directly beneath it. */}
          <h2 className="mt-7 text-3xl font-bold text-gray-900 md:text-[2.6rem] md:leading-tight">
            Areas of <span className="title-underline">Intervention</span>
          </h2>

          {/* One ornament rule below the lede — keeps the gold rhythm without competing with the
              animated underline directly under the H2. */}
          <div className="ornament-divider mx-auto mt-10 mb-6 max-w-xs" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-rmc-gold" />
          </div>

          <p className="mx-auto max-w-xl text-sm leading-relaxed text-gray-500 md:text-base">
            RMC works across four strategic pillars to uplift, educate, and connect the Muslim
            community of Rwanda — from local mosques to global partnerships.
          </p>
        </div>

        {/* ── Numbered pillar showcase ── */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {AREAS.map((area, i) => (
            <PillarCard key={area.key} area={area} delay={i * 110} />
          ))}
        </div>
      </div>
    </section>
  );
}
