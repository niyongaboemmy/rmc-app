import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EditablePageHero } from '@/components/layout/EditablePageHero';
import { ContentKeys, SERVICES_HERO_DEFAULT } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';
import { ServicesExplorer } from '@/components/services/ServicesExplorer';

/**
 * The per-service blurbs `ServicesExplorer` and its modal render. Read here so they
 * are in the server-rendered HTML — the explorer is a client component, so without
 * this the page shipped the seeded copy and swapped in the saved copy after
 * hydration. `servicesHero` comes from the locale layout.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.services];

/**
 * Services landing — a minimalist, scannable list. Each service is a clickable
 * element: the ones with a concise modal (marriage first) open it on click; the
 * rest still link to their full detail page. Icons, colours and per-service
 * config live in `@/lib/services/serviceCatalog`; the interactive list + modal
 * live in the client `ServicesExplorer`. This page stays a thin server wrapper.
 */
export default async function ServicesPage({ params: { locale } }: { params: { locale: string } }) {
  const content = await fetchSiteContent(PAGE_CONTENT_KEYS);

  return (
    <SiteContentProvider content={content}>
      <div className="min-h-screen">
        <Navbar />
        <main>
          <EditablePageHero
            contentKey={ContentKeys.servicesHero}
            defaults={SERVICES_HERO_DEFAULT}
          />

          <section className="py-16 px-4 sm:px-6 lg:px-8 pattern-light">
            <div className="mx-auto max-w-4xl">
              <ServicesExplorer locale={locale} />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </SiteContentProvider>
  );
}
