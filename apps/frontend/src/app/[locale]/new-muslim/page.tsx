import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { EditablePageHero } from '@/components/layout/EditablePageHero';
import { Reveal } from '@/components/ui/Reveal';
import { ContentKeys, NEW_MUSLIM_HERO_DEFAULT } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';
import { FirstSteps } from '@/components/new-muslim/FirstSteps';
import { EssentialDuas } from '@/components/new-muslim/EssentialDuas';
import { FindNearby } from '@/components/new-muslim/FindNearby';
import { MentorForm } from '@/components/new-muslim/MentorForm';

/**
 * The blob all four islands below share. `new-muslim-hero` is not here — the locale
 * layout already provides it, because two client-rooted pages need the same key.
 */
const PAGE_CONTENT_KEYS = [ContentKeys.newMuslim];

/**
 * "Welcome to Islam" — the page a brand-new Muslim lands on.
 *
 * A thin shell: every section is its own client island bound to the `new-muslim`
 * CMS section (the hero to `new-muslim-hero`), so a super-admin can edit the
 * whole page in place in Edit Mode. Sections alternate light / dark bands, with
 * the duas carried on the one deep-green band.
 */
export default async function NewMuslimPage() {
  const content = await fetchSiteContent(PAGE_CONTENT_KEYS);

  return (
    <SiteContentProvider content={content}>
      <div className="min-h-screen bg-white">
        <Navbar />

        {/* Sized like the other landing heroes — about, contact, gallery and projects are
            all 40vh at pt-28 pb-10. This one passed no geometry at all and so took
            PageHero's 50vh / pt-36 pb-14 defaults, making it the tallest hero in the app.

            The eyebrow and ornament stay. Elsewhere they were dropped for restating the
            heading, but "Welcome to Islam" over "Your Journey Begins Here" is a greeting
            to someone who has just taken shahada, not a label repeating the title. */}
        <EditablePageHero
          contentKey={ContentKeys.newMuslimHero}
          defaults={NEW_MUSLIM_HERO_DEFAULT}
          showEyebrow
          ornament
          minHeightClassName="min-h-[40vh]"
          paddingClassName="pt-28 pb-10"
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
    </SiteContentProvider>
  );
}
