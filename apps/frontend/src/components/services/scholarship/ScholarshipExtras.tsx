'use client';

/**
 * The two sections the scholarship board has that Tenders and Jobs do not — the
 * FAQ and the closing call to action. Same arrangement as
 * `components/services/board/ServiceBoardCopy`: the page keeps the layout, these
 * islands carry the editable text.
 *
 * The FAQ is fixed at four questions for the reason the content module explains —
 * `mergeContent` merges arrays by index, so a removed entry would come back.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, Phone } from 'lucide-react';
import { InlineText } from '@/components/edit-mode/InlineText';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import {
  ContentKeys,
  SCHOLARSHIP_SERVICE_DEFAULT,
  isRtl,
  pick,
  raw,
  type Locale,
  type ScholarshipServiceContent,
} from '@/lib/content-api';

function useScholarshipCopy() {
  const { locale } = useParams<{ locale: string }>();
  const { content, editing, setField } = useEditableContent<ScholarshipServiceContent>(
    ContentKeys.scholarshipService,
    SCHOLARSHIP_SERVICE_DEFAULT,
  );
  return {
    content,
    editing,
    setField,
    locale,
    lang: locale as Locale,
    dir: isRtl(locale) ? ('rtl' as const) : ('ltr' as const),
  };
}

export function ScholarshipFaq() {
  const { content, editing, setField, locale, lang, dir } = useScholarshipCopy();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <InlineText
          as="h2"
          lang={locale}
          value={pick(content.faq.title, locale)}
          editValue={raw(content.faq.title, locale)}
          onCommit={(v) => setField((d) => { d.faq.title[lang] = v; })}
          className="text-2xl font-bold text-gray-900 mb-2"
          dir={dir}
          placeholder="FAQ heading"
        />
      </div>
      <div className="space-y-3">
        {content.faq.items.map((item, i) => (
          <details
            key={i}
            /* Forced open while editing: the answers are collapsed by default, and a
               field nobody can see is a field nobody can edit. */
            open={editing || undefined}
            className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-rmc-green transition-colors duration-200 [&_summary]:list-none"
          >
            <summary className="flex items-center justify-between cursor-pointer font-bold text-gray-900 text-sm">
              <InlineText
                as="span"
                lang={locale}
                value={pick(item.q, locale)}
                editValue={raw(item.q, locale)}
                onCommit={(v) => setField((d) => { d.faq.items[i].q[lang] = v; })}
                dir={dir}
                placeholder="Question"
              />
              <span className="w-6 h-6 shrink-0 rounded-full bg-rmc-green-light text-rmc-green-dark flex items-center justify-center text-base leading-none group-open:rotate-45 transition-transform duration-200 ms-4">
                +
              </span>
            </summary>
            <InlineText
              as="p"
              lang={locale}
              value={pick(item.a, locale)}
              editValue={raw(item.a, locale)}
              onCommit={(v) => setField((d) => { d.faq.items[i].a[lang] = v; })}
              className="text-gray-600 text-sm leading-relaxed mt-3"
              dir={dir}
              placeholder="Answer"
            />
          </details>
        ))}
      </div>
    </div>
  );
}

export function ScholarshipCta() {
  const { content, editing, setField, locale, lang, dir } = useScholarshipCopy();
  const startHref = `/${locale}/services/scholarship/apply`;
  const contactHref = `/${locale}/contact`;

  const startLabel = pick(content.cta.startLabel, locale);
  const contactLabel = pick(content.cta.contactLabel, locale);

  const startCls =
    'inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-rmc-green-dark/40 transition-all duration-200 hover:scale-105 active:scale-100';
  const contactCls =
    'inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/25 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-all duration-200';

  return (
    <div className="relative max-w-2xl mx-auto">
      <InlineText
        as="h2"
        lang={locale}
        value={pick(content.cta.title, locale)}
        editValue={raw(content.cta.title, locale)}
        onCommit={(v) => setField((d) => { d.cta.title[lang] = v; })}
        className="text-2xl font-bold text-white mb-3"
        dir={dir}
        placeholder="Call to action"
      />
      <InlineText
        as="p"
        lang={locale}
        value={pick(content.cta.subtitle, locale)}
        editValue={raw(content.cta.subtitle, locale)}
        onCommit={(v) => setField((d) => { d.cta.subtitle[lang] = v; })}
        className="text-white/60 mb-7 text-sm"
        dir={dir}
        placeholder="Supporting line"
      />
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {/* While editing the buttons become text fields — a <Link> would navigate
            away on the click that is meant to place the caret. */}
        {editing ? (
          <InlineText
            as="span"
            lang={locale}
            value={startLabel}
            editValue={raw(content.cta.startLabel, locale)}
            onCommit={(v) => setField((d) => { d.cta.startLabel[lang] = v; })}
            className={startCls}
            placeholder="Button label"
          />
        ) : (
          <Link href={startHref} className={startCls}>
            {startLabel} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        )}
        {editing ? (
          <InlineText
            as="span"
            lang={locale}
            value={contactLabel}
            editValue={raw(content.cta.contactLabel, locale)}
            onCommit={(v) => setField((d) => { d.cta.contactLabel[lang] = v; })}
            className={contactCls}
            placeholder="Button label"
          />
        ) : (
          <Link href={contactHref} className={contactCls}>
            <Phone className="w-4 h-4" /> {contactLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
