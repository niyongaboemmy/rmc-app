import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { WelcomeCarouselSection } from '@/components/home/WelcomeCarouselSection';
import { WhoWeAreSection } from '@/components/home/WhoWeAreSection';
import { PrayerTimesWidget } from '@/components/home/PrayerTimesWidget';
import { AreasOfInterventionSection } from '@/components/home/AreasOfInterventionSection';
import { ActivitiesEventsSection } from '@/components/home/ActivitiesEventsSection';
import { AnnouncementsSection } from '@/components/home/AnnouncementsSection';
import { StatsSection } from '@/components/home/StatsSection';
import { ServicesPreview } from '@/components/home/ServicesPreview';
import { PartnersSection } from '@/components/home/PartnersSection';
import { SocialMediaSection } from '@/components/home/SocialMediaSection';
import { AskAIButton } from '@/components/home/AskAIButton';
import { Footer } from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* 1. Hero — Verse of the Day (sliding) */}
        <HeroSection />

        {/* 2. Welcome — Carousel for updates, scholarships, donations */}
        <WelcomeCarouselSection />

        {/* 3. Who We Are */}
        <WhoWeAreSection />

        {/* 4. Prayer Times */}
        <PrayerTimesWidget />

        {/* 5. Areas of Intervention: Dawa, Social & Dev, Education, Foreign Affairs */}
        <AreasOfInterventionSection />

        {/* 6. Activities: Latest & Upcoming Events */}
        <ActivitiesEventsSection />

        {/* 7. Announcements */}
        <AnnouncementsSection />

        {/* 8. RMC in Statistics */}
        <StatsSection />

        {/* 9. Partners */}
        <PartnersSection />

        {/* 10. Latest on Social Media */}
        <SocialMediaSection />
      </main>

      <Footer />

      {/* 11. Ask AI — floating widget */}
      <AskAIButton />
    </div>
  );
}
