'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users, Building2, Map, LayoutGrid } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface Stat {
  value: number;
  label: string;
  suffix?: string;
  Icon: React.FC<{ className?: string }>;
  ringColor: string;
  glowColor: string;
}

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
      className={`group relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 text-center transition-all duration-700 ${
        cardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Hover glow overlay */}
      <div
        className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
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
        <div className="text-white/45 text-sm font-medium tracking-wide">{label}</div>
      </div>
    </div>
  );
}

export function StatsSection() {
  const t = useTranslations('home.stats');
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);

  const stats: Stat[] = [
    { value: 12500, label: t('members'), Icon: Users, suffix: '+', ringColor: 'border-emerald-400 text-emerald-400', glowColor: 'rgba(52,211,153,0.07)' },
    { value: 320, label: t('mosques'), Icon: Building2, suffix: '+', ringColor: 'border-sky-400 text-sky-400', glowColor: 'rgba(56,189,248,0.07)' },
    { value: 5, label: t('provinces'), Icon: Map, ringColor: 'border-violet-400 text-violet-400', glowColor: 'rgba(167,139,250,0.07)' },
    { value: 7, label: t('services'), Icon: LayoutGrid, ringColor: 'border-amber-400 text-amber-400', glowColor: 'rgba(251,191,36,0.07)' },
  ];

  return (
    <section className="relative bg-rmc-green-deep py-20 md:py-24 px-4 overflow-hidden">
      <div className="absolute inset-0 pattern-islamic" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/35 to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-rmc-green/15 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rmc-gold/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <div
          ref={titleRef}
          className={`text-center mb-14 transition-all duration-700 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-rmc-gold/15 border border-rmc-gold/25 text-rmc-gold px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold animate-pulse" />
            Community Impact
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Our Growing{' '}
            <span className="title-underline" style={{ '--rmc-green': '#2ea05c', '--rmc-gold': '#f0c040' } as React.CSSProperties}>Community</span>
          </h2>
          <p className="text-white/40 mt-2 text-sm">Serving the Muslim community across Rwanda</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} {...stat} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}
