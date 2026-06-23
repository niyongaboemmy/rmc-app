import { getTranslations, getLocale } from 'next-intl/server';
import { ImageIcon } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ImageCarousel3D } from '@/components/about/ImageCarousel3D';
import { PageHero } from '@/components/layout/PageHero';
import { GalleryCategories } from '@/components/gallery/GalleryCategories';
import { publicApi } from '@/lib/public-api';
import {
  CATEGORY_KEYS,
  type GalleryItem,
} from '@/components/gallery/galleryData';

// Always fetch fresh so newly uploaded images appear without a rebuild.
export const dynamic = 'force-dynamic';

const FILE_SERVER = process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://localhost:3002';
const fileUrl = (key: string) => `${FILE_SERVER}/api/v1/files/${key}`;

const KNOWN_CATEGORIES = new Set<string>(CATEGORY_KEYS);

// Title-case an arbitrary category id (e.g. "events" → "Events") for categories
// that have no dedicated translation key.
function humanize(key: string) {
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Pull every public gallery item from the API (walks all pages). */
async function fetchGalleryItems(): Promise<GalleryItem[]> {
  try {
    const first = await publicApi.getGallery(undefined, 1);
    const rows = [...first.data];
    for (let p = 2; p <= Math.min(first.pages, 25); p++) {
      const next = await publicApi.getGallery(undefined, p);
      rows.push(...next.data);
    }
    return rows.map((r) => ({
      id: r.id,
      src: fileUrl(r.mediumKey ?? r.fileKey),
      categoryKey: r.category ?? 'other',
      monthKey: (r.createdAt ?? '').slice(0, 7), // YYYY-MM
    }));
  } catch {
    return [];
  }
}

export default async function GalleryPage() {
  const t = await getTranslations('galleryPage');
  const locale = await getLocale();

  const items = await fetchGalleryItems();
  const isEmpty = items.length === 0;

  // Categories: derive from the data so admin-defined categories all surface,
  // ordered by the curated keys first, then any extras. Translate known keys.
  const presentCategories = Array.from(new Set(items.map((it) => it.categoryKey)));
  const orderedKeys = [
    ...CATEGORY_KEYS.filter((k) => presentCategories.includes(k)),
    ...presentCategories.filter((k) => !KNOWN_CATEGORIES.has(k)).sort(),
  ];
  const categories = orderedKeys.map((key) => ({
    key,
    // Localise any category that has a translation (covers both the curated
    // keys and the admin-defined ones like "events"/"ceremonies"/"other");
    // fall back to a humanised label for anything still untranslated.
    label: t.has(`categories.${key}`) ? t(`categories.${key}`) : humanize(key),
  }));

  // Periods: the distinct months present (most recent first), localised.
  const fmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const periods = Array.from(new Set(items.map((it) => it.monthKey)))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const [y, m] = key.split('-').map(Number);
      return { key, label: fmt.format(new Date(y, (m || 1) - 1, 1)) };
    });

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
        <PageHero
          eyebrow="RMC"
          title={t('title')}
          subtitle={t('subtitle')}
          ornament
          minHeightClassName="min-h-[25vh]"
          paddingClassName="pt-36 pb-8"
        />

        {isEmpty ? (
          /* Empty state — gallery is now purely API-driven */
          <section className="py-24">
            <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-rmc-green/30" />
              <h2 className="text-xl font-bold text-gray-900">{t('empty.title')}</h2>
              <p className="mt-2 text-sm text-gray-500">{t('empty.subtitle')}</p>
            </div>
          </section>
        ) : (
          <>
            {/* ALL — 3D carousel of every photo */}
            <section className="py-8 md:py-10 bg-transparent">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative rounded-3xl overflow-hidden w-full max-w-4xl mx-auto min-h-[340px] md:min-h-[440px]">
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
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
