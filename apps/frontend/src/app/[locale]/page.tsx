import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { WelcomeCarouselSection } from '@/components/home/WelcomeCarouselSection';
import { WhoWeAreSection } from '@/components/home/WhoWeAreSection';
import { HowToBecomeMuslimSection } from '@/components/home/HowToBecomeMuslimSection';
import { AreasOfInterventionSection } from '@/components/home/AreasOfInterventionSection';
import { ActivitiesEventsSection } from '@/components/home/ActivitiesEventsSection';
import { AnnouncementsSection } from '@/components/home/AnnouncementsSection';
import { TendersSection } from '@/components/home/TendersSection';
import { StatsSection } from '@/components/home/StatsSection';
import { PartnersSection } from '@/components/home/PartnersSection';
import { SocialMediaSection } from '@/components/home/SocialMediaSection';
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/ui/Reveal';
import { ContentKeys } from '@/lib/content-api';
import { fetchSiteContent } from '@/lib/content/server';
import { SiteContentProvider } from '@/lib/content/SiteContentProvider';

/**
 * The admin-managed sections rendered below. Read on the server so their saved copy
 * — including its Kinyarwanda and Arabic translations — is in the first paint rather
 * than swapped in after hydration.
 *
 * Keep in sync with the sections in the tree. A key missing from this list is not a
 * failure: that section just falls back to fetching for itself on mount.
 */
const HOME_CONTENT_KEYS = [
  ContentKeys.hero,
  ContentKeys.whoWeAre,
  ContentKeys.updates,
  ContentKeys.howToBecomeMuslim,
  ContentKeys.areas,
  ContentKeys.activities,
  ContentKeys.announcements,
  ContentKeys.tendersHome,
  ContentKeys.stats,
  ContentKeys.partners,
  ContentKeys.social,
];

export default async function HomePage() {
  const content = await fetchSiteContent(HOME_CONTENT_KEYS);

  return (
    <SiteContentProvider content={content}>
      <div className="min-h-screen">
        <Navbar />
        <main>
          {/* 1. Hero — Verse of the Day (sliding); animates on load (above the fold) */}
          <HeroSection />

          {/* Each section below glides in smoothly the first time it scrolls into view */}
          {/* 2. Who We Are */}
          <Reveal>
            <WhoWeAreSection />
          </Reveal>

          {/* 3. Welcome — Updates & Programs (with live prayer times) */}
          <Reveal>
            <WelcomeCarouselSection />
          </Reveal>

          {/* 3b. How to Become a Muslim — auto-playing muted video, the Shahada, and steps */}
          <Reveal>
            <HowToBecomeMuslimSection />
          </Reveal>

          {/* 5. Areas of Intervention: Dawa, Social & Dev, Education, Foreign Affairs */}
          <Reveal>
            <AreasOfInterventionSection />
          </Reveal>

          {/* 6. Activities: Latest & Upcoming Events */}
          <Reveal>
            <ActivitiesEventsSection />
          </Reveal>

          {/* 7. Announcements */}
          <Reveal>
            <AnnouncementsSection />
          </Reveal>

          {/* 7b. Tenders */}
          <Reveal>
            <TendersSection />
          </Reveal>

          {/* 8. RMC in Statistics */}
          <Reveal>
            <StatsSection />
          </Reveal>

          {/* 9. Partners */}
          <Reveal>
            <PartnersSection />
          </Reveal>

          {/* 10. Latest on Social Media */}
          <Reveal>
            <SocialMediaSection />
          </Reveal>
        </main>

        <Footer />
      </div>
    </SiteContentProvider>
  );
}
