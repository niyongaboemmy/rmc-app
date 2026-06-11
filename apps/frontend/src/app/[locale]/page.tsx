import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { VerseOfDay } from '@/components/home/VerseOfDay';
import { PrayerTimesWidget } from '@/components/home/PrayerTimesWidget';
import { StatsSection } from '@/components/home/StatsSection';
import { IslamicPillarsSection } from '@/components/home/IslamicPillarsSection';
import { AnnouncementsSection } from '@/components/home/AnnouncementsSection';
import { ServicesPreview } from '@/components/home/ServicesPreview';
import { Footer } from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <VerseOfDay />
        <PrayerTimesWidget />
        <StatsSection />
        <IslamicPillarsSection />
        <ServicesPreview />
        <AnnouncementsSection />
      </main>
      <Footer />
    </div>
  );
}
