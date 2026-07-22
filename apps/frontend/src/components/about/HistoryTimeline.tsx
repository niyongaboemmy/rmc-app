'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, ArrowRight, Plus, Trash2, Loader2 } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { InlineText } from '@/components/edit-mode/InlineText';
import { InlineImage } from '@/components/edit-mode/InlineImage';
import { Permission } from '@/lib/permissions';
import {
  ContentKeys, HISTORY_HEADER_DEFAULT, pick, type HistoryHeaderContent, type Locale,
} from '@/lib/content-api';
import { historyApi, type HistoryEntry, type HistoryEntryInput } from '@/lib/historyApi';

const FILE_SERVER = process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://localhost:3002';
const fileUrl = (key: string) => `${FILE_SERVER}/api/v1/files/${key}`;

/** "Read more" label — the only bit of section chrome still local (the heading &
 *  subtitle now live in the editable `about-history` content section). */
const READ_MORE: Record<string, string> = { en: 'Read more', rw: 'Soma byinshi', ar: 'اقرأ المزيد' };

const sfxOf = (l: string): 'En' | 'Rw' | 'Ar' => (l === 'rw' ? 'Rw' : l === 'ar' ? 'Ar' : 'En');

function pickLocale(entry: HistoryEntry, locale: string) {
  if (locale === 'rw') return { title: entry.titleRw || entry.titleEn, description: entry.descriptionRw || entry.descriptionEn };
  if (locale === 'ar') return { title: entry.titleAr || entry.titleEn, description: entry.descriptionAr || entry.descriptionEn };
  return { title: entry.titleEn, description: entry.descriptionEn };
}

function YearBadge({ year }: { year: number }) {
  return (
    <span className="inline-flex items-center justify-center rounded-lg bg-rmc-green-deep px-2.5 py-1.5 text-[13px] font-bold tabular-nums tracking-wide text-white">
      {year}
    </span>
  );
}

