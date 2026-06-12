import { CalendarDays } from 'lucide-react';
import { PileCarousel } from './PileCarousel';
import type { GalleryItem } from './galleryData';

export type { GalleryItem };

interface Category {
  key: string;
  label: string;
}

interface Period {
  key: string;
  label: string;
}

interface Props {
  categories: Category[];
  items: GalleryItem[];
  periods: Period[];
  locale: string;
  viewAllLabel?: string;
}

export function GalleryCategories({ categories, items, periods, locale, viewAllLabel }: Props) {
  return (
    <>
      {categories.map((cat, ci) => {
        const catItems = items.filter((it) => it.categoryKey === cat.key);
        if (catItems.length === 0) return null;
        const tinted = ci % 2 === 1;
        return (
          <section
            key={cat.key}
            id={cat.key}
            className={`scroll-mt-24 py-14 md:py-16 px-4 ${tinted ? 'bg-rmc-green/[0.03] border-y border-rmc-green/10' : 'bg-transparent'}`}
          >
            <div className="max-w-7xl mx-auto">
              {/* Category label */}
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{cat.label}</h2>
                <div className="ornament-divider max-w-xs mx-auto my-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                </div>
              </div>

              {/* Monthly highlight clusters — laid out horizontally */}
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-start">
                {periods.map((period) => {
                  const group = catItems.filter((it) => it.monthKey === period.key);
                  if (group.length === 0) return null;
                  return (
                    <div key={period.key}>
                      {/* Month sub-header */}
                      <div className="flex items-center gap-4 mb-5">
                        <span className="inline-flex items-center gap-2 rounded-full border border-rmc-green/15 bg-rmc-green-light/50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-rmc-green-dark">
                          <CalendarDays className="w-3.5 h-3.5 text-rmc-gold" />
                          {period.label}
                        </span>
                        <span className="h-px flex-1 bg-gradient-to-r from-rmc-green/25 via-rmc-gold/25 to-transparent" />
                      </div>

                      {/* Pile carousel — opens the full category page */}
                      <PileCarousel
                        images={group.map((it) => ({
                          src: it.src,
                          alt: `${cat.label} — ${period.label}`,
                        }))}
                        href={`/${locale}/gallery/${cat.key}`}
                        viewAllLabel={viewAllLabel}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
