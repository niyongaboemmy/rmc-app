'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  ContentKeys,
  WHO_WE_ARE_DEFAULT,
  pick,
  pickLang,
  type WhoWeAreContent,
} from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { InlineText } from '@/components/edit-mode/InlineText';

export function WhoWeAreSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: headerRef, visible: headerVisible } = useScrollReveal(0.15);
  const { ref: bodyRef, visible: bodyVisible } = useScrollReveal(0.1);

  // Content managed from Admin → Content → Who We Are. Falls back to the
  // built-in defaults until something is saved. In super-admin Edit Mode the
  // heading, verse and description below are click-to-edit in place.
  const { content, setField } = useEditableContent<WhoWeAreContent>(ContentKeys.whoWeAre, WHO_WE_ARE_DEFAULT);

  // Flat blob keyed by language suffix (headingEn/headingRw/…); the editor writes
  // straight to the active-locale field.
  const suffix = locale === 'rw' ? 'Rw' : locale === 'ar' ? 'Ar' : 'En';
  const editField = (base: string) => (v: string) =>
    setField((d) => { d[`${base}${suffix}`] = v; });
  /** This locale's own text, unresolved — what the edit box shows (see `editValue`). */
  const rawField = (base: string) => content[`${base}${suffix}`] ?? '';

  const description = pickLang(content, 'description', locale);

  return (
    <section className="relative bg-transparent py-12 md:py-16 overflow-hidden">
      {/* Faint Islamic geometric texture — echoes the hero's pattern overlay */}
      <div className="absolute inset-0 pattern-light opacity-70 pointer-events-none" />
      {/* Soft ambient light wash */}
      <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-rmc-green-light rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-rmc-gold/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-[90px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header — centered */}
        <div
          ref={headerRef}
          className={`max-w-3xl mx-auto text-center transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <h2
            className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 mb-5 ${locale === 'ar' ? 'font-arabic' : ''}`}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          >
            <InlineText
              as="span"
              lang={locale}
              value={pickLang(content, 'heading', locale)}
              editValue={rawField('heading')}
              onCommit={editField('heading')}
              placeholder="Heading"
            />{' '}
            <InlineText
              as="span"
              lang={locale}
              value={pickLang(content, 'headingHighlight', locale)}
              editValue={rawField('headingHighlight')}
              onCommit={editField('headingHighlight')}
              className="text-rmc-green"
              placeholder="Highlighted words"
            />
          </h2>

          {/* Arabic touch framed by gold ornament — echoes the hero's scripture centerpiece */}
          <div className="ornament-divider max-w-md mx-auto mb-3">
            <InlineText
              as="p"
              lang={locale}
              value={pickLang(content, 'verse', locale)}
              editValue={rawField('verse')}
              onCommit={editField('verse')}
              className="font-arabic text-rmc-green-dark text-lg md:text-xl leading-loose text-center px-2"
              dir="rtl"
              placeholder="Arabic verse"
            />
          </div>
          <InlineText
            as="p"
            lang={locale}
            value={pickLang(content, 'verseRef', locale)}
            editValue={rawField('verseRef')}
            onCommit={editField('verseRef')}
            className={`text-rmc-gold text-[11px] font-semibold tracking-wide mb-6 ${locale === 'ar' ? 'font-arabic' : ''}`}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            placeholder="Verse reference"
          />

          <InlineText
            as="p"
            lang={locale}
            value={description}
            editValue={rawField('description')}
            onCommit={editField('description')}
            className={`text-gray-500 leading-relaxed text-sm md:text-base max-w-2xl mx-auto ${locale === 'ar' ? 'font-arabic' : ''}`}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            placeholder="Description"
          />
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          className={`transition-all duration-700 delay-150 ${
            bodyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-12">
            <Link
              href={`/${locale}/about`}
              className="group inline-flex items-center justify-center gap-2 px-7 py-2.5 bg-rmc-green text-white text-sm font-bold rounded-lg shadow-sm shadow-rmc-green/20 hover:bg-rmc-green-dark transition-colors duration-300"
            >
              <BookOpen className="w-4 h-4" />
              {pick({ en: 'Learn Our Story', rw: 'Menya Inkuru Yacu', ar: 'تعرّف على قصتنا' }, locale)}
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`/${locale}/contact`}
              className="inline-flex items-center justify-center gap-2 px-7 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:border-rmc-green hover:text-rmc-green transition-colors duration-300"
            >
              {pick({ en: 'Contact Us', rw: 'Twandikire', ar: 'اتصل بنا' }, locale)}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
