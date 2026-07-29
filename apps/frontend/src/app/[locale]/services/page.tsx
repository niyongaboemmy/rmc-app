import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EditablePageHero } from '@/components/layout/EditablePageHero';
import { ContentKeys, SERVICES_HERO_DEFAULT } from '@/lib/content-api';
import { ServicesExplorer } from '@/components/services/ServicesExplorer';

/**
 * Services landing — a minimalist, scannable list. Each service is a clickable
 * element: the ones with a concise modal (marriage first) open it on click; the
 * rest still link to their full detail page. Icons, colours and per-service
 * config live in `@/lib/services/serviceCatalog`; the interactive list + modal
 * live in the client `ServicesExplorer`. This page stays a thin server wrapper.
 */
export default async function ServicesPage({ params: { locale } }: { params: { locale: string } }) {
  return (
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
  );
}
