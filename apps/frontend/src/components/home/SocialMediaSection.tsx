'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Facebook, Instagram, Youtube, ExternalLink } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { XLogo } from '@/components/icons/XLogo';
import { TweetColumn } from './TweetColumn';
import {
  ContentKeys,
  SOCIAL_DEFAULT,
  getSiteContent,
  mergeContent,
  getSocialFeed,
  toRenderPost,
  formatCount,
  pick,
  isRtl,
  type SocialContent,
  type SocialChannel,
  type SocialPost,
} from '@/lib/content-api';

// Channel key → icon/background. Owned by the landing (not the content store).
const CHANNEL_CONFIG: Record<SocialChannel['key'], { Icon: React.ComponentType<{ className?: string }>; bg: string }> = {
  facebook: { Icon: Facebook, bg: 'bg-blue-600' },
  twitter: { Icon: XLogo, bg: 'bg-black' },
  instagram: { Icon: Instagram, bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400' },
  youtube: { Icon: Youtube, bg: 'bg-red-600' },
};

export function SocialMediaSection() {
  const { locale } = useParams<{ locale: string }>();
  const { ref: titleRef, visible: titleVisible } = useScrollReveal(0.1);

  // Content managed from Admin → Content → Social Media. Falls back to the
  // built-in defaults until something is saved (or if the fetch fails).
  const [content, setContent] = useState<SocialContent>(SOCIAL_DEFAULT);
  // Live posts pulled from the real RMC accounts by the backend (cached + polled).
  const [livePosts, setLivePosts] = useState<SocialPost[] | null>(null);
  const [liveFollowers, setLiveFollowers] = useState<Record<string, string>>({});
  // Real profile links from the live feed (e.g. the configured YouTube channel).
  const [liveLinks, setLiveLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    getSiteContent<SocialContent>(ContentKeys.social)
      .then((data) => {
        if (active && data) setContent(mergeContent(SOCIAL_DEFAULT, data));
      })
      .catch(() => {
        /* keep defaults */
      });

    getSocialFeed()
      .then((feed) => {
        if (!active || !feed) return;
        if (feed.posts.length) setLivePosts(feed.posts.map(toRenderPost));
        if (feed.channels.length) {
          setLiveFollowers(
            Object.fromEntries(feed.channels.map((c) => [c.key, formatCount(c.followers)])),
          );
          setLiveLinks(
            Object.fromEntries(feed.channels.filter((c) => c.href).map((c) => [c.key, c.href])),
          );
        }
      })
      .catch(() => {
        /* keep admin/static content */
      });

    return () => {
      active = false;
    };
  }, []);

  const rtl = isRtl(locale);
  const eyebrow = pick(content.eyebrow, locale);
  const title = pick(content.title, locale);
  const subtitle = pick(content.subtitle, locale);

  // Newest YouTube video (live feed is newest-first) → featured embed.
  const latestVideo = (livePosts ?? []).find((p) => p.platform === 'youtube' && p.url);
  const latestVideoId = latestVideo?.url?.match(/[?&]v=([\w-]+)/)?.[1] ?? null;

  // X / Twitter handle — derived from the Twitter channel's profile link
  // (admin-editable in Content → Social Media). Drives the profile link; the
  // tweets themselves come from the live feed below.
  const twitterUrl = liveLinks.twitter || content.channels.find((c) => c.key === 'twitter')?.href || '';
  const twitterHandle = twitterUrl.match(/(?:twitter|x)\.com\/@?([A-Za-z0-9_]{1,15})/i)?.[1] ?? null;
  // Prefer live tweets (fresh, when X isn't rate-limiting); otherwise fall back
  // to the admin-curated highlights from the Social Media content store.
  const liveTweets = (livePosts ?? []).filter((p) => p.platform === 'twitter' && p.url);
  const curatedTweets = content.posts.filter((p) => p.platform === 'twitter');
  const tweets = liveTweets.length ? liveTweets : curatedTweets;
  const showX = Boolean(twitterHandle || tweets.length);
  const xProfileUrl = twitterUrl || (twitterHandle ? `https://x.com/${twitterHandle}` : 'https://x.com');
  const youtubeUrl =
    liveLinks.youtube || content.channels.find((c) => c.key === 'youtube')?.href || 'https://www.youtube.com';

  return (
    <section className="relative bg-transparent py-12 md:py-16 overflow-hidden">
      <div className="absolute inset-0 pattern-light" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir={rtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div
          ref={titleRef}
          className={`text-center mb-12 transition-all duration-700 ${
            titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-rmc-green/10 text-rmc-green px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-rmc-green animate-pulse" />
            {eyebrow}
          </div>
          <h2
            className={`text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900 ${rtl ? 'font-arabic' : ''}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {title}
          </h2>
          <p
            className={`text-gray-400 mt-2 max-w-xl mx-auto text-sm md:text-base ${rtl ? 'font-arabic' : ''}`}
            dir={rtl ? 'rtl' : 'ltr'}
          >
            {subtitle}
          </p>
        </div>

        {/* Featured: latest video + latest tweets. Both columns always render
            with graceful placeholders so the layout never collapses when a
            video or the tweets feed is unavailable. */}
        <div className="grid gap-8 lg:grid-cols-5 items-start mb-14">
          <div className={showX ? 'lg:col-span-3' : 'lg:col-span-5 max-w-3xl mx-auto w-full'}>
            <div className={`inline-flex items-center gap-2 mb-3 text-rmc-green text-xs font-bold ${rtl ? 'font-arabic' : 'uppercase tracking-[0.15em]'}`}>
              <Youtube className="w-4 h-4" />
              {pick({ en: 'Latest video', rw: 'Iyamamaza riheruka', ar: 'أحدث فيديو' }, locale)}
            </div>
            {latestVideoId ? (
              <div className="relative w-full overflow-hidden rounded-2xl border border-gray-100 shadow-xl ring-1 ring-black/5 aspect-video lg:aspect-auto lg:h-[420px] bg-black">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${latestVideoId}`}
                  title={latestVideo ? pick(latestVideo.content, locale) : 'Latest video'}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-gray-100 text-center no-underline shadow-sm ring-1 ring-black/5"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110">
                  <Youtube className="h-7 w-7" />
                </span>
                <span className={`px-6 text-sm font-semibold text-gray-500 ${rtl ? 'font-arabic' : ''}`}>
                  {pick(
                    {
                      en: 'No video to show right now — visit our channel',
                      rw: 'Nta video ihari ubu — sura umuyoboro wacu',
                      ar: 'لا يوجد فيديو حاليًا — تفضل بزيارة قناتنا',
                    },
                    locale,
                  )}
                </span>
              </a>
            )}
          </div>

          {showX && (
            <div className="lg:col-span-2">
              <div className={`inline-flex items-center gap-2 mb-3 text-gray-900 text-xs font-bold ${rtl ? 'font-arabic' : 'uppercase tracking-[0.15em]'}`}>
                <XLogo className="w-3.5 h-3.5" />
                {pick({ en: 'Latest on X', rw: 'Ibyanyuma kuri X', ar: 'الأحدث على X' }, locale)}
              </div>
              <TweetColumn
                tweets={tweets}
                handle={twitterHandle ?? 'islamrwanda'}
                profileUrl={xProfileUrl}
                locale={locale}
                rtl={rtl}
                height={420}
                ctaLabel={pick({ en: 'View on X', rw: 'Reba kuri X', ar: 'عرض على X' }, locale)}
              />
            </div>
          )}
        </div>

        {/* Social channel buttons — flex-wrap + center so an odd count stays centered */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {content.channels.map((channel, i) => {
            const cfg = CHANNEL_CONFIG[channel.key];
            const Icon = cfg?.Icon ?? ExternalLink;
            const bg = cfg?.bg ?? 'bg-gray-500';
            // Admin-entered follower count wins when set; otherwise fall back to
            // the live count from the feed (e.g. YouTube subscribers). Blank = live.
            const followersText = (channel.followers || '').trim() || liveFollowers[channel.key] || '';
            return (
              <a
                key={`${channel.key}-${i}`}
                href={liveLinks[channel.key] || channel.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-center gap-3 p-4 w-[calc(50%-0.5rem)] sm:w-64 rounded-2xl bg-white border border-gray-100 hover:border-transparent hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                  titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold text-gray-900 truncate ${rtl ? 'font-arabic' : ''}`}>{channel.label}</p>
                  {followersText ? (
                    <p className={`text-xs text-gray-400 ${rtl ? 'font-arabic' : ''}`}>
                      {followersText} followers
                    </p>
                  ) : (
                    <p className={`text-xs text-gray-400 ${rtl ? 'font-arabic' : ''}`}>{pick({ en: 'Follow us', rw: 'Dukurikire', ar: 'تابعنا' }, locale)}</p>
                  )}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-rmc-green ms-auto shrink-0 transition-colors rtl:-scale-x-100" />
              </a>
            );
          })}
        </div>

      </div>
    </section>
  );
}
