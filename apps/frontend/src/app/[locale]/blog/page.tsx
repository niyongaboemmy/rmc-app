import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { SquareArrowOutUpRight, CalendarDays } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { getPosts } from '@/components/blog/blogData';
import { BlogCategoryTabs } from '@/components/blog/BlogCategoryTabs';

// Posts are managed in the CMS (Admin → Content → Blog & Posts), so render live.
export const dynamic = 'force-dynamic';

export default async function BlogPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations('blog');
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  const posts = await getPosts(locale);
  const featured = posts[0];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Hero — animated community photo background */}
        <PageHero
          eyebrow={t('title')}
          title={t('subtitle')}
          titleClassName="text-2xl md:text-3xl"
          minHeightClassName="min-h-[26vh]"
          paddingClassName="pt-36 pb-20"
          ornament
        />

        {/* ===================================================================
            1. FEATURED — most recently added blog, image background + overlay
        =================================================================== */}
        {featured && (
        <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          <div className="max-w-7xl mx-auto">
            <Link
              href={`/${locale}/blog/${featured.slug}`}
              className="group relative block overflow-hidden rounded-3xl max-w-4xl mx-auto min-h-[58vh] md:min-h-[62vh] shadow-[0_30px_70px_-30px_rgba(13,61,36,0.5)] ring-1 ring-black/5"
            >
              {/* Background image */}
              <Image
                src={featured.image}
                alt={featured.title}
                fill
                priority
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover object-center transition-transform duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />
              {/* Card content — all text lives here, with its own opaque backdrop */}
              <div className="absolute inset-x-0 bottom-0 z-10 flex h-[56%] flex-col justify-end overflow-hidden border-t border-white/25 bg-gradient-to-t from-black/95 via-black/85 to-black/50 p-6 sm:p-8 md:p-10">
                {/* Read-more arrow — top-right corner */}
                <span
                  aria-label={t('readMore')}
                  className="absolute top-4 right-4 grid place-items-center w-8 h-8 text-white"
                >
                  <SquareArrowOutUpRight className="w-5 h-5" />
                </span>

                <h2 className="max-w-3xl text-lg sm:text-xl md:text-2xl font-bold leading-tight text-white drop-shadow-lg">
                  {featured.title}
                </h2>

                <p className="mt-2.5 max-w-2xl text-[11px] md:text-xs leading-relaxed text-gray-300 line-clamp-2">
                  {featured.excerpt ?? featured.summary}
                </p>

                {/* Bottom row — author + date (left), category tags (right) */}
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-rmc-green to-rmc-gold text-white text-xs font-bold ring-2 ring-white/30">
                      {featured.author?.charAt(0) ?? 'R'}
                    </span>
                    <div className="leading-tight">
                      <p className="text-xs font-semibold text-white">{featured.author}</p>
                      <time dateTime={featured.date} className="inline-flex items-center gap-1.5 text-[11px] text-white/60">
                        <CalendarDays className="h-3 w-3 text-rmc-gold" />
                        {dateFmt.format(new Date(featured.date))}
                      </time>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rmc-gold/20 border border-rmc-gold/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rmc-gold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold" />
                      {t('latest')}
                    </span>
                    <span className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
                      {featured.category}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
        )}

        {/* ===================================================================
            2. BY CATEGORY — posts under category tabs
        =================================================================== */}
        <BlogCategoryTabs
          posts={posts}
          locale={locale}
          allLabel={t('all')}
          readMoreLabel={t('readMore')}
          searchPlaceholder={t('search')}
          noResultsLabel={t('noResults')}
        />
      </main>
      <Footer />
    </div>
  );
}
