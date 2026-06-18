import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchJson } from './http.util';
import { NormalizedPost, ProviderResult, SocialProvider } from '../social.types';

const API = 'https://www.googleapis.com/youtube/v3';

interface YtChannelResp {
  items?: Array<{
    snippet?: { title?: string; customUrl?: string };
    statistics?: { subscriberCount?: string };
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
}
interface YtPlaylistResp {
  items?: Array<{
    snippet?: {
      title?: string;
      publishedAt?: string;
      channelTitle?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    contentDetails?: { videoId?: string };
  }>;
}
interface YtVideosResp {
  items?: Array<{
    id?: string;
    statistics?: { likeCount?: string; commentCount?: string };
  }>;
}

/**
 * Pulls a channel's latest uploads via the YouTube Data API v3.
 * Requires only a public API key + the channel id (no OAuth).
 */
@Injectable()
export class YoutubeProvider implements SocialProvider {
  readonly platform = 'youtube' as const;
  private readonly logger = new Logger(YoutubeProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get cfg() {
    return {
      apiKey: this.config.get<string>('social.youtube.apiKey', ''),
      channelId: this.config.get<string>('social.youtube.channelId', ''),
    };
  }

  isConfigured(): boolean {
    const { apiKey, channelId } = this.cfg;
    return Boolean(apiKey && channelId);
  }

  async fetch(maxPosts: number): Promise<ProviderResult> {
    const { apiKey, channelId } = this.cfg;

    // 1. Channel → uploads playlist id, subscriber count, title.
    const channel = await fetchJson<YtChannelResp>(
      `${API}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`,
    );
    const ch = channel.items?.[0];
    const uploads = ch?.contentDetails?.relatedPlaylists?.uploads;
    const title = ch?.snippet?.title || 'YouTube';
    if (!uploads) return { posts: [], channel: null };

    // 2. Latest uploads.
    const playlist = await fetchJson<YtPlaylistResp>(
      `${API}/playlistItems?part=snippet,contentDetails&playlistId=${uploads}&maxResults=${maxPosts}&key=${apiKey}`,
    );
    const items = (playlist.items ?? []).filter((i) => i.contentDetails?.videoId);

    // 3. Per-video like/comment counts (one batched call).
    const ids = items.map((i) => i.contentDetails!.videoId!).join(',');
    const stats = new Map<string, { likes: number; comments: number }>();
    if (ids) {
      try {
        const videos = await fetchJson<YtVideosResp>(
          `${API}/videos?part=statistics&id=${ids}&key=${apiKey}`,
        );
        for (const v of videos.items ?? []) {
          if (v.id) {
            stats.set(v.id, {
              likes: Number(v.statistics?.likeCount ?? 0),
              comments: Number(v.statistics?.commentCount ?? 0),
            });
          }
        }
      } catch (err) {
        this.logger.warn(`YouTube video stats unavailable: ${(err as Error).message}`);
      }
    }

    const posts: NormalizedPost[] = items.map((i) => {
      const videoId = i.contentDetails!.videoId!;
      const t = i.snippet?.thumbnails ?? {};
      const image = t.maxres?.url || t.high?.url || t.medium?.url || t.default?.url;
      const s = stats.get(videoId);
      return {
        platform: 'youtube',
        handle: i.snippet?.channelTitle || title,
        text: i.snippet?.title || '',
        image,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        likes: s?.likes ?? 0,
        comments: s?.comments ?? 0,
        publishedAt: i.snippet?.publishedAt || new Date(0).toISOString(),
      };
    });

    const customUrl = ch?.snippet?.customUrl;
    return {
      posts,
      channel: {
        key: 'youtube',
        label: title,
        followers: Number(ch?.statistics?.subscriberCount ?? 0),
        href: customUrl
          ? `https://www.youtube.com/${customUrl.startsWith('@') ? customUrl : '@' + customUrl}`
          : `https://www.youtube.com/channel/${channelId}`,
      },
    };
  }
}
