import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/hajj/Hero';
import { HajjAbout } from '@/components/hajj/HajjAbout';
import { HajjDescription } from '@/components/hajj/HajjDescription';
import { RequirementsList } from '@/components/hajj/RequirementsList';
import { HajjSteps } from '@/components/hajj/HajjSteps';
import { HajjRegisterCta } from '@/components/hajj/HajjRegisterCta';
import { BankAccounts } from '@/components/hajj/BankAccounts';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/**
 * Hajj Services — single scrollable landing page.
 *   Section A: Hero
 *   Section B: Descriptive intro (photo + description & incentive → register)
 *   Section C: Description (admin-written rich text)
 *   Section D: Requirements
 *   Section E: How it works — the step-by-step journey
 *   Section F: Bank accounts
 *
 * Server component: composes the shared chrome + the section components
 * (they are client components where interactivity or hooks are needed).
 */
// The description and steps sections read their copy from the CMS on the server,
// so render per request — an admin's edit must not wait for a rebuild.
export const dynamic = 'force-dynamic';

/**
 * Every section below draws on the one `hajj` blob — hero, intro, description,
 * requirements, steps and the register CTA. They are all client components, so
 * reading it here is what puts the saved copy in the first paint; six components
 * that each fetched on mount now share one server-rendered map.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.hajj];

export default async function HajjServicesPage() {
  const content = await fetchSiteContent(PAGE_CONTENT_KEYS);

  return (
    <SiteContentProvider content={content}>
      <div className="min-h-screen">
        <Navbar />
        <main>
          <Hero />

          {/* Section B — Descriptive intro + incentive. */}
          <HajjAbout />

          {/* Section C — Admin-written description. Hides itself when left blank. */}
          <HajjDescription />

          {/* Section D — Requirements. */}
          <section className="relative bg-gray-50/60 pattern-light">
            <div className="mx-auto max-w-7xl px-6 py-12 md:py-16 sm:px-8 lg:px-12">
              <RequirementsList />
            </div>
          </section>

          {/* Section E — How it works. Hides itself when an admin removes every step. */}
          <HajjSteps />

          {/* Register CTA — kept out of the steps section so it stays on the page
              even when an admin removes every step. */}
          <HajjRegisterCta />

          {/* Section F — Where to pay. Hides itself until an admin adds accounts. */}
          <section className="relative bg-white">
            <div className="mx-auto max-w-7xl px-6 py-12 md:py-16 sm:px-8 lg:px-12">
              <BankAccounts />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </SiteContentProvider>
  );
}
