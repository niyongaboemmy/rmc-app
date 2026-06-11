'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

function MosqueSkyline() {
  // The reference site tiles this SVG ~30× horizontally to fill the footer top.
  // Each tile is rendered at auto-width × 220px, repeating across the full width.
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height: 220,
        backgroundColor: '#ffffff',
        backgroundImage: 'url(/footer-architecture.svg)',
        backgroundSize: 'auto 220px',
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'top left',
      }}
    />
  );
}

const socialLinks = [
  { Icon: Facebook, href: '#', label: 'Facebook' },
  { Icon: Twitter, href: '#', label: 'Twitter' },
  { Icon: Instagram, href: '#', label: 'Instagram' },
  { Icon: Youtube, href: '#', label: 'YouTube' },
];

export function Footer() {
  const t = useTranslations('nav');
  const { locale } = useParams<{ locale: string }>();

  const quickLinks = [
    { href: `/${locale}`, label: 'Home' },
    { href: `/${locale}/about`, label: 'About RMC' },
    { href: `/${locale}/services`, label: 'Our Services' },
    { href: `/${locale}/blog`, label: 'Blog & News' },
    { href: `/${locale}/contact`, label: 'Contact Us' },
    { href: `/${locale}/member/register`, label: 'Join RMC' },
  ];

  const services = [
    { href: `/${locale}/services`, label: 'Marriage Documents' },
    { href: `/${locale}/services`, label: 'Scholarships' },
    { href: `/${locale}/services`, label: 'Good Conduct Letter' },
    { href: `/${locale}/services`, label: 'Funeral Coordination' },
    { href: `/${locale}/services`, label: 'Job Opportunities' },
    { href: `/${locale}/services`, label: 'Tenders' },
  ];

  return (
    <footer className="relative bg-[#0a0a0a] overflow-hidden">
      {/* Mosque skyline top divider */}
      <MosqueSkyline />

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div>
            <Link href={`/${locale}`} className="inline-flex items-center gap-2.5 mb-5 group">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Image src="/logo.webp" alt="RMC" width={40} height={40} className="w-full h-full object-contain p-0.5" />
              </div>
              <div className="leading-tight">
                <p className="text-white font-bold text-base">Rwanda</p>
                <p className="text-rmc-green text-sm font-medium">Muslim Community</p>
              </div>
            </Link>

            <p className="text-white/40 text-sm leading-relaxed mb-7">
              Spreading the light of Islam through education, community, and service across Rwanda.
            </p>

            <div className="flex items-center gap-3">
              {socialLinks.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-rmc-green/80 hover:bg-rmc-green flex items-center justify-center text-white transition-colors duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-base mb-5">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-white/45 hover:text-white text-sm transition-colors duration-150">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-bold text-base mb-5">Services</h4>
            <ul className="space-y-3">
              {services.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-white/45 hover:text-white text-sm transition-colors duration-150">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold text-base mb-5">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-white/50" />
                </div>
                <a href="mailto:info@rmc.rw" className="text-white/45 hover:text-white text-sm transition-colors">info@rmc.rw</a>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5 text-white/50" />
                </div>
                <a href="tel:+250788000000" className="text-white/45 hover:text-white text-sm transition-colors">+250 788 000 000</a>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-white/50" />
                </div>
                <span className="text-white/45 text-sm">Rebero, Kigali</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/25">
          <p>© {new Date().getFullYear()} Rwanda Muslim Community. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/contact`} className="hover:text-white/50 transition-colors">Privacy Policy</Link>
            <span>·</span>
            <Link href={`/${locale}/contact`} className="hover:text-white/50 transition-colors">Terms of Use</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
