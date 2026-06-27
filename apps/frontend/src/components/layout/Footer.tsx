'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Phone, Mail, Facebook, Twitter, Instagram, Youtube, ExternalLink, Radio, ChevronDown, Send, Loader2, Check } from 'lucide-react';
import { IJWI_RADIO_URL } from '@/lib/constants';
import { useTranslations } from 'next-intl';
import { PWAInstallButton } from '@/components/ui/PWAInstallButton';
import { publicApi } from '@/lib/public-api';
import {
  ContentKeys,
  SOCIAL_DEFAULT,
  getSiteContent,
  mergeContent,
  type SocialChannel,
} from '@/lib/content-api';

// Channel key → icon, mirroring the contact page so the footer shows the same
// platforms and links (sourced from the shared social content store).
const CHANNEL_ICON: Record<SocialChannel['key'], typeof Facebook> = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  youtube: Youtube,
};

/**
 * Collapsible footer column — on mobile the details are hidden and the heading
 * acts as a toggle; on md+ it's always open and the toggle is inert.
 */
function CollapsibleColumn({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 mb-5 md:cursor-default md:pointer-events-none"
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-white/50 transition-transform duration-200 md:hidden ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`${open ? 'block' : 'hidden'} md:block`}>{children}</div>
    </div>
  );
}

