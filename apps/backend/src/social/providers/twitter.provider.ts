import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchJson } from './http.util';
import { NormalizedPost, ProviderResult, SocialProvider } from '../social.types';

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

  constructor(private readonly config: ConfigService) {}

  private get cfg() {
    return {
      bearer: this.config.get<string>('social.twitter.bearer', ''),
      userId: this.config.get<string>('social.twitter.userId', ''),
    };
  }

  isConfigured(): boolean {
    const { bearer, userId } = this.cfg;
    return Boolean(bearer && userId);
  }

  async fetch(maxPosts: number): Promise<ProviderResult> {
    const { bearer, userId } = this.cfg;
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

    const username = user.data?.username;
    const handle = username ? `@${username}` : user.data?.name || 'X / Twitter';
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
          url: username
            ? `https://twitter.com/${username}/status/${t.id}`
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
        href: username ? `https://twitter.com/${username}` : 'https://twitter.com',
      },
    };
  }
}
