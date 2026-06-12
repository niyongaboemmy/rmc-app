import { getTranslations, getLocale } from 'next-intl/server';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ImageCarousel3D } from '@/components/about/ImageCarousel3D';
import { PageHero } from '@/components/layout/PageHero';
import { GalleryCategories } from '@/components/gallery/GalleryCategories';
import { CATEGORY_KEYS, buildItems, periodLabels } from '@/components/gallery/galleryData';

export default async function GalleryPage() {
  const t = await getTranslations('galleryPage');
  const locale = await getLocale();

  const categories = CATEGORY_KEYS.map((key) => ({ key, label: t(`categories.${key}`) }));
  const periods = periodLabels(locale);
  const items = buildItems();

  // "All" carousel — every unique photo, once.
  const seen = new Set<string>();
  const allImages = items
    .filter((it) => (seen.has(it.src) ? false : seen.add(it.src)))
    .map((it) => ({ src: it.src, alt: t('title') }));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Hero header */}
        <PageHero eyebrow="RMC" title={t('title')} subtitle={t('subtitle')} ornament />

        {/* ALL — 3D carousel of every photo */}
        <section className="py-14 md:py-16 px-4 bg-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t('all')}</h2>
              <div className="ornament-divider max-w-xs mx-auto my-4">
                <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden w-full max-w-4xl mx-auto min-h-[420px] md:min-h-[520px]">
              <ImageCarousel3D images={allImages} />
            </div>
          </div>
        </section>

        {/* Category sections — clustered by month */}
        <GalleryCategories
          categories={categories}
          items={items}
          periods={periods}
          locale={locale}
          viewAllLabel={t('viewAll')}
        />
      </main>
      <Footer />
    </div>
  );
}
