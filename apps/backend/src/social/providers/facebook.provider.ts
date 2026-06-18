import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchJson } from './http.util';
import { NormalizedPost, ProviderResult, SocialProvider } from '../social.types';

interface FbPostsResp {
  data?: Array<{
    message?: string;
    story?: string;
    full_picture?: string;
    permalink_url?: string;
    created_time?: string;
    likes?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
  }>;
}
interface FbPageResp {
  name?: string;
  followers_count?: number;
  fan_count?: number;
  link?: string;
}

/**
 * Pulls a Facebook Page's recent posts via the Graph API.
 * Requires a Page id + a long-lived Page access token.
 */
@Injectable()
export class FacebookProvider implements SocialProvider {
  readonly platform = 'facebook' as const;

  constructor(private readonly config: ConfigService) {}

  private get cfg() {
    return {
      pageId: this.config.get<string>('social.facebook.pageId', ''),
      token: this.config.get<string>('social.facebook.token', ''),
      version: this.config.get<string>('social.metaGraphVersion', 'v21.0'),
    };
  }

  isConfigured(): boolean {
    const { pageId, token } = this.cfg;
    return Boolean(pageId && token);
  }

  async fetch(maxPosts: number): Promise<ProviderResult> {
    const { pageId, token, version } = this.cfg;
    const base = `https://graph.facebook.com/${version}`;
    const fields =
      'message,story,full_picture,permalink_url,created_time,' +
      'likes.summary(true).limit(0),comments.summary(true).limit(0)';

    const feed = await fetchJson<FbPostsResp>(
      `${base}/${pageId}/posts?fields=${encodeURIComponent(fields)}&limit=${maxPosts}&access_token=${encodeURIComponent(token)}`,
    );

    let page: FbPageResp = {};
    try {
      page = await fetchJson<FbPageResp>(
        `${base}/${pageId}?fields=name,followers_count,fan_count,link&access_token=${encodeURIComponent(token)}`,
      );
    } catch {
      /* page metadata is best-effort */
    }

    const handle = page.name || 'Facebook';
    const posts: NormalizedPost[] = (feed.data ?? [])
      .filter((p) => p.message || p.story || p.full_picture)
      .map((p) => ({
        platform: 'facebook' as const,
        handle,
        text: p.message || p.story || '',
        image: p.full_picture,
        url: p.permalink_url || page.link || `https://facebook.com/${pageId}`,
        likes: p.likes?.summary?.total_count ?? 0,
        comments: p.comments?.summary?.total_count ?? 0,
        publishedAt: p.created_time || new Date(0).toISOString(),
      }));

    return {
      posts,
      channel: {
        key: 'facebook',
        label: handle,
        followers: page.followers_count ?? page.fan_count ?? 0,
        href: page.link || `https://facebook.com/${pageId}`,
      },
    };
  }
}
