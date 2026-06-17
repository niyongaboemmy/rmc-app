'use client';

import { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/Reveal';
import { MosqueFinder } from '@/components/contact/MosqueFinder';

const socialLinks = [
  { Icon: Facebook, label: 'Facebook', followers: '24.5K', href: '#', bg: 'bg-blue-600' },
  { Icon: Twitter, label: 'Twitter / X', followers: '12.8K', href: '#', bg: 'bg-gray-900' },
  {
    Icon: Instagram,
    label: 'Instagram',
    followers: '18.2K',
    href: '#',
    bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
  },
  { Icon: Youtube, label: 'YouTube', followers: '8.4K', href: '#', bg: 'bg-red-600' },
];

export default function ContactPage() {
  const t = useTranslations('contact');
  const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire up to backend
    setSubmitted(true);
  };

  const contactInfo = [
    { label: t('address'), value: 'KN 4 Ave, Kigali, Rwanda', icon: MapPin },
    { label: t('phone'), value: '+250 788 000 000', icon: Phone, href: 'tel:+250788000000' },
    { label: t('email'), value: 'info@rmc.rw', icon: Mail, href: 'mailto:info@rmc.rw' },
    { label: t('hours'), value: t('hoursValue'), icon: Clock },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Header */}
        <PageHero eyebrow="RMC" title={t('title')} subtitle={t('subtitle')} ornament />

        {/* ===================================================================
            1. COMMUNICATION & ADDRESS — info cards + contact form
        =================================================================== */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="max-w-5xl mx-auto overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-rmc-green/5">
              <div className="grid lg:grid-cols-2">
                {/* Contact info */}
                <div className="p-7 sm:p-10 bg-rmc-green/[0.05]">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {t('communicationTitle')}
                  </h2>
                  <p className="mt-2 text-gray-500">{t('communicationSubtitle')}</p>

                  <div className="mt-8 space-y-5">
                    {contactInfo.map((item) => {
                      const ItemIcon = item.icon;
                      const inner = (
                        <div className="flex items-start gap-3.5">
                          <span className="w-10 h-10 rounded-xl bg-rmc-green-light flex items-center justify-center shrink-0">
                            <ItemIcon className="w-5 h-5 text-rmc-green" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-500">{item.label}</div>
                            <div className="text-gray-900 font-medium break-words">{item.value}</div>
                          </div>
                        </div>
                      );
                      return item.href ? (
                        <a
                          key={item.label}
                          href={item.href}
                          className="block -m-2 rounded-xl p-2 transition-colors hover:bg-gray-50"
                        >
                          {inner}
                        </a>
                      ) : (
                        <div key={item.label}>{inner}</div>
                      );
                    })}
                  </div>

                  {/* Social links */}
                  <div className="mt-8 pt-6 border-t border-rmc-green/10">
                    <p className="text-sm font-semibold text-gray-900">{t('socialTitle')}</p>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {socialLinks.map(({ Icon, label, href, bg }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} text-white shadow-sm transition-transform duration-200 hover:scale-110`}
                        >
                          <Icon className="h-5 w-5" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contact form */}
                <div className="p-7 sm:p-10 bg-gray-50/60 border-t border-gray-100 lg:border-t-0 lg:border-l">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">{t('form.heading')}</h3>
                  {submitted ? (
                    <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-800">
                      <CheckCircle className="inline w-5 h-5 mr-1.5 text-green-600" />
                      {t('form.success')}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {[
                        { key: 'name', type: 'text', label: t('form.name') },
                        { key: 'email', type: 'email', label: t('form.email') },
                        { key: 'subject', type: 'text', label: t('form.subject') },
                      ].map(({ key, type, label }) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {label}
                          </label>
                          <input
                            type={type}
                            required
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-rmc-green focus:border-transparent outline-none"
                            value={(formState as Record<string, string>)[key]}
                            onChange={(e) =>
                              setFormState((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('form.message')}
                        </label>
                        <textarea
                          required
                          rows={5}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-rmc-green focus:border-transparent outline-none resize-none"
                          value={formState.message}
                          onChange={(e) =>
                            setFormState((prev) => ({ ...prev, message: e.target.value }))
                          }
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3 bg-rmc-green text-white font-semibold rounded-lg hover:bg-rmc-green-dark transition-colors"
                      >
                        {t('form.submit')}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ===================================================================
            2. FIND A MOSQUE — finder + live map
        =================================================================== */}
        <section id="find-mosque" className="py-16 scroll-mt-28 bg-rmc-green/[0.03] border-y border-rmc-green/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="max-w-2xl mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t('findMosque')}</h2>
                <p className="mt-2 text-gray-500">{t('findMosqueSubtitle')}</p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <MosqueFinder />
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
