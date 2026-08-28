'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Users, GraduationCap, Building2, type LucideIcon } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  ContentKeys,
  STATS_DEFAULT,
  pick,
  isRtl,
  type StatsContent,
  type Locale,
} from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { InlineText } from '@/components/edit-mode/InlineText';

/** Lucide icons available to stat items, resolved by name from content. */
const ICONS: Record<string, LucideIcon> = { Users, GraduationCap, Building2 };

interface Stat {
  value: number;
  label: string;
  suffix?: string;
  Icon: React.FC<{ className?: string }>;
  ringColor: string;
  glowColor: string;
}

/** Per-position visual accents (preserved from the original design). */
const ACCENTS = [
  { ringColor: 'border-emerald-400 text-emerald-400', glowColor: 'rgba(52,211,153,0.07)' },
  { ringColor: 'border-amber-400 text-amber-400', glowColor: 'rgba(251,191,36,0.07)' },
  { ringColor: 'border-sky-400 text-sky-400', glowColor: 'rgba(56,189,248,0.07)' },
];

function useCountUp(target: number, duration: number, trigger: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, trigger]);
  return count;
}

function StatCard({ value, label, suffix, Icon, ringColor, glowColor, delay = 0 }: Stat & { delay?: number }) {
  const [triggered, setTriggered] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = useCountUp(value, 1800, triggered);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCardVisible(true);
          setTimeout(() => setTriggered(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`group relative overflow-hidden bg-white/5 border border-white/10 rounded-lg p-6 md:p-8 text-center transition-all duration-700 ${
        cardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Hover glow overlay */}
      <div
        className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
        style={{ background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)` }}
      />

      {/* Animated top border on hover */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${ringColor}`} />

      <div className="relative z-10">
        {/* Icon with animated ring */}
        <div className="relative w-16 h-16 mx-auto mb-5">
          {/* Spinning ring */}
          <div
            className={`absolute inset-0 rounded-full border-2 border-dashed opacity-20 group-hover:opacity-60 transition-opacity duration-300 animate-spin-slow ${ringColor}`}
          />
          {/* Solid ring */}
          <div className={`absolute inset-1.5 rounded-full border opacity-30 group-hover:opacity-50 transition-opacity duration-300 ${ringColor}`} />
          {/* Icon background */}
          <div className="absolute inset-3 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors duration-300">
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Animated count */}
        <div className="text-3xl md:text-4xl font-bold text-white mb-1 tabular-nums tracking-tight">
          {count.toLocaleString()}{suffix}
        </div>
        <div className="text-white/45 text-sm font-medium uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

export function StatsSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);
  const rtl = isRtl(locale);

  // Content managed from Admin → Content → Community Impact. Falls back to the
  // built-in defaults until something is saved. In super-admin Edit Mode the
  // heading copy below is click-to-edit; the animated counters are managed from
  // the admin panel (a counting number isn't a type-in-place field).
  const { content, setField } = useEditableContent<StatsContent>(ContentKeys.stats, STATS_DEFAULT);
  const lang = locale as Locale;

  const stats: Stat[] = content.items.map((item, i) => ({
    value: item.value,
    suffix: item.suffix,
    label: pick(item.label, locale),
    Icon: ICONS[item.icon] ?? Users,
    ...(ACCENTS[i % ACCENTS.length]),
  }));

  return (
    <section className="relative bg-rmc-green-deep py-12 md:py-16 overflow-hidden">
      {/* No `pattern-islamic` here: its tiled star sits directly behind the counters,
          and a moving number over a repeating motif is harder to read than over flat
          colour. The class stays in use on sections whose content is prose. */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rmc-green/15 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rmc-gold/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={titleRef}
          dir={rtl ? 'rtl' : 'ltr'}
          className={`text-center mb-14 transition-all duration-700 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <h2 className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-white ${rtl ? 'font-arabic' : ''}`}>
            <InlineText
              as="span"
              lang={locale}
              value={pick(content.title, locale)}
              editValue={content.title[lang]}
              onCommit={(v) => setField((d) => { d.title[lang] = v; })}
              placeholder="Title"
            />{' '}
            <InlineText
              as="span"
              lang={locale}
              value={pick(content.titleAccent, locale)}
              editValue={content.titleAccent[lang]}
              onCommit={(v) => setField((d) => { d.titleAccent[lang] = v; })}
              className="text-emerald-400"
              placeholder="Accent"
            />
          </h2>
          <div className="ornament-divider mx-auto my-4 max-w-xs" aria-hidden>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
          </div>
          <InlineText
            as="p"
            lang={locale}
            value={pick(content.subtitle, locale)}
            editValue={content.subtitle[lang]}
            onCommit={(v) => setField((d) => { d.subtitle[lang] = v; })}
            className={`text-white/40 text-sm ${rtl ? 'font-arabic' : ''}`}
            placeholder="Subtitle"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <StatCard key={`${stat.label}-${i}`} {...stat} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}
