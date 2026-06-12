import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { CategoryGalleryGrid } from '@/components/gallery/CategoryGalleryGrid';
import {
  CATEGORY_KEYS,
  type CategoryKey,
  buildItems,
  periodLabels,
} from '@/components/gallery/galleryData';

export default async function CategoryGalleryPage({
  params: { locale, category },
}: {
  params: { locale: string; category: string };
}) {
  if (!CATEGORY_KEYS.includes(category as CategoryKey)) notFound();

  const t = await getTranslations('galleryPage');
  const label = t(`categories.${category}`);
  const periods = periodLabels(locale);
  const items = buildItems().filter((it) => it.categoryKey === category);

  // Group photos by month, dropping any empty period.
  const groups = periods
    .map((period) => ({
      key: period.key,
      label: period.label,
      images: items.filter((it) => it.monthKey === period.key).map((it) => it.src),
    }))
    .filter((g) => g.images.length > 0);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Header */}
        <PageHero
          title={label}
          backHref={`/${locale}/gallery`}
          backLabel={t('back')}
          ornament
        />

        {/* Month-grouped photos with click-to-preview lightbox */}
        <CategoryGalleryGrid groups={groups} label={label} />
      </main>
      <Footer />
    </div>
  );
}
