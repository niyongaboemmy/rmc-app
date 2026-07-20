'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen } from 'lucide-react';
import { fileUrl } from '@/lib/api';
import type { DawahBook } from '@/lib/dawahApi';
import { localized } from './localize';

/**
 * One book in the Library grid, drawn as a physical book rather than a card:
 * 2:3 portrait (real book proportion), a shaded spine down the binding edge, a
 * page-edge highlight on the fore edge, a shadow on the ground beneath it, and a
 * hinged tilt on hover.
 *
 * Everything that suggests "book" is anchored to the LEADING edge (`start-*`), so
 * the whole object mirrors under RTL: in Arabic the spine swaps to the right and
 * the hinge opens the other way, which is the side an Arabic book is bound on. A
 * spine hard-coded to the left would read as a mirror-image book.
 *
 * Still a client component: `coverImageKey` is nullable AND may dangle at a
 * deleted file, and only the browser discovers the second case.
 */
export function BookCard({
  book,
  locale,
  onSelect,
}: {
  book: DawahBook;
  locale: string;
  onSelect: (book: DawahBook) => void;
}) {
  const t = useTranslations('dawah');
  const [coverFailed, setCoverFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // See CourseCard: a dangling key can 404 before hydration, so onError never
  // fires. On mount, ask the DOM whether the image already failed.
  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth === 0) setCoverFailed(true);
  }, []);

  const title = localized(book, 'title', locale);
  const category = book.category ? localized(book.category, 'name', locale) : null;
  const showCover = Boolean(book.coverImageKey) && !coverFailed;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle modified clicks (new tab/window) and non-primary
    // buttons — those readers WANT the permalink. Everyone else gets the overlay.
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    onSelect(book);
  };

  // Keyboard parity: Enter opens the overlay (the primary action) rather than
  // navigating to the permalink.
  const handleKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(book);
    }
  };

  return (
    <a
      href={`/${locale}/dawah/library/${book.slug}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group block text-start outline-none"
    >
      {/* Perspective lives on the parent so the hinge below has depth to rotate into. */}
      <div className="relative [perspective:1200px]">
        {/* Shadow on the ground. A sibling, not a child — it must stay flat while
            the book above it tilts, or the book drags its own shadow around. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 -bottom-1 h-2.5 rounded-[50%] bg-black/25 blur-[6px] transition-all duration-500 group-hover:inset-x-1 group-hover:bg-black/35"
        />

        {/* The book itself. Hinged on the binding edge, so hover swings it open a
            few degrees rather than sliding the whole object. */}
        <div className="relative aspect-[2/3] w-full origin-[left_center] overflow-hidden rounded-s-[3px] rounded-e-lg bg-rmc-green-deep shadow-[0_10px_26px_-10px_rgba(13,61,36,0.5)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] rtl:origin-[right_center] group-hover:[transform:rotateY(-13deg)] group-focus-visible:[transform:rotateY(-13deg)] rtl:group-hover:[transform:rotateY(13deg)] rtl:group-focus-visible:[transform:rotateY(13deg)]">
          {showCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={fileUrl(book.coverImageKey as string)}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              onError={() => setCoverFailed(true)}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            /* No cover art. Rather than a blank tile, typeset the title as a plain
               publisher's cover — otherwise every coverless book is the same green
               rectangle and the shelf is unreadable. In this library most books
               have no cover, so this is the common case, not the edge case. */
            <div
              aria-hidden
              className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-rmc-green to-rmc-green-deep px-3 text-center"
            >
              <div className="absolute inset-0 pattern-islamic opacity-[0.10]" />
              <span className="relative block h-px w-7 bg-rmc-gold/70" />
              <p className="relative mt-2.5 font-serif text-[12px] font-bold leading-snug text-white line-clamp-4">
                {title}
              </p>
              {book.author && (
                <p className="relative mt-1.5 line-clamp-1 text-[9px] uppercase tracking-[0.1em] text-white/50">
                  {book.author}
                </p>
              )}
              <span className="relative mt-2.5 block h-px w-7 bg-rmc-gold/70" />
              <BookOpen className="relative mt-3 h-3.5 w-3.5 text-white/35" />
            </div>
          )}

          {/* Spine: dark at the binding, a lit ridge, then falling away across the
              board. `start-0` plus the RTL gradient flip keep it on the bound edge. */}
          <span
            aria-hidden
            className="absolute inset-y-0 start-0 w-[9px] bg-gradient-to-r from-black/60 via-white/10 to-black/5 rtl:bg-gradient-to-l"
          />
          {/* Fore edge — the stacked paper opposite the spine. */}
          <span
            aria-hidden
            className="absolute inset-y-[3px] end-0 w-[2px] bg-gradient-to-b from-white/50 via-white/20 to-white/50 opacity-60"
          />
          {/* A soft sheen across the boards. */}
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
          />

          {/* Read hint. */}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/75 to-transparent px-2 pb-2.5 pt-8 text-xs font-semibold text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            <BookOpen className="me-1.5 h-3.5 w-3.5" aria-hidden />
            {t('library.read')}
          </span>
        </div>
      </div>

      {/* Shelf label. Needed even though the fallback cover carries the title —
          the two real covers are photographs with no title printed on them. */}
      <h3 className="mt-3 line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900 transition-colors group-hover:text-rmc-green group-focus-visible:text-rmc-green">
        {title}
      </h3>
      {book.author && <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500">{book.author}</p>}
      <p className="mt-0.5 line-clamp-1 text-[10px] uppercase tracking-[0.08em] text-gray-400">
        {t(`library.language.${book.language}`)}
        {category && <span className="text-gray-300"> · {category}</span>}
      </p>
    </a>
  );
}
