'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BookCard } from './BookCard';
import { BookPreviewOverlay } from './BookPreviewOverlay';
import type { DawahBook } from '@/lib/dawahApi';

/**
 * The interactive islands of the /library/[slug] permalink. The page itself is
 * a Server Component (SEO + generateMetadata); these hydrate on top of it so the
 * detail's text is in the initial HTML while the reader still gets the same
 * preview overlay the listing uses — one viewer, three entry points.
 */

/** The primary CTA on the detail page: open the reader for THIS book. */
export function BookReadButton({ book, locale }: { book: DawahBook; locale: string }) {
  const t = useTranslations('dawah');
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rmc-green px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rmc-green-dark sm:w-auto"
      >
        <BookOpen className="h-4 w-4" aria-hidden />
        {t('library.read')}
      </button>
      {open && <BookPreviewOverlay book={book} locale={locale} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Related books — same overlay, reached from the detail page. */
export function RelatedBooks({ books, locale }: { books: DawahBook[]; locale: string }) {
  const [selected, setSelected] = useState<DawahBook | null>(null);
  if (books.length === 0) return null;
  return (
    <>
      <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((book) => (
          <BookCard key={book.id} book={book} locale={locale} onSelect={setSelected} />
        ))}
      </div>
      {selected && (
        <BookPreviewOverlay book={selected} locale={locale} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
