'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useTilt } from '@/hooks/useTilt';

interface Pillar {
  number: string;
  arabic: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
}

const pillars: Pillar[] = [
  {
    number: '١',
    arabic: 'الشَّهَادَة',
    name: 'Shahada',
    description: 'Declaration of faith — there is no god but Allah, and Muhammad is His messenger.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300',
  },
  {
    number: '٢',
    arabic: 'الصَّلَاة',
    name: 'Salah',
    description: 'Five daily prayers that connect the believer to Allah throughout the day.',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50 border-sky-100 hover:border-sky-300',
  },
  {
    number: '٣',
    arabic: 'الزَّكَاة',
    name: 'Zakat',
    description: 'Charitable giving of 2.5% of savings to support those in need.',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-100 hover:border-amber-300',
  },
  {
    number: '٤',
    arabic: 'الصَّوم',
    name: 'Sawm',
    description: 'Fasting during the blessed month of Ramadan for spiritual purification.',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50 border-violet-100 hover:border-violet-300',
  },
  {
    number: '٥',
    arabic: 'الحَجّ',
    name: 'Hajj',
    description: 'Pilgrimage to Mecca at least once in a lifetime for those who are able.',
    color: 'text-rmc-green',
    bgColor: 'bg-rmc-green-light border-rmc-green/20 hover:border-rmc-green/50',
  },
];

export function IslamicPillarsSection() {
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);

  return (
    <section className="relative bg-white py-20 md:py-24 overflow-hidden">
      {/* Subtle pattern */}
      <div className="absolute inset-0 pattern-light" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div
          ref={titleRef}
          className={`text-center mb-14 transition-all duration-700 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-rmc-green/10 text-rmc-green px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-green" />
            Faith Foundation
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            The Five Pillars of{' '}
            <span className="title-underline text-rmc-green">Islam</span>
          </h2>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto text-sm md:text-base">
            The foundation upon which the faith of every Muslim rests — guiding us to a life of devotion, compassion, and community.
          </p>
        </div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {pillars.map((pillar, i) => (
            <PillarCard key={pillar.name} pillar={pillar} delay={i * 100} />
          ))}
        </div>

        {/* Bottom quote */}
        <div
          className={`mt-14 text-center transition-all duration-700 delay-500 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <p className="text-gray-400 text-sm italic max-w-md mx-auto">
            &ldquo;Islam is a path of peace, mercy, and guidance for all of humanity.&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}

function PillarCard({ pillar, delay }: { pillar: Pillar; delay: number }) {
  const { ref: revealRef, visible } = useScrollReveal(0.1);
  const tiltRef = useTilt(6);

  return (
    <div
      ref={(node) => {
        (revealRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (tiltRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={`shimmer-card group relative border rounded-2xl p-6 transition-all duration-500 hover:shadow-lg ${pillar.bgColor} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms`, transformStyle: 'preserve-3d' }}
    >
      {/* Number badge */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-arabic text-xl font-bold mb-4 bg-white shadow-sm ${pillar.color}`}>
        {pillar.number}
      </div>

      {/* Arabic name */}
      <p className={`font-arabic text-2xl mb-1 ${pillar.color}`} dir="rtl">
        {pillar.arabic}
      </p>

      {/* Latin name */}
      <h3 className={`font-bold text-gray-900 text-base mb-2`}>{pillar.name}</h3>

      {/* Description */}
      <p className="text-gray-500 text-sm leading-relaxed">{pillar.description}</p>
    </div>
  );
}
