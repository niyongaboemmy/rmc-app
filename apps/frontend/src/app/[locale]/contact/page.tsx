'use client';

import { useState } from 'react';
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
import { EditablePageHero } from '@/components/layout/EditablePageHero';
import { Reveal } from '@/components/Reveal';
import { MosqueFinder } from '@/components/contact/MosqueFinder';
import { submitContactMessage } from '@/lib/contactApi';
import {
  ContentKeys,
  SOCIAL_DEFAULT,
  CONTACT_HERO_DEFAULT,
  pick,
  type SocialChannel,
} from '@/lib/content-api';
import { usePreviewableContent } from '@/lib/content/preview-store';
import {
  useContactContent,
  EditableTri,
  EditablePlain,
  type PlainField,
} from '@/components/contact/ContactInlineEdit';

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
  const { content, editing } = useContactContent();
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(false);

  // Same social channels (and links) the home Social Media section shows — admin
  // managed in Content → Social Media, so the two surfaces stay in sync.
  // Read on the server by the locale layout (the footer needs the same section), so
  // these render from saved copy in the first paint.
  const channels: SocialChannel[] = usePreviewableContent(
    ContentKeys.social,
    SOCIAL_DEFAULT,
  ).channels;

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

  // The contact-detail rows. `tri` rows are translated; `plain` rows are shared
  // strings. In view mode empty rows are hidden; while editing every row shows so
  // an admin can fill blanks.
  type Row =
    | { id: string; kind: 'tri'; field: 'address' | 'hours'; label: string; icon: typeof MapPin; multiline: boolean; href?: string }
    | { id: string; kind: 'plain'; field: PlainField; label: string; icon: typeof MapPin; href?: string };

  const rows: Row[] = [
    { id: 'address', kind: 'tri', field: 'address', label: t('address'), icon: MapPin, multiline: true },
    { id: 'phone', kind: 'plain', field: 'phone', label: t('phone'), icon: Phone, href: content.phoneHref || undefined },
    { id: 'email', kind: 'plain', field: 'email', label: t('email'), icon: Mail, href: content.email ? `mailto:${content.email}` : undefined },
    { id: 'email2', kind: 'plain', field: 'email2', label: t('email2'), icon: Mail, href: content.email2 ? `mailto:${content.email2}` : undefined },
    { id: 'hours', kind: 'tri', field: 'hours', label: t('hours'), icon: Clock, multiline: true },
  ];

  const hasValue = (r: Row) => (r.kind === 'tri' ? !!pick(content[r.field], locale) : !!content[r.field]);
  const visibleRows = editing ? rows : rows.filter(hasValue);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Header */}
        {/* Sized like the other landing heroes — About, Gallery, Announcements are all
            40vh at pt-28 pb-10. This one asked for 25vh but kept pt-36 pb-8, and ~176px
            of padding alone clears a quarter of most viewports, so the declared height
            never applied and the hero was taller than the number suggested. */}
        <EditablePageHero
          contentKey={ContentKeys.contactHero}
          defaults={CONTACT_HERO_DEFAULT}
          minHeightClassName="min-h-[40vh]"
          paddingClassName="pt-28 pb-10"
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
                  <EditableTri
                    field="communicationTitle"
                    as="h2"
                    className="text-2xl md:text-3xl font-bold text-gray-900"
                  />
                  <EditableTri
                    field="communicationSubtitle"
                    as="p"
                    className="mt-2 text-gray-500"
                    multiline
                  />

                  <div className="mt-8 space-y-5">
                    {visibleRows.map((row) => {
                      const ItemIcon = row.icon;
                      const inner = (
                        <div className="flex items-start gap-3.5">
                          <span className="w-10 h-10 rounded-xl bg-rmc-green-light flex items-center justify-center shrink-0">
                            <ItemIcon className="w-5 h-5 text-rmc-green" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-500">{row.label}</div>
                            <div className="text-gray-900 font-medium break-words">
                              {row.kind === 'tri' ? (
                                <EditableTri field={row.field} as="div" multiline={row.multiline} />
                              ) : (
                                <EditablePlain field={row.field} />
                              )}
                            </div>
                            {/* The dial link behind the phone row — only shown while editing. */}
                            {editing && row.id === 'phone' && (
                              <div className="mt-1.5">
                                <label className="block text-[11px] font-medium text-gray-400">
                                  Phone link (tel:)
                                </label>
                                <EditablePlain field="phoneHref" placeholder="tel:+250788308436" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                      // While editing, never wrap the row in a link — the inputs must stay clickable.
                      return row.href && !editing ? (
                        <a
                          key={row.id}
                          href={row.href}
                          className="block -m-2 rounded-xl p-2 transition-colors hover:bg-gray-50"
                        >
                          {inner}
                        </a>
                      ) : (
                        <div key={row.id}>{inner}</div>
                      );
                    })}
                  </div>

                  {/* Social links */}
                  <div className="mt-8 pt-6 border-t border-rmc-green/10">
                    <EditableTri field="socialTitle" as="p" className="text-sm font-semibold text-gray-900" />
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
                    {editing && (
                      <p className="mt-3 text-[11px] text-gray-400">
                        Social links are managed in Admin → Content → Social Media.
                      </p>
                    )}
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
                              errors[key] ? 'border-red-300 focus:ring-red-400' : 'border-gray-300 focus:ring-rmc-green'
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
                            errors.message ? 'border-red-300 focus:ring-red-400' : 'border-gray-300 focus:ring-rmc-green'
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
                <EditableTri
                  field="findMosqueTitle"
                  as="h2"
                  className="text-2xl md:text-3xl font-bold text-gray-900"
                />
                <EditableTri
                  field="findMosqueSubtitle"
                  as="p"
                  className="mt-2 text-gray-500"
                  multiline
                />
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
