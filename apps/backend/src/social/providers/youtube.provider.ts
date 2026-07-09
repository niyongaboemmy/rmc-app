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
  /** Admin override (channel URL / @handle / UC… id) from the Social CMS. */
  private channelOverride = '';
  /** Cache of a resolved handle/URL → UC… id, to avoid re-fetching each poll. */
  private resolvedCache = new Map<string, string>();

  constructor(private readonly config: ConfigService) {}

  /** Set/clear the admin-configured channel (raw link, @handle, or UC id). */
  setChannel(raw?: string): void {
    const v = (raw || '').trim();
    this.channelOverride = v && v !== '#' ? v : '';
  }

  private get cfg() {
    return {
      apiKey: this.config.get<string>('social.youtube.apiKey', ''),
      // Env id is the fallback when no admin override is set.
      channelId: this.config.get<string>('social.youtube.channelId', ''),
    };
  }

  isConfigured(): boolean {
    // A channel id alone is enough — without an API key we use the free,
    // key-less RSS feed (no likes/comments/subscriber counts).
    return Boolean(this.channelOverride || this.cfg.channelId);
  }

  async fetch(maxPosts: number): Promise<ProviderResult> {
    const { apiKey } = this.cfg;
    const channelId = (await this.resolveChannelId()) || this.cfg.channelId;
    if (!channelId) return { posts: [], channel: null };

    // No API key → use the official channel RSS feed (free, no quota/key).
    if (!apiKey) return this.fetchViaRss(channelId, maxPosts);

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

  /**
   * Resolve the admin override to a UC… channel id. Accepts a raw id, a
   * `/channel/UC…` URL, or a `@handle` / custom URL (resolved by scraping the
   * channel page once, then cached). Returns '' when there is no override.
   */
  private async resolveChannelId(): Promise<string> {
    const input = this.channelOverride;
    if (!input) return '';
    if (this.resolvedCache.has(input)) return this.resolvedCache.get(input)!;

    const direct =
      input.match(/channel\/(UC[\w-]{20,})/)?.[1] || (/^UC[\w-]{20,}$/.test(input) ? input : '');
    if (direct) {
      this.resolvedCache.set(input, direct);
      return direct;
    }

    // Handle / custom URL → fetch the channel page and extract its id.
    const pageUrl = input.startsWith('http')
      ? input
      : `https://www.youtube.com/${input.startsWith('@') ? input : '@' + input}`;
    try {
      const res = await fetch(pageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' },
      });
      if (res.ok) {
        const html = await res.text();
        const id =
          html.match(/"externalId":"(UC[\w-]{20,})"/)?.[1] ||
          html.match(/"channelId":"(UC[\w-]{20,})"/)?.[1] ||
          html.match(/channel\/(UC[\w-]{20,})/)?.[1] ||
          '';
        if (id) {
          this.resolvedCache.set(input, id);
          return id;
        }
      }
      this.logger.warn(`YouTube: could not resolve channel id from "${input}".`);
    } catch (err) {
      this.logger.warn(`YouTube channel resolve failed: ${(err as Error).message}`);
    }
    return '';
  }

  /**
   * Key-less path: the channel's official Atom feed
   * (youtube.com/feeds/videos.xml?channel_id=…). Free and unauthenticated, but
   * it carries no engagement stats or subscriber count.
   */
  private async fetchViaRss(channelId: string, maxPosts: number): Promise<ProviderResult> {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (!res.ok) throw new Error(`YouTube RSS responded ${res.status}`);
    const xml = await res.text();

    // Channel title is the first <title> (before any <entry>).
    const head = xml.split('<entry>')[0];
    const channelTitle = decodeXml(head.match(/<title>([\s\S]*?)<\/title>/)?.[1]) || 'YouTube';

    const entries = xml.split('<entry>').slice(1);
    const posts: NormalizedPost[] = entries
      .slice(0, maxPosts)
      .map((e) => {
        const videoId = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? '';
        return {
          platform: 'youtube' as const,
          handle:
            decodeXml(e.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/)?.[1]) || channelTitle,
          text: decodeXml(e.match(/<title>([\s\S]*?)<\/title>/)?.[1]),
          image: e.match(/<media:thumbnail\s+url="([^"]+)"/)?.[1],
          url: `https://www.youtube.com/watch?v=${videoId}`,
          likes: 0,
          comments: 0,
          publishedAt: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? new Date(0).toISOString(),
        };
      })
      .filter((p) => p.url.endsWith('=') === false);

    return {
      posts,
      channel: {
        key: 'youtube',
        label: channelTitle,
        // RSS has no subscriber count — scrape it from the channel page (free).
        followers: await this.fetchSubscriberCount(channelId),
        href: `https://www.youtube.com/channel/${channelId}`,
      },
    };
  }

  /**
   * Best-effort live subscriber count for the key-less path. YouTube embeds an
   * approximate count ("386 subscribers", "12.3K subscribers") in the channel
   * page; we parse it. Returns 0 on any failure (count then simply hidden).
   */
  private async fetchSubscriberCount(channelId: string): Promise<number> {
    try {
      const res = await fetch(`https://www.youtube.com/channel/${channelId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' },
      });
      if (!res.ok) return 0;
      const html = await res.text();
      const raw =
        html.match(/"content":"([\d.,]+[KMB]?)\s+subscribers?"/i)?.[1] ||
        html.match(/([\d.,]+[KMB]?)\s+subscribers?/i)?.[1];
      return raw ? parseAbbreviatedCount(raw) : 0;
    } catch (err) {
      this.logger.warn(`YouTube subscriber count unavailable: ${(err as Error).message}`);
      return 0;
    }
  }
}

/** "386" → 386, "12.3K" → 12300, "1.2M" → 1200000, "3B" → 3000000000. */
function parseAbbreviatedCount(raw: string): number {
  const m = raw.replace(/,/g, '').match(/^([\d.]+)\s*([KMB])?$/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] ?? 1;
  return Math.round(n * mult);
}

/** Decode the handful of XML entities YouTube's feed uses. */
function decodeXml(s?: string): string {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .trim();
}
