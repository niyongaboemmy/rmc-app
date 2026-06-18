import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchJson } from './http.util';
import { NormalizedPost, ProviderResult, SocialProvider } from '../social.types';

interface IgMediaResp {
  data?: Array<{
    caption?: string;
    media_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
    timestamp?: string;
    like_count?: number;
    comments_count?: number;
  }>;
}
interface IgProfileResp {
  username?: string;
  followers_count?: number;
}

/**
 * Pulls an Instagram Business/Creator account's recent media via the Graph API.
 * Requires the IG user id (linked to a Facebook page) + an access token.
 */
@Injectable()
export class InstagramProvider implements SocialProvider {
  readonly platform = 'instagram' as const;

  constructor(private readonly config: ConfigService) {}

  private get cfg() {
    return {
      userId: this.config.get<string>('social.instagram.userId', ''),
      token: this.config.get<string>('social.instagram.token', ''),
      version: this.config.get<string>('social.metaGraphVersion', 'v21.0'),
    };
  }

  isConfigured(): boolean {
    const { userId, token } = this.cfg;
    return Boolean(userId && token);
  }

  async fetch(maxPosts: number): Promise<ProviderResult> {
    const { userId, token, version } = this.cfg;
    const base = `https://graph.facebook.com/${version}`;
    const fields =
      'caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';

    const media = await fetchJson<IgMediaResp>(
      `${base}/${userId}/media?fields=${encodeURIComponent(fields)}&limit=${maxPosts}&access_token=${encodeURIComponent(token)}`,
    );

    let profile: IgProfileResp = {};
    try {
      profile = await fetchJson<IgProfileResp>(
        `${base}/${userId}?fields=username,followers_count&access_token=${encodeURIComponent(token)}`,
      );
    } catch {
      /* profile metadata is best-effort */
    }

    const username = profile.username ? `@${profile.username}` : 'Instagram';
    const posts: NormalizedPost[] = (media.data ?? []).map((m) => ({
      platform: 'instagram' as const,
      handle: username,
      text: m.caption || '',
      // Videos expose a poster via thumbnail_url; photos use media_url.
      image: m.media_type === 'VIDEO' ? m.thumbnail_url || m.media_url : m.media_url,
      url: m.permalink || `https://instagram.com/${profile.username ?? ''}`,
      likes: m.like_count ?? 0,
      comments: m.comments_count ?? 0,
      publishedAt: m.timestamp || new Date(0).toISOString(),
    }));

    return {
      posts,
      channel: {
        key: 'instagram',
        label: username,
        followers: profile.followers_count ?? 0,
        href: profile.username
          ? `https://instagram.com/${profile.username}`
          : 'https://instagram.com',
      },
    };
  }
}