// ── Read-only milestone row (public + non-edit view) ──────────────────────────
function TimelineEntry({
  entry, locale, index, onOpen,
}: {
  entry: HistoryEntry;
  locale: string;
  index: number;
  onOpen: (entry: HistoryEntry) => void;
}) {
  const { ref, visible } = useScrollReveal(0.12);
  const { title, description } = pickLocale(entry, locale);
  const rtl = locale === 'ar';
  const readMore = READ_MORE[locale] ?? READ_MORE.en;
  const hasMore = !!entry.imageKey || description.length > 180;

  return (
    <div
      ref={ref}
      className={`group/entry flex gap-4 transition-all duration-700 ease-out sm:gap-5 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="shrink-0 pt-4 sm:pt-5">
        <YearBadge year={entry.year} />
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white/70 p-4 shadow-sm transition-all duration-300 hover:border-rmc-green/30 hover:bg-white hover:shadow-md sm:p-5">
        <h3
          className={`text-base font-bold leading-snug text-rmc-green-deep transition-colors group-hover/entry:text-rmc-green md:text-lg ${rtl ? 'font-arabic' : ''}`}
          dir={rtl ? 'rtl' : 'ltr'}
        >
          {title}
        </h3>
        <p className={`mt-1.5 text-sm leading-relaxed text-gray-500 line-clamp-3 ${rtl ? 'font-arabic' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>
          {description}
        </p>
        {hasMore && (
          <button
            type="button"
            onClick={() => onOpen(entry)}
            className="group/more mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-rmc-green transition-colors hover:text-rmc-green-dark"
          >
            {readMore}
            <ArrowRight className={`h-3.5 w-3.5 transition-transform duration-300 group-hover/more:translate-x-0.5 ${rtl ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Editable milestone row (edit mode) ────────────────────────────────────────
function EditableEntry({
  entry, locale, sfx, onSaveField, onSaveImage, onRemove, busy,
}: {
  entry: HistoryEntry;
  locale: string;
  sfx: 'En' | 'Rw' | 'Ar';
  onSaveField: (id: string, field: keyof HistoryEntryInput, value: string | number) => void;
  onSaveImage: (id: string, key: string) => void;
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  const rtl = locale === 'ar';
  const title = (entry[`title${sfx}` as keyof HistoryEntry] as string) || '';
  const desc = (entry[`description${sfx}` as keyof HistoryEntry] as string) || '';

  return (
    <div className="group flex gap-4 sm:gap-5">
      <div className="shrink-0 pt-4 sm:pt-5">
        <InlineText
          as="span"
          lang={locale}
          value={String(entry.year)}
          onCommit={(v) => { const n = Number((v || '').replace(/\D/g, '')); if (n) onSaveField(entry.id, 'year', n); }}
          className="inline-flex items-center justify-center rounded-lg bg-rmc-green-deep px-2.5 py-1.5 text-[13px] font-bold tabular-nums tracking-wide text-white"
        />
      </div>
      <div className="relative min-w-0 flex-1 rounded-xl border border-dashed border-rmc-green/40 bg-white p-4 shadow-sm sm:p-5">
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          disabled={busy}
          title="Remove milestone"
          className="absolute end-3 top-3 z-10 grid h-6 w-6 place-items-center rounded text-gray-300 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <div className="mb-3 h-32 w-full max-w-xs">
          <InlineImage
            value={entry.imageKey ?? ''}
            onChange={(key) => onSaveImage(entry.id, key)}
            onRemove={() => onSaveImage(entry.id, '')}
            folder="history"
            alt={title}
            className="h-32 w-full rounded-lg"
            imgClassName="object-cover"
          />
        </div>
        <InlineText
          as="h3"
          lang={locale}
          value={title}
          onCommit={(v) => onSaveField(entry.id, `title${sfx}` as keyof HistoryEntryInput, v)}
          placeholder="Milestone title"
          dir={rtl ? 'rtl' : 'ltr'}
          className="block text-base font-bold leading-snug text-rmc-green-deep md:text-lg"
        />
        <InlineText
          as="p"
          lang={locale}
          value={desc}
          onCommit={(v) => onSaveField(entry.id, `description${sfx}` as keyof HistoryEntryInput, v)}
          placeholder="What happened this year…"
          dir={rtl ? 'rtl' : 'ltr'}
          className="mt-1.5 block text-sm leading-relaxed text-gray-500"
        />
      </div>
    </div>
  );
}

function EntryModal({ entry, locale, onClose }: { entry: HistoryEntry; locale: string; onClose: () => void }) {
  const { title, description } = pickLocale(entry, locale);
  const rtl = locale === 'ar';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = prev; };
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-overlay-in" onClick={onClose}>
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md backdrop-blur transition-colors hover:bg-white hover:text-rmc-green-dark" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        {entry.imageKey && (
          <div className="relative h-60 w-full shrink-0 overflow-hidden sm:h-72">
            <Image src={fileUrl(entry.imageKey)} alt={title} fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-7 md:p-8">
          <YearBadge year={entry.year} />
          <h3 className={`mt-2 text-2xl font-bold text-gray-900 ${rtl ? 'font-arabic' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>{title}</h3>
          <p className={`mt-4 whitespace-pre-line text-[15px] leading-relaxed text-gray-600 ${rtl ? 'font-arabic' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>{description}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * "RMC Through the Years" — the About-page history timeline.
 *
 * Edit-aware: rendered on the public page (read-only) AND inside the About edit
 * board, so it manages its own editing. The section HEADING & subtitle come from
 * the editable `about-history` content section (batch-published with the rest of
 * the About copy); the ENTRIES are their own records edited inline and saved
 * immediately via `historyApi` (text debounced 700ms; add/remove/image immediate,
 * then refetch). All of it gates on `content:edit`; outside edit mode it is
 * byte-for-byte the old read-only timeline.
 */
export function HistoryTimeline({ locale }: { locale: string }) {
  const { editMode, hasPermission } = useEditMode();
  const editing = editMode && hasPermission(Permission.CONTENT_EDIT);
  const lang = locale as Locale;
  const sfx = sfxOf(locale);
  const rtl = locale === 'ar';

  const { content, setField } = useEditableContent<HistoryHeaderContent>(ContentKeys.historyHeader, HISTORY_HEADER_DEFAULT);

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    historyApi.list().then(setEntries).catch(() => setEntries([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Per-entry+field debounce so a burst of keystrokes is one PUT.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveField = useCallback((id: string, field: keyof HistoryEntryInput, value: string | number) => {
    const k = `${id}:${field}`;
    if (timers.current[k]) clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(() => {
      historyApi.update(id, { [field]: value } as HistoryEntryInput).catch(() => {});
    }, 700);
  }, []);
  const saveImage = useCallback((id: string, imageKey: string) => {
    historyApi.update(id, { imageKey: imageKey || null }).then(load).catch(() => {});
  }, [load]);
  const addEntry = useCallback(async () => {
    setBusy(true);
    try {
      const maxYear = entries.reduce((m, e) => Math.max(m, e.year), 0);
      await historyApi.create({
        year: maxYear ? maxYear + 1 : new Date().getFullYear(),
        titleEn: 'New milestone',
        descriptionEn: '',
        sortOrder: entries.length,
      });
      load();
    } catch { /* API enforces content:create — a 403 just leaves the list as-is */ } finally {
      setBusy(false);
    }
  }, [entries, load]);
  const removeEntry = useCallback(async (id: string) => {
    setBusy(true);
    try { await historyApi.remove(id); load(); } catch { /* content:delete enforced server-side */ } finally { setBusy(false); }
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        {[0, 1, 2].map((i) => (<div key={i} className="h-44 animate-pulse rounded-3xl bg-gray-100" />))}
      </div>
    );
  }

  // Public view with no entries renders nothing; in edit mode we always show the
  // section so an admin can edit the header and add the first milestone.
  if (entries.length === 0 && !editing) return null;

  const ordered = [...entries].sort((a, b) => a.year - b.year || a.sortOrder - b.sortOrder);

  return (
    <>
      <section className="relative overflow-hidden py-12 md:py-14">
        <div aria-hidden className="pattern-light pointer-events-none absolute inset-0 opacity-70" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className={`text-3xl font-medium text-rmc-green-deep md:text-4xl ${rtl ? 'font-arabic' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>
              {editing ? (
                <>
                  <InlineText as="span" lang={locale} value={pick(content.title, locale)} onCommit={(v) => setField((d) => { d.title[lang] = v; })} placeholder="Heading" />{' '}
                  <InlineText as="span" lang={locale} value={pick(content.accent, locale)} onCommit={(v) => setField((d) => { d.accent[lang] = v; })} placeholder="Accent" />
                </>
              ) : (
                <>{pick(content.title, locale)} {pick(content.accent, locale)}</>
              )}
            </h2>
            <div className="ornament-divider mx-auto my-4 max-w-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rmc-gold" />
            </div>
            {editing ? (
              <InlineText
                as="p"
                lang={locale}
                value={pick(content.subtitle, locale)}
                onCommit={(v) => setField((d) => { d.subtitle[lang] = v; })}
                placeholder="Section subtitle"
                dir={rtl ? 'rtl' : 'ltr'}
                className={`mx-auto block max-w-xl text-sm text-gray-500 md:text-base ${rtl ? 'font-arabic' : ''}`}
              />
            ) : (
              <p className={`mx-auto max-w-xl text-sm text-gray-500 md:text-base ${rtl ? 'font-arabic' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>
                {pick(content.subtitle, locale)}
              </p>
            )}
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {ordered.map((entry, i) =>
              editing ? (
                <EditableEntry
                  key={entry.id}
                  entry={entry}
                  locale={locale}
                  sfx={sfx}
                  onSaveField={saveField}
                  onSaveImage={saveImage}
                  onRemove={removeEntry}
                  busy={busy}
                />
              ) : (
                <TimelineEntry key={entry.id} entry={entry} locale={locale} index={i} onOpen={setSelected} />
              ),
            )}

            {editing && (
              <button
                type="button"
                onClick={addEntry}
                disabled={busy}
                className="flex min-h-[5rem] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-rmc-green/30 text-rmc-green/70 transition hover:border-rmc-green/60 hover:text-rmc-green disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                <span className="text-sm font-semibold">Add milestone</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {selected && <EntryModal entry={selected} locale={locale} onClose={() => setSelected(null)} />}
    </>
  );
}
