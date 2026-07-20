'use client';

/**
 * In-context Edit Mode for the About page.
 *
 * About is a Server Component, so — unlike the home sections — its editable text
 * can't each call `useEditableContent` (that would fetch the `about` blob once
 * per field). Instead the server page wraps its content in `<AboutEditProvider>`,
 * which fetches/holds the blob ONCE and shares it, and every editable string is
 * an `<AboutText>` island reading from that context.
 *
 * The provider is seeded with the server-rendered blob (`initial`) so the first
 * client render matches the server exactly (no hydration mismatch, no flash).
 * Edits flow into the shared preview store under the `about` key, so the section
 * updates live and the existing floating bar publishes it — same as home.
 */

import React, { createContext, useContext } from 'react';
import { useParams } from 'next/navigation';
import { ContentKeys, pickLang } from '@/lib/content-api';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { InlineText } from '@/components/edit-mode/InlineText';

/** The About blob is a flat record of `${base}${En|Rw|Ar}` string fields. */
type AboutBlob = Record<string, string>;

interface AboutEditValue {
  content: AboutBlob;
  editing: boolean;
  locale: string;
  setBase: (base: string, value: string) => void;
}

const AboutEditCtx = createContext<AboutEditValue | null>(null);

export function AboutEditProvider({
  initial,
  children,
}: {
  /** Server-fetched `about` blob (or null) — seeds the client so SSR matches. */
  initial: AboutBlob | null;
  children: React.ReactNode;
}) {
  const { locale } = useParams<{ locale: string }>();
  const { content, editing, setField } = useEditableContent<AboutBlob>(
    ContentKeys.about,
    initial ?? ({} as AboutBlob),
  );
  const suffix = locale === 'rw' ? 'Rw' : locale === 'ar' ? 'Ar' : 'En';
  const setBase = (base: string, value: string) =>
    setField((draft) => {
      draft[`${base}${suffix}`] = value;
    });

  return (
    <AboutEditCtx.Provider value={{ content, editing, locale, setBase }}>
      {children}
    </AboutEditCtx.Provider>
  );
}

/**
 * One inline-editable About text field. `fallback` is the server-resolved i18n
 * default shown when the blob has no value for this field. Outside the provider
 * it degrades to plain `fallback` text.
 */
export function AboutText({
  base,
  fallback,
  as = 'span',
  className = '',
  dir,
}: {
  base: string;
  fallback: string;
  as?: 'span' | 'p' | 'h2' | 'h3';
  className?: string;
  dir?: 'ltr' | 'rtl';
}) {
  const ctx = useContext(AboutEditCtx);
  const Tag = as as React.ElementType;

  if (!ctx) {
    return <Tag className={className} dir={dir}>{fallback}</Tag>;
  }

  const saved = pickLang(ctx.content, base, ctx.locale);
  const value = saved && saved.trim() ? saved : fallback;

  if (!ctx.editing) {
    return <Tag className={className} dir={dir}>{value}</Tag>;
  }

  return (
    <InlineText
      as={as}
      lang={ctx.locale}
      value={value}
      onCommit={(v) => ctx.setBase(base, v)}
      className={className}
      dir={dir}
      placeholder={base}
    />
  );
}
