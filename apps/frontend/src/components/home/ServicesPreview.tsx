'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Heart, FileText, GraduationCap, Home, ClipboardList, Briefcase, ArrowRight, ChevronRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useTilt } from '@/hooks/useTilt';

const serviceKeys = [
  'marriage', 'funeral', 'conduct', 'scholarship', 'hijra', 'tender', 'jobs',
] as const;

const serviceConfig: Record<string, { Icon: React.ComponentType<{ className?: string }>; gradient: string; iconBg: string; iconColor: string }> = {
  marriage: {
    Icon: Heart,
    gradient: 'from-rose-50 to-white',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-500',
  },
  funeral: {
    Icon: FileText,
    gradient: 'from-slate-50 to-white',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
  },
  conduct: {
    Icon: ClipboardList,
    gradient: 'from-blue-50 to-white',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
  },
  scholarship: {
    Icon: GraduationCap,
    gradient: 'from-violet-50 to-white',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-500',
  },
  hijra: {
    Icon: Home,
    gradient: 'from-amber-50 to-white',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
  },
  tender: {
    Icon: ClipboardList,
    gradient: 'from-cyan-50 to-white',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-500',
  },
  jobs: {
    Icon: Briefcase,
    gradient: 'from-green-50 to-white',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-500',
  },
};

export function ServicesPreview() {
  const t = useTranslations();
  const { locale } = useParams<{ locale: string }>();
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);

  return (
    <section className="relative bg-gray-50/80 py-20 md:py-24 overflow-hidden">
      <div className="absolute inset-0 pattern-light" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section title */}
        <div
          ref={titleRef}
          className={`text-center mb-14 transition-all duration-700 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-rmc-green/10 text-rmc-green px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-green" />
            {t('nav.services')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('home.services.title')}</h2>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto text-sm md:text-base">
            {t('home.services.subtitle')}
          </p>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {serviceKeys.map((key, i) => {
            const config = serviceConfig[key];
            const { Icon } = config;
            return (
              <ServiceCard
                key={key}
                delay={i * 80}
                title={t(`services.${key}.title`)}
                desc={t(`services.${key}.desc`)}
                Icon={Icon}
                config={config}
              />
            );
          })}

          {/* View all CTA card */}
          <ViewAllCard locale={locale} label={t('common.viewAll')} />
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  title,
  desc,
  Icon,
  config,
  delay,
}: {
  title: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
  config: typeof serviceConfig[string];
  delay: number;
}) {
  const { ref: revealRef, visible } = useScrollReveal(0.1);
  const tiltRef = useTilt(7);

  return (
    <div
      ref={(node) => {
        (revealRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (tiltRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={`shimmer-card group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm overflow-hidden transition-all duration-500 hover:shadow-lg hover:border-gray-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms`, transformStyle: 'preserve-3d' }}
    >
      {/* Gradient background on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="relative">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <h3 className="font-bold text-gray-900 mb-2 group-hover:text-rmc-green transition-colors duration-200">
          {title}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">{desc}</p>

        {/* Arrow indicator */}
        <div className="mt-4 flex items-center gap-1 text-rmc-green opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-4px] group-hover:translate-x-0 text-sm font-medium">
          Learn more <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

function ViewAllCard({ locale, label }: { locale: string; label: string }) {
  const { ref, visible } = useScrollReveal(0.1);

  return (
    <Link
      ref={ref as unknown as React.Ref<HTMLAnchorElement>}
      href={`/${locale}/services`}
      className={`group flex flex-col items-center justify-center bg-rmc-green rounded-2xl p-6 text-center shadow-sm hover:bg-rmc-green-dark transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-rmc-green/25 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: '560ms' }}
    >
      <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center mb-4 group-hover:bg-white/25 transition-colors">
        <ArrowRight className="w-6 h-6 text-white" />
      </div>
      <span className="font-bold text-white text-lg">{label}</span>
      <span className="text-white/60 text-sm mt-1">All Services</span>
    </Link>
  );
}
