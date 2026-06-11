'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen, Heart, GraduationCap, Globe, ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useTilt } from '@/hooks/useTilt';

interface Area {
  key: string;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  items: string[];
  accent: string;
  iconBg: string;
  iconColor: string;
  border: string;
  hoverBorder: string;
}

const AREAS: Area[] = [
  {
    key: 'dawa',
    Icon: BookOpen,
    title: 'Dawa',
    description:
      "Islamic outreach and propagation of the faith across Rwanda, supporting imams, madrassas, and Islamic education programs in communities.",
    items: ['Imam training programs', 'Quran distribution', 'Community preaching', 'Islamic literacy'],
    accent: 'bg-gradient-to-br from-rmc-green to-rmc-green-dark',
    iconBg: 'bg-rmc-green-light',
    iconColor: 'text-rmc-green',
    border: 'border-rmc-green/10',
    hoverBorder: 'hover:border-rmc-green/40',
  },
  {
    key: 'social',
    Icon: Heart,
    title: 'Social & Development',
    description:
      "Uplifting vulnerable Muslim families through welfare programs, microfinance, food assistance, and community infrastructure development.",
    items: ['Zakat distribution', 'Orphan support', 'Widow programs', 'Community development'],
    accent: 'bg-gradient-to-br from-rose-500 to-rose-700',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    border: 'border-rose-100',
    hoverBorder: 'hover:border-rose-300',
  },
  {
    key: 'education',
    Icon: GraduationCap,
    title: 'Education',
    description:
      "Investing in the future of the Rwandan Muslim community through schools, scholarships, teacher training, and digital learning initiatives.",
    items: ['Scholarships', 'School construction', 'Teacher training', 'Digital learning'],
    accent: 'bg-gradient-to-br from-violet-500 to-violet-700',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    border: 'border-violet-100',
    hoverBorder: 'hover:border-violet-300',
  },
  {
    key: 'foreign',
    Icon: Globe,
    title: 'Foreign Affairs',
    description:
      "Building international bridges with Islamic organizations, governments, and diaspora communities to bring resources and recognition to Rwandan Muslims.",
    items: ['International partnerships', 'Hajj coordination', 'Diaspora engagement', 'Diplomatic relations'],
    accent: 'bg-gradient-to-br from-sky-500 to-sky-700',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    border: 'border-sky-100',
    hoverBorder: 'hover:border-sky-300',
  },
];

function AreaCard({ area, delay }: { area: Area; delay: number }) {
  const { ref: revealRef, visible } = useScrollReveal(0.1);
  const tiltRef = useTilt(5);
  const { Icon } = area;

  return (
    <div
      ref={(node) => {
        (revealRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (tiltRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={`group relative bg-white rounded-3xl p-7 border ${area.border} ${area.hoverBorder} shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${delay}ms`, transformStyle: 'preserve-3d' }}
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${area.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-3xl`} />

      {/* Icon */}
      <div className={`w-14 h-14 rounded-2xl ${area.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-7 h-7 ${area.iconColor}`} />
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-rmc-green transition-colors duration-200">
        {area.title}
      </h3>

      {/* Description */}
      <p className="text-gray-500 text-sm leading-relaxed mb-5">{area.description}</p>

      {/* Items */}
      <ul className="space-y-1.5 mb-6">
        {area.items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${area.iconColor.replace('text-', 'bg-')}`} />
            {item}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="flex items-center gap-1 text-sm font-semibold text-gray-300 group-hover:text-rmc-green transition-all duration-200 translate-x-0 group-hover:translate-x-1">
        Explore <ArrowRight className="w-4 h-4" />
      </div>
    </div>
  );
}

export function AreasOfInterventionSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);

  return (
    <section className="relative bg-gray-50 py-20 md:py-28 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 pattern-light opacity-60" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={titleRef}
          className={`text-center mb-14 transition-all duration-700 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-rmc-green/10 text-rmc-green px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-green" />
            Our Impact
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Areas of Intervention
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
            RMC works across four strategic pillars to uplift, educate, and connect the Muslim community of Rwanda — from local mosques to global partnerships.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {AREAS.map((area, i) => (
            <AreaCard key={area.key} area={area} delay={i * 100} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          className={`text-center mt-12 transition-all duration-700 delay-500 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <Link
            href={`/${locale}/about`}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-rmc-green text-white text-sm font-bold rounded-full shadow-lg shadow-rmc-green/25 hover:bg-rmc-green-dark hover:scale-105 transition-all duration-200"
          >
            View All Programs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
