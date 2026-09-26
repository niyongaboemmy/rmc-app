import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { WelcomeCarouselSection } from '@/components/home/WelcomeCarouselSection';
import { WhoWeAreSection } from '@/components/home/WhoWeAreSection';
import { HowToBecomeMuslimSection } from '@/components/home/HowToBecomeMuslimSection';
import { AreasOfInterventionSection } from '@/components/home/AreasOfInterventionSection';
import { ActivitiesEventsSection } from '@/components/home/ActivitiesEventsSection';
import { NewsSection, type NewsStory } from '@/components/home/NewsSection';
import { StatsSection } from '@/components/home/StatsSection';
import { PartnersSection } from '@/components/home/PartnersSection';
import { SocialMediaSection } from '@/components/home/SocialMediaSection';
import { Footer } from '@/components/layout/Footer';
import { Reveal } from '@/components/ui/Reveal';
import { resolvePosts } from '@/components/blog/blogData';
import { ContentKeys, type BlogContent } from '@/lib/content-api';
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
  ContentKeys.areas,
  ContentKeys.stats,
  ContentKeys.news,
  ContentKeys.announcements,
  ContentKeys.activities,
  ContentKeys.howToBecomeMuslim,
  ContentKeys.partners,
  ContentKeys.social,
];

/** How many of the newest blog posts the News section features. */
const NEWS_STORIES = 3;

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const content = await fetchSiteContent(HOME_CONTENT_KEYS);

  // The blog is read from the same (request-cached) store fetch, but kept out of the
  // provider map above: it carries every post's full body, and the News section
  // needs only the newest few cards.
  const { [ContentKeys.blog]: savedBlog } = await fetchSiteContent([ContentKeys.blog]);
  // Post dates are date-only (YYYY-MM-DD), which parse as UTC midnight — format in
  // UTC too, or a server west of Greenwich would show the day before.
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
  const stories: NewsStory[] = resolvePosts(savedBlog as BlogContent | undefined, locale)
    .slice(0, NEWS_STORIES)
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || post.summary,
      image: post.image,
      category: post.category,
      date: post.date,
      dateLabel: dateFmt.format(new Date(post.date)),
    }));

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

          {/* 4. What we do — Dawa, Social & Dev, Education, Foreign Affairs */}
          <Reveal>
            <AreasOfInterventionSection />
          </Reveal>

          {/* 5. Impact — RMC in Statistics (dark band between the light sections) */}
          <Reveal>
            <StatsSection />
          </Reveal>

          {/* 6. News — latest blog stories beside announcements & tenders */}
          <Reveal>
            <NewsSection stories={stories} />
          </Reveal>

          {/* 7. Activities: Latest & Upcoming Events */}
          <Reveal>
            <ActivitiesEventsSection />
          </Reveal>

          {/* 8. How to Become a Muslim — auto-playing muted video, the Shahada, and steps */}
          <Reveal>
            <HowToBecomeMuslimSection />
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
