'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface Partner {
  name: string;
  initials: string;
  category: string;
  website: string;
  logoUrl: string;
  fallbackBg: string;
  fallbackText: string;
  badgeBg: string;
}

const PARTNERS: Partner[] = [
  {
    name: 'Organization of Islamic Cooperation',
    initials: 'OIC',
    category: 'International',
    website: 'https://www.oic-oci.org',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/OIC_Logo_since_2011.svg/240px-OIC_Logo_since_2011.svg.png',
    fallbackBg: 'bg-emerald-50',
    fallbackText: 'text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    name: 'Islamic Development Bank',
    initials: 'IsDB',
    category: 'Finance',
    website: 'https://www.isdb.org',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Islamic_Development_Bank_Group_logo.svg/240px-Islamic_Development_Bank_Group_logo.svg.png',
    fallbackBg: 'bg-sky-50',
    fallbackText: 'text-sky-700',
    badgeBg: 'bg-sky-100 text-sky-700',
  },
  {
    name: 'Muslim World League',
    initials: 'MWL',
    category: 'Religious',
    website: 'https://www.themwl.org',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Muslim_World_League_logo.svg/240px-Muslim_World_League_logo.svg.png',
    fallbackBg: 'bg-violet-50',
    fallbackText: 'text-violet-700',
    badgeBg: 'bg-violet-100 text-violet-700',
  },
  {
    name: 'Government of Rwanda',
    initials: 'GoR',
    category: 'Government',
    website: 'https://www.gov.rw',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coat_of_arms_of_Rwanda.svg/200px-Coat_of_arms_of_Rwanda.svg.png',
    fallbackBg: 'bg-amber-50',
    fallbackText: 'text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-700',
  },
  {
    name: 'UNHCR Rwanda',
    initials: 'UNHCR',
    category: 'Humanitarian',
    website: 'https://www.unhcr.org/rw',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/UNHCR-visibility-vertical-Blue-RGB-v2015.jpg/240px-UNHCR-visibility-vertical-Blue-RGB-v2015.jpg',
    fallbackBg: 'bg-blue-50',
    fallbackText: 'text-blue-700',
    badgeBg: 'bg-blue-100 text-blue-700',
  },
  {
    name: 'Rwanda Education Board',
    initials: 'REB',
    category: 'Education',
    website: 'https://www.reb.rw',
    logoUrl: '',
    fallbackBg: 'bg-teal-50',
    fallbackText: 'text-teal-700',
    badgeBg: 'bg-teal-100 text-teal-700',
  },
  {
    name: 'Africa Muslims Agency',
    initials: 'AMA',
    category: 'Development',
    website: 'https://www.africamuslimsagency.com',
    logoUrl: '',
    fallbackBg: 'bg-orange-50',
    fallbackText: 'text-orange-700',
    badgeBg: 'bg-orange-100 text-orange-700',
  },
  {
    name: 'Qatar Charity',
    initials: 'QC',
    category: 'Charity',
    website: 'https://www.qcharity.org',
    logoUrl: '',
    fallbackBg: 'bg-cyan-50',
    fallbackText: 'text-cyan-700',
    badgeBg: 'bg-cyan-100 text-cyan-700',
  },
];

function PartnerCard({
  partner,
  delay,
  visible,
}: {
  partner: Partner;
  delay: number;
  visible: boolean;
}) {
  const [imgError, setImgError] = useState(!partner.logoUrl);

  return (
    <a
      href={partner.website}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex flex-col items-center gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-rmc-green/20 hover:-translate-y-1.5 transition-all duration-300 overflow-hidden ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Hover glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-rmc-green/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* External link badge */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
        <div className="w-6 h-6 rounded-full bg-rmc-green/10 flex items-center justify-center">
          <ExternalLink className="w-3 h-3 text-rmc-green" />
        </div>
      </div>

      {/* Logo area */}
      <div
        className={`relative w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-300 shadow-sm ${
          imgError ? partner.fallbackBg : 'bg-gray-50'
        }`}
      >
        {imgError ? (
          <span className={`text-base font-extrabold tracking-tight ${partner.fallbackText}`}>
            {partner.initials}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.logoUrl}
            alt={`${partner.name} logo`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-16 h-16 object-contain"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-semibold text-gray-700 text-center leading-snug group-hover:text-rmc-green transition-colors duration-200 line-clamp-2 flex-1">
        {partner.name}
      </p>

      {/* Category badge */}
      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${partner.badgeBg}`}>
        {partner.category}
      </span>
    </a>
  );
}

export function PartnersSection() {
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);
  const { ref: gridRef, visible: gridVisible } = useScrollReveal(0.05);

  return (
    <section className="relative bg-gray-50/80 py-20 md:py-24 overflow-hidden">
      {/* Top/bottom separators */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      {/* Ambient decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rmc-green/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rmc-gold/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div
          ref={titleRef}
          className={`text-center mb-14 transition-all duration-700 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-rmc-green/10 text-rmc-green px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-green animate-pulse" />
            Our Partners
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Trusted Collaborators</h2>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto text-sm md:text-base">
            RMC works alongside leading international, regional, and local organizations to serve
            Rwanda's Muslim community.
          </p>
        </div>

        {/* Partners grid — 4 cols → 2 rows */}
        <div
          ref={gridRef}
          className="grid grid-cols-2 sm:grid-cols-4 gap-5"
        >
          {PARTNERS.map((partner, i) => (
            <PartnerCard key={partner.name} partner={partner} delay={i * 80} visible={gridVisible} />
          ))}
        </div>

        {/* Footer note */}
        <p
          className={`text-center text-sm text-gray-400 mt-10 transition-all duration-700 delay-700 ${
            titleVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Interested in partnering with RMC?{' '}
          <a href="mailto:info@rmc.rw" className="text-rmc-green hover:underline font-semibold">
            Contact us
          </a>
        </p>
      </div>
    </section>
  );
}