function NewsletterSignup() {
  const t = useTranslations('footer');
  const { locale } = useParams<{ locale: string }>();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;
    setStatus('loading');
    try {
      await publicApi.subscribe(email.trim(), locale);
      setStatus('done');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="mt-7">
      <p className="text-white font-semibold text-sm mb-1">{t('newsletterTitle')}</p>
      <p className="text-white/45 text-xs mb-3 max-w-xs">{t('newsletterText')}</p>
      {status === 'done' ? (
        <p className="inline-flex items-center gap-1.5 text-rmc-gold-light text-sm font-medium">
          <Check className="w-4 h-4" /> {t('newsletterSuccess')}
        </p>
      ) : (
        <form onSubmit={submit} className="flex max-w-xs gap-2 mb-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
            placeholder={t('newsletterPlaceholder')}
            aria-label={t('newsletterPlaceholder')}
            className="min-w-0 flex-1 rounded-full bg-white/[0.07] border border-white/10 px-4 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-rmc-green focus:ring-2 focus:ring-rmc-green/40"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            aria-label={t('newsletterButton')}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-rmc-green px-4 py-2 text-sm font-semibold text-white hover:bg-rmc-green-dark disabled:opacity-60 transition-colors"
          >
            {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      )}
      {status === 'error' && <p className="mt-2 text-xs text-red-400">{t('newsletterError')}</p>}
    </div>
  );
}

export function Footer() {
  const { locale } = useParams<{ locale: string }>();
  const t = useTranslations('footer');

  // Same social channels (and links) the contact page and home Social Media
  // section show — admin managed in Content → Social Media, so all surfaces
  // stay in sync. Falls back to seeded defaults until loaded.
  const [channels, setChannels] = useState<SocialChannel[]>(SOCIAL_DEFAULT.channels);
  useEffect(() => {
    let active = true;
    getSiteContent<Record<string, unknown>>(ContentKeys.social)
      .then((data) => {
        if (active && data) setChannels(mergeContent(SOCIAL_DEFAULT, data).channels);
      })
      .catch(() => {/* keep defaults */});
    return () => { active = false; };
  }, []);

  const quickLinks = [
    { href: `/${locale}/blog`, labelKey: 'links.blog' },
    { href: `/${locale}/member/register`, labelKey: 'links.join' },
    { href: `/${locale}/donate`, labelKey: 'links.donate' },
    { href: `/${locale}/activities`, labelKey: 'links.trends' },
  ] as const;

  const services = [
    { href: `/${locale}/services/marriage`, labelKey: 'serviceLinks.marriage' },
    { href: `/${locale}/services/scholarship`, labelKey: 'serviceLinks.scholarship' },
    { href: `/${locale}/services/conduct`, labelKey: 'serviceLinks.conduct' },
    { href: `/${locale}/services/funeral`, labelKey: 'serviceLinks.funeral' },
    { href: `/${locale}/services/tender`, labelKey: 'serviceLinks.tenders' },
  ] as const;

  const linkClass =
    'inline-block text-white/55 hover:text-white text-sm transition-all duration-200 hover:translate-x-1';

  return (
    <footer className="relative bg-black mt-48">
      <div className="absolute inset-0 pattern-islamic opacity-30 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rmc-gold/40 to-transparent pointer-events-none z-20" />

      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -translate-y-full z-10 h-24 sm:h-32 md:h-36 pointer-events-none"
        style={{
          backgroundImage: 'url(/footer-architecture.svg)',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          backgroundPosition: 'bottom center',
          WebkitMaskImage: 'linear-gradient(to top, #000 45%, transparent)',
          maskImage: 'linear-gradient(to top, #000 45%, transparent)',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div>
            <Link href={`/${locale}`} className="inline-flex items-center gap-2.5 mb-5 group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 motion-safe:group-hover:scale-105 transition-transform duration-200">
                <Image src="/logo.webp" alt="RMC" width={40} height={40} className="w-full h-full object-contain p-0.5" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                <div className="leading-tight">
                  <p className="text-white font-bold text-sm tracking-tight leading-tight">Rwanda Muslim</p>
                  <p className="text-rmc-gold-light/80 text-[10px] font-semibold uppercase tracking-[0.18em] leading-tight">Community</p>
                </div>
              </div>
            </Link>

            <p className="text-white/45 text-sm leading-relaxed mb-7 max-w-xs">
              {t('tagline')}
            </p>

            <div className="flex items-center gap-2.5 mb-5">
              {channels.map((channel) => {
                const Icon = CHANNEL_ICON[channel.key] ?? ExternalLink;
                return (
                  <a
                    key={channel.key}
                    href={channel.href || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={channel.label}
                    className="w-9 h-9 rounded-full bg-white/[0.07] border border-white/10 text-white/70 hover:text-white hover:bg-rmc-green hover:border-rmc-green flex items-center justify-center transition-all duration-200 motion-safe:hover:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold/50"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>

            <NewsletterSignup />

            <PWAInstallButton />
          </div>

          {/* Quick Links — collapsible on mobile but open by default, open column on md+ */}
          <CollapsibleColumn title={t('quickLinks')} defaultOpen>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={IJWI_RADIO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-rmc-gold/70 hover:text-rmc-gold text-sm transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 shrink-0" /> {t('learnIslam')}
                </a>
              </li>
            </ul>
          </CollapsibleColumn>

          {/* Services */}
          <CollapsibleColumn title={t('services')}>
            <ul className="space-y-3">
              {services.map((link) => (
                <li key={link.labelKey}>
                  <Link href={link.href} className={linkClass}>
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </CollapsibleColumn>

          {/* Contact */}
          <CollapsibleColumn title={t('contact')}>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-rmc-gold-light" />
                </span>
                <a href="mailto:rwandamuslimc@gmail.com" className="text-white/55 hover:text-white text-sm transition-colors">rwandamuslimc@gmail.com</a>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-rmc-gold-light" />
                </span>
                <a href="mailto:islamrwanda18@gmail.com" className="text-white/55 hover:text-white text-sm transition-colors">islamrwanda18@gmail.com</a>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5 text-rmc-gold-light" />
                </span>
                <a href="tel:+250788308436" className="text-white/55 hover:text-white text-sm transition-colors">(+250) 788 308 436</a>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-rmc-gold-light" />
                </span>
                <span className="text-white/55 text-sm">Kigali, Rwanda</span>
              </li>
            </ul>
          </CollapsibleColumn>
        </div>

        {/* Alhamdulillah — always in Arabic, not translated */}
        <div className="ornament-divider max-w-sm mx-auto mb-8">
          <p className="font-arabic text-rmc-gold-light/90 text-lg md:text-xl text-center px-3 leading-loose" dir="rtl">
            الْحَمْدُ لِلَّٰهِ رَبِّ الْعَالَمِينَ
          </p>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/35">
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/contact`} className="hover:text-rmc-gold-light transition-colors">{t('privacy')}</Link>
            <span className="text-white/20">·</span>
            <Link href={`/${locale}/contact`} className="hover:text-rmc-gold-light transition-colors">{t('terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
