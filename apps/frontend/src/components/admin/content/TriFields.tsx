'use client';

/**
 * Shared plumbing for the tri-lingual content editors.
 *
 * Every Admin → Content form does the same three things: pick a language, render
 * some `Tri` fields addressed by their position in a section blob, and write the
 * edit back immutably. This holds that once so the editors above it only declare
 * WHICH fields they show.
 *
 * Fields are addressed by PATH rather than by a fixed field list, which is what
 * lets one editor serve sections whose shapes differ (a flat page header, a nested
 * board blob, a list whose length comes from the content itself).
 */

import React from 'react';

export type Lang = 'en' | 'rw' | 'ar';

export const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: 'en', label: 'English', flag: 'EN' },
  { key: 'rw', label: 'Kinyarwanda', flag: 'RW' },
  { key: 'ar', label: 'Arabic', flag: 'AR' },
];

/** A `Tri` somewhere in a section blob, addressed by the path that reaches it. */
export interface TriFieldDef {
  path: (string | number)[];
  label: string;
  /** 1 → single-line input; more → textarea of that many rows. */
  rows: number;
  hint?: string;
  /**
   * The path points at a PLAIN string rather than a `Tri` — an icon name, an Arabic
   * dua, a transliteration. Those are the same in every language, so the active
   * language tab does not apply and the field is shown once, not three times.
   */
  plain?: boolean;
  /** Render right-to-left regardless of the active language (Arabic scripture). */
  forceRtl?: boolean;
}

export interface TriFieldGroup {
  title: string;
  icon?: React.ElementType;
  /** Optional line under the group heading, for what the section actually is. */
  note?: string;
  fields: TriFieldDef[];
}

/** Immutable set of `obj` at `path`, cloning only the nodes along the way. */
export function setAtPath<T>(obj: T, path: (string | number)[], value: string): T {
  const [head, ...rest] = path;
  const clone: unknown = Array.isArray(obj) ? [...(obj as unknown[])] : { ...(obj as object) };
  const target = clone as Record<string | number, unknown>;
  target[head] = rest.length ? setAtPath(target[head] as unknown, rest, value) : value;
  return clone as T;
}

/** Read the string at `path`, or '' when the blob does not carry it. */
export function readAtPath(obj: unknown, path: (string | number)[]): string {
  const v = path.reduce<unknown>((a, k) => (a as Record<string | number, unknown>)?.[k], obj);
  return typeof v === 'string' ? v : '';
}

export function LanguageTabs({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
      {LANGS.map((l) => (
        <button
          key={l.key}
          onClick={() => onChange(l.key)}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-150 ${
            lang === l.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>{l.flag}</span> {l.label}
        </button>
      ))}
    </div>
  );
}

/** One card of `Tri` inputs for the active language. */
export function TriFieldCard({
  group,
  value,
  lang,
  onChange,
}: {
  group: TriFieldGroup;
  /** The section blob the paths are relative to. */
  value: unknown;
  lang: Lang;
  /**
   * Receives the COMPLETE path to write — the active language already appended for a
   * `Tri` field, and left off for a `plain` one. Callers set it verbatim rather than
   * re-deriving where the language goes.
   */
  onChange: (path: (string | number)[], next: string) => void;
}) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-arabic' : '';
  const inputClass = `w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent ${fontClass}`;
  const Icon = group.icon;

  return (
    <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6">
      <div className="border-b border-gray-50 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700">
          {Icon && <Icon className="h-4 w-4 text-rmc-green" />}
          {group.title}
          <span className="font-normal text-gray-400">
            — {LANGS.find((l) => l.key === lang)?.label}
          </span>
        </h2>
        {group.note && <p className="mt-1 text-[11px] text-gray-400">{group.note}</p>}
      </div>

      {group.fields.map(({ path, label, rows, hint, plain, forceRtl }) => {
        // A plain field holds one value for all languages, so it is read and written
        // at its own path rather than under the active language.
        const full = plain ? path : [...path, lang];
        const current = readAtPath(value, full);
        const fieldDir = forceRtl ? 'rtl' : plain ? 'ltr' : dir;
        const fieldFont = forceRtl ? 'font-arabic' : plain ? '' : fontClass;
        const cls = `w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent ${fieldFont}`;
        return (
          <div key={full.join('.')}>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {label}
              {plain && (
                <span className="ml-2 font-normal text-gray-400">— all languages</span>
              )}
            </label>
            {rows === 1 ? (
              <input
                dir={fieldDir}
                type="text"
                value={current}
                onChange={(e) => onChange(full, e.target.value)}
                className={cls}
              />
            ) : (
              <textarea
                dir={fieldDir}
                rows={rows}
                value={current}
                onChange={(e) => onChange(full, e.target.value)}
                className={`${cls} resize-none`}
              />
            )}
            {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** The note every editor carries under its form. */
export function FallbackNote() {
  return (
    <p className="text-[11px] text-gray-400">
      Empty translations fall back to English on the public page. The same copy is
      editable in place on the live page in Edit Mode.
    </p>
  );
}
