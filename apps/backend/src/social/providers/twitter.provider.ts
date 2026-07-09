import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchJson } from './http.util';
import { NormalizedPost, ProviderResult, SocialProvider } from '../social.types';

/** Browser-like UA so X's public syndication endpoint serves the timeline. */
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/* Shapes for the public syndication timeline JSON (subset we use). */
interface SyndMedia {
  type?: string;
  media_url_https?: string;
}
interface SyndTweet {
  id_str?: string;
  full_text?: string;
  text?: string;
  created_at?: string;
  favorite_count?: number;
  reply_count?: number;
  permalink?: string;
  user?: {
    screen_name?: string;
    name?: string;
    followers_count?: number;
  };
  entities?: { media?: SyndMedia[] };
  extended_entities?: { media?: SyndMedia[] };
}
interface SyndEntry {
  content?: { tweet?: SyndTweet };
}

interface XMedia {
  media_key?: string;
  type?: string;
  url?: string;
  preview_image_url?: string;
}
interface XTweetsResp {
  data?: Array<{
    id?: string;
    text?: string;
    created_at?: string;
    public_metrics?: { like_count?: number; reply_count?: number };
    attachments?: { media_keys?: string[] };
  }>;
  includes?: { media?: XMedia[] };
}
interface XUserResp {
  data?: {
    username?: string;
    name?: string;
    public_metrics?: { followers_count?: number };
  };
}

/**
 * Pulls a user's recent tweets via the X (Twitter) API v2.
 *
 * NOTE: reading a user timeline requires a PAID X API plan. With no
 * TWITTER_BEARER_TOKEN configured the provider is simply skipped.
 */
@Injectable()
export class TwitterProvider implements SocialProvider {
  readonly platform = 'twitter' as const;
  private readonly logger = new Logger(TwitterProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get cfg() {
    return {
      bearer: this.config.get<string>('social.twitter.bearer', ''),
      userId: this.config.get<string>('social.twitter.userId', ''),
      username: this.config.get<string>('social.twitter.username', ''),
    };
  }

  isConfigured(): boolean {
    const { bearer, userId, username } = this.cfg;
    // Paid path needs bearer + userId; free path needs only a public @handle.
    return Boolean((bearer && userId) || username);
  }

  async fetch(maxPosts: number): Promise<ProviderResult> {
    const { bearer, userId, username } = this.cfg;

    // No paid bearer token → use the free public syndication timeline.
    if (!bearer && username) return this.fetchViaSyndication(username, maxPosts);
    const auth = { Authorization: `Bearer ${bearer}` };
    // The timeline endpoint requires max_results in [5, 100].
    const limit = Math.min(100, Math.max(5, maxPosts));

    const tweets = await fetchJson<XTweetsResp>(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=${limit}` +
        `&tweet.fields=created_at,public_metrics&expansions=attachments.media_keys` +
        `&media.fields=preview_image_url,url,type`,
      auth,
    );

    let user: XUserResp = {};
    try {
      user = await fetchJson<XUserResp>(
        `https://api.twitter.com/2/users/${userId}?user.fields=public_metrics,username,name`,
        auth,
      );
    } catch {
      /* user metadata is best-effort */
    }

    const apiUsername = user.data?.username;
    const handle = apiUsername ? `@${apiUsername}` : user.data?.name || 'X / Twitter';
    const mediaByKey = new Map<string, XMedia>();
    for (const m of tweets.includes?.media ?? []) {
      if (m.media_key) mediaByKey.set(m.media_key, m);
    }

    const posts: NormalizedPost[] = (tweets.data ?? [])
      .filter((t) => t.id)
      .map((t) => {
        const key = t.attachments?.media_keys?.[0];
        const media = key ? mediaByKey.get(key) : undefined;
        return {
          platform: 'twitter' as const,
          handle,
          text: t.text || '',
          image: media?.url || media?.preview_image_url,
          url: apiUsername
            ? `https://twitter.com/${apiUsername}/status/${t.id}`
            : `https://twitter.com/i/web/status/${t.id}`,
          likes: t.public_metrics?.like_count ?? 0,
          comments: t.public_metrics?.reply_count ?? 0,
          publishedAt: t.created_at || new Date(0).toISOString(),
        };
      });

    return {
      posts,
      channel: {
        key: 'twitter',
        label: handle,
        followers: user.data?.public_metrics?.followers_count ?? 0,
        href: apiUsername ? `https://twitter.com/${apiUsername}` : 'https://twitter.com',
      },
    };
  }

  /**
   * Free, key-less path: X's public syndication timeline (the same JSON that
   * powers embedded timeline widgets). Fetched server-side once per poll, so X
   * rate-limits our single server — not every visitor's browser (which is why
   * the client-side widget renders blank). No engagement API needed.
   */
  private async fetchViaSyndication(username: string, maxPosts: number): Promise<ProviderResult> {
    const url =
      `https://syndication.twitter.com/srv/timeline-profile/screen-name/` +
      `${encodeURIComponent(username)}?dnt=false&lang=en`;

    // X rate-limits this endpoint per-IP (429) intermittently. Retry a few
    // times with backoff; a single success per poll feeds the 24h cache, so
    // transient throttling never empties the section.
    let html = '';
    const delays = [0, 2500, 6000];
    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (delays[attempt]) await new Promise((r) => setTimeout(r, delays[attempt]));
      const res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } });
      if (res.ok) {
        html = await res.text();
        break;
      }
      if (res.status !== 429 && res.status < 500) {
        throw new Error(`X syndication responded ${res.status}`);
      }
      this.logger.warn(`X syndication ${res.status} for @${username} (attempt ${attempt + 1}).`);
    }
    if (!html) throw new Error('X syndication rate-limited (429) on all attempts');

    const json = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
    )?.[1];
    if (!json) throw new Error('X syndication: timeline data not found');

    const data = JSON.parse(json) as {
      props?: { pageProps?: { timeline?: { entries?: SyndEntry[] } } };
    };
    const entries = data.props?.pageProps?.timeline?.entries ?? [];

    let channelUser: SyndTweet['user'] | undefined;
    const posts: NormalizedPost[] = [];
    for (const entry of entries) {
      const t = entry.content?.tweet;
      if (!t?.id_str) continue;
      channelUser ??= t.user;
      const media = t.extended_entities?.media?.[0] ?? t.entities?.media?.[0];
      const screen = t.user?.screen_name || username;
      posts.push({
        platform: 'twitter',
        handle: t.user?.name || `@${screen}`,
        // Drop the trailing t.co short-link X appends for media/quote tweets.
        text: (t.full_text || t.text || '').replace(/(\s*https:\/\/t\.co\/\S+)+\s*$/, '').trim(),
        image: media?.media_url_https,
        url: t.permalink
          ? `https://twitter.com${t.permalink}`
          : `https://twitter.com/${screen}/status/${t.id_str}`,
        likes: t.favorite_count ?? 0,
        comments: t.reply_count ?? 0,
        publishedAt: parseTwitterDate(t.created_at),
      });
    }

    posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    this.logger.log(`X syndication: ${posts.length} tweets for @${username}.`);
    return {
      posts: posts.slice(0, maxPosts),
      channel: {
        key: 'twitter',
        label: channelUser?.name || `@${username}`,
        followers: channelUser?.followers_count ?? 0,
        href: `https://x.com/${channelUser?.screen_name || username}`,
      },
    };
  }
}

/** Twitter's `created_at` ("Mon Mar 31 10:58:04 +0000 2025") → ISO-8601. */
function parseTwitterDate(raw?: string): string {
  if (!raw) return new Date(0).toISOString();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}
