/** Platforms the feed can aggregate. */
export type SocialPlatform = 'facebook' | 'twitter' | 'instagram' | 'youtube';

/** A single post normalised across every platform. */
export interface NormalizedPost {
  platform: SocialPlatform;
  /** Display handle/name, e.g. "Rwanda Muslim Community" or "@rmc_rwanda". */
  handle: string;
  /** Caption / message / tweet / video title (original language, untranslated). */
  text: string;
  /** Optional preview image (post photo, video thumbnail). */
  image?: string;
  /** Permalink to the original post. */
  url: string;
  likes: number;
  comments: number;
  /** ISO-8601 timestamp the post was published. Used for sort + "x ago". */
  publishedAt: string;
}

/** Live "follow us" channel metadata (follower counts, profile link). */
export interface NormalizedChannel {
  key: SocialPlatform;
  label: string;
  followers: number;
  href: string;
}

/** What each platform provider returns for one refresh. */
export interface ProviderResult {
  posts: NormalizedPost[];
  channel: NormalizedChannel | null;
}

/** Common shape every platform adapter implements. */
export interface SocialProvider {
  readonly platform: SocialPlatform;
  /** True only when the required credentials are present. */
  isConfigured(): boolean;
  /** Fetch the latest posts + channel info. Throws on API error. */
  fetch(maxPosts: number): Promise<ProviderResult>;
}

/** Cached payload served to the public feed endpoint. */
export interface SocialFeed {
  posts: NormalizedPost[];
  channels: NormalizedChannel[];
  fetchedAt: string | null;
  /** True when at least one platform is configured. */
  configured: boolean;
}
