import { registerAs } from '@nestjs/config';

/**
 * Configuration for the live social-media feed shown in the landing page's
 * "Latest on Social Media" section.
 *
 * Each platform is opt-in: leave its credentials blank and that platform is
 * simply skipped (the section falls back to admin-managed content). Posts are
 * fetched on a schedule and cached, so visitors never wait on a third-party API.
 */
export default registerAs('social', () => ({
  /** Master switch — set SOCIAL_FEED_ENABLED=false to disable polling entirely. */
  enabled: process.env.SOCIAL_FEED_ENABLED !== 'false',
  /** How often the background job refreshes the feed (minutes). */
  pollMinutes: Math.max(1, parseInt(process.env.SOCIAL_FEED_POLL_MINUTES || '15', 10)),
  /** Max posts kept in the merged feed (newest first, across all platforms). */
  maxPosts: Math.max(1, parseInt(process.env.SOCIAL_FEED_MAX_POSTS || '12', 10)),
  /** Graph API version used for Facebook + Instagram requests. */
  metaGraphVersion: process.env.META_GRAPH_VERSION || 'v21.0',

  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
    channelId: process.env.YOUTUBE_CHANNEL_ID || '',
  },
  facebook: {
    pageId: process.env.FACEBOOK_PAGE_ID || '',
    token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
  },
  instagram: {
    userId: process.env.INSTAGRAM_USER_ID || '',
    // Instagram Graph access uses a token tied to the linked Facebook page;
    // fall back to the page token when a dedicated one is not provided.
    token: process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
  },
  twitter: {
    bearer: process.env.TWITTER_BEARER_TOKEN || '',
    userId: process.env.TWITTER_USER_ID || '',
    // Free, key-less path: a public @handle (no leading @). Uses X's public
    // syndication timeline (the same data that powers embedded timelines).
    username: (process.env.TWITTER_USERNAME || '').replace(/^@/, ''),
  },
}));
