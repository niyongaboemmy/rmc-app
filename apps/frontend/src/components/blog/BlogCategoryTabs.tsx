'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarDays, Search } from 'lucide-react';
import type { BlogPost } from './blogData';

interface Props {
  posts: BlogPost[];
  locale: string;
  allLabel: string;
  readMoreLabel: string;
  searchPlaceholder: string;
  noResultsLabel: string;
}

export function BlogCategoryTabs({
  posts,
  locale,
  allLabel,
  readMoreLabel,
  searchPlaceholder,
  noResultsLabel,
}: Props) {
  const categories = Array.from(new Set(posts.map((p) => p.category)));
  const tabs = ['all', ...categories];
  const [active, setActive] = useState('all');
  const [query, setQuery] = useState('');

  // Sliding underline indicator
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const activeIndex = tabs.indexOf(active);
  useEffect(() => {
    const measure = () => {
      const el = tabRefs.current[activeIndex];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeIndex]);

  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const q = query.trim().toLowerCase();
  const filtered = posts.filter((p) => {
    const matchesCategory = active === 'all' || p.category === active;
    const matchesQuery =
      !q ||
      [p.title, p.summary, p.excerpt, p.category].some((field) =>
        field?.toLowerCase().includes(q),
      );
    return matchesCategory && matchesQuery;
  });

  return (
    <section className="py-6 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search bar (left) + category tabs with a sliding underline (right) */}
        <div className="mb-6 flex flex-col gap-5 md:flex-row-reverse md:items-center md:justify-start">
          {/* Search bar */}
          <div className="relative w-full shrink-0 md:max-w-xs">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-colors focus:border-rmc-green/50 focus:outline-none focus:ring-2 focus:ring-rmc-green/15"
            />
          </div>

          {/* Category tabs */}
          <div className="relative flex gap-6 overflow-x-auto">
            {tabs.map((tab, i) => {
              const isActive = active === tab;
              return (
                <button
                  key={tab}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => setActive(tab)}
                  aria-pressed={isActive}
                  className={`relative whitespace-nowrap px-1 pb-3 pt-1 text-sm font-semibold transition-colors duration-200 ${
                    isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab === 'all' ? allLabel : tab}
                </button>
              );
            })}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 h-[2px] rounded-full bg-rmc-green transition-all duration-300 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 py-20 text-center">
            <Search aria-hidden className="h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">{noResultsLabel}</p>
          </div>
        )}

        {/* Posts grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <Link
              key={p.slug}
              href={`/${locale}/blog/${p.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(13,61,36,0.3)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 rounded-full bg-black/50 backdrop-blur-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                  {p.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <time dateTime={p.date} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <CalendarDays className="h-3.5 w-3.5 text-rmc-green" />
                  {dateFmt.format(new Date(p.date))}
                </time>
                <h3 className="mt-2 font-bold text-gray-900 leading-snug transition-colors group-hover:text-rmc-green line-clamp-2">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-2">{p.summary}</p>
                <span
                  aria-label={readMoreLabel}
                  className="mt-4 grid h-9 w-9 place-items-center rounded-full bg-rmc-green/10 text-rmc-green transition-colors duration-300 group-hover:bg-rmc-green group-hover:text-white"
                >
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
