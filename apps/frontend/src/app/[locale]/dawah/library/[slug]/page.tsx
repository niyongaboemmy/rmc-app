import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { sanitizeRichHtml } from '@/lib/sanitize';
import { BookOpen, FileText, Globe, User } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageHero } from '@/components/layout/PageHero';
import { Reveal } from '@/components/ui/Reveal';
import { BookReadButton, RelatedBooks } from '@/components/dawah/BookDetailIsland';
import { localized } from '@/components/dawah/localize';
import { dawahApi, type DawahBook } from '@/lib/dawahApi';
import { fileUrl } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * React.cache dedupes the fetch across generateMetadata and the body within one
 * request. Returns null rather than throwing so the caller chooses between
 * notFound() and empty metadata. A draft/unpublished slug 404s from the API and
 * therefore 404s here — it must not be discoverable by guessing.
 */
const getBook = cache(async (slug: string): Promise<DawahBook | null> => {
  try {
    return await dawahApi.books.bySlug(slug);
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const book = await getBook(slug);
  if (!book) return {};

  const title = localized(book, 'title', locale);
  const description = localized(book, 'description', locale)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
    .slice(0, 200);
  // Covers live on the PUBLIC file-server prefix, so a crawler can fetch the
  // card image without ever authenticating. The PDF, by contrast, is never
  // linked here — that is the whole point of the protected prefix.
  const image = book.coverImageKey ? fileUrl(book.coverImageKey) : undefined;

  return {
    title,
    description: description || book.author,
    openGraph: {
      title,
      description: description || book.author,
      type: 'book',
      locale,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description: description || book.author,
      images: image ? [image] : undefined,
    },
  };
}

export default async function BookDetailPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  const t = await getTranslations('dawah');
  const book = await getBook(slug);
  if (!book) notFound();

  const title = localized(book, 'title', locale);
  const category = book.category ? localized(book.category, 'name', locale) : null;
  const description = sanitizeRichHtml(localized(book, 'description', locale));
  const hasDescription = Boolean(
    description.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim(),
  );

  const meta = [
    { icon: User, value: book.author },
    { icon: Globe, value: t(`library.language.${book.language}`) },
    ...(book.pageCount
      ? [{ icon: FileText, value: t('library.pageCount', { count: book.pageCount }) }]
      : []),
  ];

  // Related: same category, minus this book. Best-effort — never take down a
  // page that already rendered.
  let related: DawahBook[] = [];
  if (book.category?.slug) {
    try {
      const result = await dawahApi.books.list({ category: book.category.slug, limit: 5 });
      related = result.items.filter((b) => b.id !== book.id).slice(0, 4);
    } catch {
      related = [];
    }
  }

  const showCover = Boolean(book.coverImageKey);

  // ── schema.org/Book structured data ──────────────────────────────────────
  // The library's entire purpose is discoverability; Book markup lets a search
  // engine render it as a book result. JSON.stringify drops undefined keys.
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const cover = book.coverImageKey ? fileUrl(book.coverImageKey) : undefined;
  const plainDescription = description
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
    .slice(0, 500);
  const bookJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: title,
    author: book.author ? { '@type': 'Person', name: book.author } : undefined,
    description: plainDescription || undefined,
    url: siteUrl ? `${siteUrl}/${locale}/dawah/library/${book.slug}` : undefined,
    // 'other' is not a BCP-47 tag — omit it rather than emit an invalid value.
    inLanguage: book.language === 'other' ? undefined : book.language,
    image: cover,
    bookFormat: 'https://schema.org/EBook',
    numberOfPages: book.pageCount || undefined,
    // Every book is freely readable without an account.
    isAccessibleForFree: true,
    publisher: {
      '@type': 'Organization',
      name: 'Rwanda Muslim Community',
      url: siteUrl || undefined,
    },
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd) }}
      />
      <Navbar />
      <main>
        <PageHero
          eyebrow={category ?? t('library.title')}
          title={title}
          subtitle={book.author}
          titleClassName="text-2xl md:text-3xl lg:text-4xl"
          minHeightClassName="min-h-[32vh]"
          paddingClassName="pt-36 pb-16"
          align="left"
          backHref={`/${locale}/dawah/library`}
          backLabel={t('library.backToLibrary')}
        />

        <section className="bg-white py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-[minmax(0,16rem)_1fr] lg:gap-12">
              {/* ── Cover + primary action ─────────────────────────────────── */}
              <Reveal>
                <div className="md:sticky md:top-28">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-rmc-green-deep shadow-lg ring-1 ring-black/5">
                    {showCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fileUrl(book.coverImageKey as string)}
                        alt={title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        aria-hidden
                        className="grid h-full w-full place-items-center bg-gradient-to-br from-rmc-green to-rmc-green-deep"
                      >
                        <div className="absolute inset-0 pattern-islamic opacity-[0.12]" />
                        <BookOpen className="relative h-12 w-12 text-white/70" />
                      </div>
                    )}
                  </div>
                  <div className="mt-5">
                    <BookReadButton book={book} locale={locale} />
                  </div>
                </div>
              </Reveal>

              {/* ── Meta + description ─────────────────────────────────────── */}
              <div>
                <Reveal>
                  <dl className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-5 shadow-sm ring-1 ring-black/5">
                    {meta.map(({ icon: Icon, value }) => (
                      <div key={value} className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                        <Icon className="h-4 w-4 text-rmc-green" aria-hidden />
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </Reveal>

                {hasDescription && (
                  <Reveal>
                    <div className="mt-8">
                      <h2 className="text-lg font-bold text-rmc-green-deep md:text-xl">
                        {t('library.aboutBook')}
                      </h2>
                      <span
                        aria-hidden
                        className="mt-2 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
                      />
                      <div
                        className="prose prose-sm md:prose-base mt-4 max-w-none text-gray-600 prose-headings:text-rmc-green-deep prose-strong:text-gray-900 prose-a:text-rmc-green prose-blockquote:border-rmc-gold"
                        dangerouslySetInnerHTML={{ __html: description }}
                      />
                    </div>
                  </Reveal>
                )}
              </div>
            </div>

            {/* ── Related ──────────────────────────────────────────────────── */}
            {related.length > 0 && (
              <Reveal>
                <div className="mt-16">
                  <h2 className="text-lg font-bold text-rmc-green-deep md:text-xl">
                    {t('library.related')}
                  </h2>
                  <span
                    aria-hidden
                    className="mt-2 mb-6 block h-px w-12 rounded-full bg-gradient-to-r from-rmc-gold to-rmc-gold-light"
                  />
                  <RelatedBooks books={related} locale={locale} />
                </div>
              </Reveal>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
