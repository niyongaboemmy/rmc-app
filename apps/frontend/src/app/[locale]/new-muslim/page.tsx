import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EditablePageHero } from '@/components/layout/EditablePageHero';
import { Reveal } from '@/components/ui/Reveal';
import { ContentKeys, NEW_MUSLIM_HERO_DEFAULT } from '@/lib/content-api';
import { FirstSteps } from '@/components/new-muslim/FirstSteps';
import { EssentialDuas } from '@/components/new-muslim/EssentialDuas';
import { FindNearby } from '@/components/new-muslim/FindNearby';
import { MentorForm } from '@/components/new-muslim/MentorForm';

/**
 * "Welcome to Islam" — the page a brand-new Muslim lands on.
 *
 * A thin shell: every section is its own client island bound to the `new-muslim`
 * CMS section (the hero to `new-muslim-hero`), so a super-admin can edit the
 * whole page in place in Edit Mode. Sections alternate light / dark bands, with
 * the duas carried on the one deep-green band.
 */
export default function NewMuslimPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <EditablePageHero
        contentKey={ContentKeys.newMuslimHero}
        defaults={NEW_MUSLIM_HERO_DEFAULT}
        showEyebrow
        ornament
      />

      <main>
        <Reveal>
          <FirstSteps />
        </Reveal>
        <Reveal>
          <EssentialDuas />
        </Reveal>
        <Reveal>
          <FindNearby />
        </Reveal>
        <Reveal>
          <MentorForm />
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}
