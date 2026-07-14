import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/hajj/Hero';
import { HajjAbout } from '@/components/hajj/HajjAbout';
import { HajjDescription } from '@/components/hajj/HajjDescription';
import { RequirementsList } from '@/components/hajj/RequirementsList';
import { BankAccounts } from '@/components/hajj/BankAccounts';

/**
 * Hajj Services — single scrollable landing page.
 *   Section A: Hero
 *   Section B: Descriptive intro (photo + description & incentive → register)
 *   Section C: Description (admin-written rich text)
 *   Section D: Requirements
 *   Section E: Bank accounts
 *
 * Server component: composes the shared chrome + the section components
 * (they are client components where interactivity or hooks are needed).
 */
// The description section reads its copy from the CMS on the server, so render
// per request — an admin's edit must not wait for a rebuild.
export const dynamic = 'force-dynamic';

export default function HajjServicesPage() {
  return (
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
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <RequirementsList />
          </div>
        </section>

        {/* Section E — Where to pay. Hides itself until an admin adds accounts. */}
        <section className="relative bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <BankAccounts />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
