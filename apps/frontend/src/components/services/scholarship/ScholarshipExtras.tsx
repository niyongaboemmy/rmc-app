'use client';

/**
 * The two sections the scholarship board has that Tenders and Jobs do not — the
 * FAQ and the closing call to action. Same arrangement as
 * `components/services/board/ServiceBoardCopy`: the page keeps the layout, these
 * islands carry the editable text.
 *
 * The FAQ entries are read UNMERGED via `boardFaqs()`, the same treatment the steps
 * get: `mergeContent` merges arrays by index, so a deleted question would leave the
 * one that shifts up wearing the seeded question's translations.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, Phone, Plus } from 'lucide-react';
import { InlineText } from '@/components/edit-mode/InlineText';
import { CardEditToolbar } from '@/components/edit-mode/CardEditToolbar';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { usePreviewStore, useEditorRefreshKey } from '@/lib/content/preview-store';
import { useServerSiteContent } from '@/lib/content/SiteContentProvider';
import {
  ContentKeys,
  SCHOLARSHIP_SERVICE_DEFAULT,
  boardFaqs,
  getSiteContent,
  isRtl,
  pick,
  raw,
  tri,
  type BoardFaq,
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

/**
 * The raw saved blob, never merged — seeded from the server value so the first paint
 * is correct without giving up the unmerged invariant. Mirrors `BoardSteps`.
 */
function useRawScholarship(): ScholarshipServiceContent | null {
  const key = ContentKeys.scholarshipService;
  const store = usePreviewStore();
  const refreshKey = useEditorRefreshKey();
  const server = useServerSiteContent<ScholarshipServiceContent>(key);
  const [saved, setSaved] = useState<ScholarshipServiceContent | null>(server.value);
  const skipMountFetch = useRef(server.provided);

  useEffect(() => {
    if (skipMountFetch.current) {
      skipMountFetch.current = false;
      return;
    }
    let active = true;
    getSiteContent<ScholarshipServiceContent>(key)
      .then((data) => {
        if (active && data) setSaved(data);
      })
      .catch(() => {
        /* keep the seeded entries */
      });
    return () => {
      active = false;
    };
  }, [key, refreshKey]);

  return (store?.getOverride(key) as ScholarshipServiceContent | undefined) ?? saved;
}

export function ScholarshipFaq() {
  const { content, editing, setField, locale, lang, dir } = useScholarshipCopy();
  const { bumpSeed } = useEditMode();
  const items = boardFaqs(useRawScholarship(), SCHOLARSHIP_SERVICE_DEFAULT);

  // Every mutation writes the WHOLE array, derived from `items`, so the index-merged
  // copy in `content.faq.items` can never leak back in.
  const writeItems = (next: BoardFaq[]) => setField((d) => { d.faq.items = next; });

  const addFaq = () =>
    writeItems([...items, { id: `f${Date.now()}`, q: tri(''), a: tri('') }]);

  const removeFaq = (i: number) => {
    writeItems(items.filter((_, idx) => idx !== i));
    bumpSeed(); // re-seed the index-keyed inline fields onto their new positions
  };

  const moveFaq = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    writeItems(next);
    bumpSeed();
  };

  // An admin who removes every question removes the section — except while editing,
  // where an empty section still has to offer a way back in. The <section> wrapper
  // lives here rather than in the page so there is no empty coloured band left over.
  if (!items.length && !editing) return null;

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-rmc-green-light/40 pattern-light">
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
          {items.map((item, i) => (
            <details
              key={item.id}
              /* Forced open while editing: the answers are collapsed by default, and a
                 field nobody can see is a field nobody can edit. */
              open={editing || undefined}
              className="group relative bg-white border border-gray-100 rounded-2xl p-5 hover:border-rmc-green transition-colors duration-200 [&_summary]:list-none"
            >
              <summary className="flex items-center justify-between cursor-pointer font-bold text-gray-900 text-sm">
                <InlineText
                  as="span"
                  lang={locale}
                  value={pick(item.q, locale)}
                  editValue={raw(item.q, locale)}
                  onCommit={(v) =>
                    writeItems(items.map((f, idx) => (idx === i ? { ...f, q: { ...f.q, [lang]: v } } : f)))
                  }
                  dir={dir}
                  placeholder="Question"
                />
                <span
                  className={`w-6 h-6 shrink-0 rounded-full bg-rmc-green-light text-rmc-green-dark flex items-center justify-center text-base leading-none group-open:rotate-45 transition-transform duration-200 ms-4 ${
                    editing ? 'me-20' : ''
                  }`}
                >
                  +
                </span>
              </summary>
              <InlineText
                as="p"
                lang={locale}
                value={pick(item.a, locale)}
                editValue={raw(item.a, locale)}
                onCommit={(v) =>
                  writeItems(items.map((f, idx) => (idx === i ? { ...f, a: { ...f.a, [lang]: v } } : f)))
                }
                className="text-gray-600 text-sm leading-relaxed mt-3"
                dir={dir}
                placeholder="Answer"
              />
              {editing && (
                <CardEditToolbar
                  canMoveUp={i > 0}
                  canMoveDown={i < items.length - 1}
                  onMoveUp={() => moveFaq(i, -1)}
                  onMoveDown={() => moveFaq(i, 1)}
                  onDelete={() => removeFaq(i)}
                />
              )}
            </details>
          ))}
        </div>

        {editing && (
          <button
            type="button"
            onClick={addFaq}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-500 transition-colors hover:border-rmc-green hover:text-rmc-green"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
        )}
      </div>
    </section>
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
