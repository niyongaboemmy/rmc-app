'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronRight, Mail, Phone, User, X } from 'lucide-react';
import { PreviewOverlayShell } from '@/components/ui/PreviewOverlayShell';
import { isRtl, pick } from '@/lib/content-api';

/** One leader, already resolved to the reader's language by the server page. */
export interface LeaderView {
  id: string;
  img: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  /** Long-form profile shown only in the modal. Optional — often not filled in yet. */
  bio: string;
}

const TITLE_ID = 'leader-modal-title';

/* ── Portrait — the section's signature gradient ring, at two sizes ────────── */

function Portrait({ img, name, size }: { img: string; name: string; size: 'card' | 'modal' }) {
  const box = size === 'card' ? 'h-20 w-20' : 'h-28 w-28';
  const icon = size === 'card' ? 'h-9 w-9' : 'h-12 w-12';

  return (
    <div className="relative shrink-0 rounded-full bg-gradient-to-br from-rmc-green via-rmc-gold to-rmc-green p-[2px] shadow-sm shadow-rmc-green/20">
      <div className={`relative ${box} overflow-hidden rounded-full ring-2 ring-white`}>
        {img ? (
          <Image
            src={img}
            alt={name}
            fill
            quality={95}
            sizes={size === 'card' ? '80px' : '112px'}
            className={`object-cover object-top ${
              size === 'card'
                ? 'transition-transform duration-500 motion-reduce:transform-none group-hover:scale-105'
                : ''
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-rmc-green-deep">
            <User className={`${icon} text-white/80`} strokeWidth={1.5} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Detail modal ─────────────────────────────────────────────────────────── */

function LeaderModal({
  leader,
  locale,
  onClose,
}: {
  leader: LeaderView;
  locale: string;
  onClose: () => void;
}) {
  const rtl = isRtl(locale);
  const hasContact = Boolean(leader.email || leader.phone);

  return (
    <PreviewOverlayShell
      onClose={onClose}
      labelledBy={TITLE_ID}
      zIndexClassName="z-[9999]"
      className="flex items-end justify-center p-4 sm:items-center"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
      />

      <div
        dir={rtl ? 'rtl' : 'ltr'}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-2xl animate-modal-in"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={pick({ en: 'Close', rw: 'Funga', ar: 'إغلاق' }, locale)}
          className="absolute end-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-500 shadow-sm ring-1 ring-black/5 backdrop-blur-sm transition-colors hover:bg-white hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>

        {/* A long profile has to scroll, so the header scrolls with it rather
            than pinning and eating half the height on a phone. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative flex flex-col items-center px-6 pb-5 pt-8 text-center">
            <div aria-hidden className="absolute inset-0 pattern-islamic opacity-20" />

            <div className="relative">
              <Portrait img={leader.img} name={leader.name} size="modal" />
            </div>

            <h3 id={TITLE_ID} className="relative mt-4 text-lg font-medium text-gray-900">
              {leader.name}
            </h3>

            {leader.role && (
              <span className="relative mt-2 inline-flex items-center rounded-lg bg-rmc-green-light px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rmc-green-dark">
                {leader.role}
              </span>
            )}
          </div>

          <div className="px-6 pb-6">
            {leader.bio ? (
              // `whitespace-pre-line` so the paragraph breaks an admin typed in
              // the editor survive — the field is plain text, not rich HTML.
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
                {leader.bio}
              </p>
            ) : (
              <p className="text-center text-sm italic text-gray-400">
                {pick(
                  {
                    en: 'No profile details yet.',
                    rw: 'Nta makuru arambuye arahari.',
                    ar: 'لا توجد تفاصيل بعد.',
                  },
                  locale,
                )}
              </p>
            )}
          </div>
        </div>

        {hasContact && (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-gray-100 bg-gray-50/70 px-6 py-3.5 text-xs text-gray-500">
            {leader.email && (
              <a
                href={`mailto:${leader.email}`}
                className="inline-flex min-w-0 items-center gap-1.5 transition-colors hover:text-rmc-green"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-rmc-green/70" />
                <span className="truncate">{leader.email}</span>
              </a>
            )}
            {leader.phone && (
              <a
                href={`tel:${leader.phone}`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-rmc-green"
                dir="ltr"
              >
                <Phone className="h-3.5 w-3.5 shrink-0 text-rmc-green/70" />
                {leader.phone}
              </a>
            )}
          </div>
        )}
      </div>
    </PreviewOverlayShell>
  );
}

/* ── The grid ─────────────────────────────────────────────────────────────── */

export function LeadershipGrid({ leaders, locale }: { leaders: LeaderView[]; locale: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = leaders.find((l) => l.id === openId) ?? null;
  const aboutLabel = pick({ en: 'About', rw: 'Ibyerekeye', ar: 'حول' }, locale);

  return (
    <>
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
        {leaders.map((leader) => (
          <div
            key={leader.id}
            className="group relative flex items-center gap-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-rmc-green/30 hover:shadow-md"
          >
            <Portrait img={leader.img} name={leader.name} size="card" />

            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center rounded-lg bg-rmc-green-light px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rmc-green-dark">
                {leader.role}
              </span>

              {/* The name is the trigger, and `after:inset-0` stretches its hit
                  area over the whole card. Wrapping the card in a <button>
                  instead would put the mailto/tel links INSIDE a button, which
                  is invalid and unreachable by keyboard. The links sit at z-10
                  so they stay clickable above that stretched layer. */}
              <h3 className="mt-2 truncate font-medium text-gray-900">
                <button
                  type="button"
                  onClick={() => setOpenId(leader.id)}
                  aria-label={`${aboutLabel} ${leader.name}`}
                  className="rounded text-start after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmc-gold focus-visible:ring-offset-2 group-hover:text-rmc-green"
                >
                  {leader.name}
                </button>
              </h3>

              {(leader.email || leader.phone) && (
                <div className="relative z-10 mt-2 flex w-fit flex-col gap-1 text-xs text-gray-500">
                  {leader.email && (
                    <a
                      href={`mailto:${leader.email}`}
                      className="inline-flex items-center gap-1.5 truncate transition-colors hover:text-rmc-green"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0 text-rmc-green/70" />
                      <span className="truncate">{leader.email}</span>
                    </a>
                  )}
                  {leader.phone && (
                    <a
                      href={`tel:${leader.phone}`}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-rmc-green"
                      dir="ltr"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0 text-rmc-green/70" />
                      {leader.phone}
                    </a>
                  )}
                </div>
              )}
            </div>

            <ChevronRight
              aria-hidden
              className="h-4 w-4 shrink-0 self-center text-gray-300 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-rmc-green group-hover:opacity-100 rtl:rotate-180"
            />
          </div>
        ))}
      </div>

      {open && <LeaderModal leader={open} locale={locale} onClose={() => setOpenId(null)} />}
    </>
  );
}
