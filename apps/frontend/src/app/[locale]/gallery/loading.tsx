import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { GalleryHero } from '@/components/gallery/GalleryHero';
import { PhotoPlaceholder } from '@/components/ui/PhotoPlaceholder';

/**
 * Shown while the gallery's photo list is being fetched.
 *
 * The page is `force-dynamic` and walks the API a page at a time, so until that
 * finishes the route renders nothing — and with no `loading.tsx`, "nothing" is
 * the previous page, frozen, with no sign a click registered. This puts the
 * chrome up immediately and reserves the shape of what is coming.
 *
 * Navbar, Footer and the hero are the real components, not placeholders: none of
 * them depends on the photos, so drawing a grey box where a finished header
 * could already be would be inventing a wait that does not exist.
 */
export default function GalleryLoading() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <GalleryHero />

        {/* Stands in for the 3D carousel — same frame the real one occupies, so
            the swap does not move the sections below it. */}
        <section className="py-6 md:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative mx-auto w-full max-w-3xl min-h-[400px] md:min-h-[520px] overflow-hidden rounded-lg bg-rmc-green-deep/90">
              <PhotoPlaceholder tone="dark" icon />
            </div>
          </div>
        </section>

        {/* Two category blocks of three month-clusters — enough to read as "a
            gallery is loading" without promising a count we do not know yet. */}
        {[0, 1].map((section) => (
          <section
            key={section}
            className={`py-6 md:py-8 ${section % 2 === 1 ? 'bg-rmc-green/[0.03] border-y border-rmc-green/10' : ''}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-6 flex flex-col items-center gap-4">
                <div className="h-7 w-48 animate-pulse rounded bg-gray-100 md:h-8" />
                <div className="ornament-divider max-w-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-rmc-gold shrink-0" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
                {[0, 1, 2].map((cluster) => (
                  <div key={cluster}>
                    <div className="mb-4 flex items-center gap-4">
                      <div className="h-7 w-36 animate-pulse rounded-lg bg-gray-100" />
                      <span className="h-px flex-1 bg-gradient-to-r from-rmc-green/25 via-rmc-gold/25 to-transparent" />
                    </div>

                    <div className="flex flex-col items-center gap-5">
                      {/* The pile's white frame and shadow, with the photo pending. */}
                      <div className="relative mx-auto aspect-[4/3] w-full max-w-md rounded-lg bg-white p-1.5 shadow-[0_20px_45px_-18px_rgba(13,61,36,0.5)] ring-1 ring-black/5">
                        <div className="relative h-full w-full overflow-hidden rounded-lg">
                          <PhotoPlaceholder />
                        </div>
                      </div>
                      <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
