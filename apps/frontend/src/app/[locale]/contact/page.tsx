'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  ExternalLink,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/Reveal';
import { MosqueFinder } from '@/components/contact/MosqueFinder';
import { submitContactMessage } from '@/lib/contactApi';
import {
  ContentKeys,
  SOCIAL_DEFAULT,
  CONTACT_DEFAULT,
  getSiteContent,
  mergeContent,
  pick,
  type SocialChannel,
  type ContactContent,
} from '@/lib/content-api';

// Channel key → icon/background, mirroring the home Social Media section so both
// surfaces show the same platforms and links (sourced from the social content store).
const CHANNEL_CONFIG: Record<SocialChannel['key'], { Icon: typeof Facebook; bg: string }> = {
  facebook: { Icon: Facebook, bg: 'bg-blue-600' },
  twitter: { Icon: Twitter, bg: 'bg-gray-900' },
  instagram: { Icon: Instagram, bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400' },
  youtube: { Icon: Youtube, bg: 'bg-red-600' },
};

const buildContactSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().trim().min(2, t('form.validation.name')),
    email: z.string().trim().email(t('form.validation.email')),
    subject: z.string().trim().min(3, t('form.validation.subject')),
    message: z.string().trim().min(10, t('form.validation.message')),
  });

type ContactFormData = z.infer<ReturnType<typeof buildContactSchema>>;

export default function ContactPage() {
  const t = useTranslations('contact');
  const locale = useLocale();
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(false);

  // Admin-managed Contact page content (Content → Contact Page). Falls back to
  // the seeded defaults until loaded, and English when a translation is blank.
  const [content, setContent] = useState<ContactContent>(CONTACT_DEFAULT);
  useEffect(() => {
    let active = true;
    getSiteContent<Record<string, unknown>>(ContentKeys.contact)
      .then((data) => {
        if (active && data) setContent(mergeContent(CONTACT_DEFAULT, data));
      })
      .catch(() => {/* keep defaults */});
    return () => { active = false; };
  }, []);

  // Same social channels (and links) the home Social Media section shows — admin
  // managed in Content → Social Media, so the two surfaces stay in sync.
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({ resolver: zodResolver(buildContactSchema(t)) });

  const onSubmit = async (data: ContactFormData) => {
    setErrorMsg(false);
    try {
      await submitContactMessage(data);
      setSubmitted(true);
    } catch {
      setErrorMsg(true);
    }
  };

  const contactInfo = [
    { id: 'address', label: t('address'), value: pick(content.address, locale), icon: MapPin },
    { id: 'phone', label: t('phone'), value: content.phone, icon: Phone, href: content.phoneHref || undefined },
    { id: 'email', label: t('email'), value: content.email, icon: Mail, href: content.email ? `mailto:${content.email}` : undefined },
    { id: 'email2', label: t('email2'), value: content.email2, icon: Mail, href: content.email2 ? `mailto:${content.email2}` : undefined },
    { id: 'hours', label: t('hours'), value: pick(content.hours, locale), icon: Clock },
  ].filter((item) => item.value);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Header */}
        <PageHero
          eyebrow="RMC"
          title={pick(content.title, locale)}
          subtitle={pick(content.subtitle, locale)}
          ornament
          minHeightClassName="min-h-[25vh]"
          paddingClassName="pt-36 pb-8"
        />

        {/* ===================================================================
            1. COMMUNICATION & ADDRESS — info cards + contact form
        =================================================================== */}
        <section className="py-10 px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="max-w-5xl mx-auto overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-rmc-green/5">
              <div className="grid lg:grid-cols-2">
                {/* Contact info */}
                <div className="p-7 sm:p-10 bg-rmc-green/[0.05]">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {pick(content.communicationTitle, locale)}
                  </h2>
                  <p className="mt-2 text-gray-500">{pick(content.communicationSubtitle, locale)}</p>

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
                            <div className="text-gray-900 font-medium break-words">
                              {item.value}
                            </div>
                          </div>
                        </div>
                      );
                      return item.href ? (
                        <a
                          key={item.id}
                          href={item.href}
                          className="block -m-2 rounded-xl p-2 transition-colors hover:bg-gray-50"
                        >
                          {inner}
                        </a>
                      ) : (
                        <div key={item.id}>{inner}</div>
                      );
                    })}
                  </div>

                  {/* Social links */}
                  <div className="mt-8 pt-6 border-t border-rmc-green/10">
                    <p className="text-sm font-semibold text-gray-900">{pick(content.socialTitle, locale)}</p>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {channels.map((channel) => {
                        const cfg = CHANNEL_CONFIG[channel.key];
                        const Icon = cfg?.Icon ?? ExternalLink;
                        const bg = cfg?.bg ?? 'bg-gray-500';
                        return (
                          <a
                            key={channel.key}
                            href={channel.href || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={channel.label}
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} text-white shadow-sm transition-transform duration-200 hover:scale-110`}
                          >
                            <Icon className="h-5 w-5" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Contact form */}
                <div className="p-6 sm:p-8 bg-gray-50/60 border-t border-gray-100 lg:border-t-0 lg:border-l">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{t('form.heading')}</h3>
                  {submitted ? (
                    <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-800">
                      <CheckCircle className="inline w-5 h-5 mr-1.5 text-green-600" />
                      {t('form.success')}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
                      {([
                        { key: 'name', type: 'text', label: t('form.name') },
                        { key: 'email', type: 'email', label: t('form.email') },
                        { key: 'subject', type: 'text', label: t('form.subject') },
                      ] as const).map(({ key, type, label }) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-0.5">
                            {label}
                          </label>
                          <input
                            type={type}
                            aria-invalid={!!errors[key]}
                            className={`w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:border-transparent outline-none ${
                              errors[key] ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-rmc-green'
                            }`}
                            {...register(key)}
                          />
                          {errors[key] && (
                            <p className="mt-1 text-xs font-medium text-red-600">{errors[key]?.message}</p>
                          )}
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-0.5">
                          {t('form.message')}
                        </label>
                        <textarea
                          rows={2}
                          aria-invalid={!!errors.message}
                          className={`w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:border-transparent outline-none resize-none ${
                            errors.message ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-rmc-green'
                          }`}
                          {...register('message')}
                        />
                        {errors.message && (
                          <p className="mt-1 text-xs font-medium text-red-600">{errors.message.message}</p>
                        )}
                      </div>
                      {errorMsg && (
                        <p className="text-sm font-medium text-red-600">{t('form.error')}</p>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 bg-rmc-green text-white font-semibold rounded-lg hover:bg-rmc-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                      >
                        {isSubmitting && (
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        )}
                        {isSubmitting ? t('form.sending') : t('form.submit')}
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
        <section
          id="find-mosque"
          className="py-10 scroll-mt-28 bg-rmc-green/[0.03] border-y border-rmc-green/10"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="max-w-2xl mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{pick(content.findMosqueTitle, locale)}</h2>
                <p className="mt-2 text-gray-500">{pick(content.findMosqueSubtitle, locale)}</p>
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
