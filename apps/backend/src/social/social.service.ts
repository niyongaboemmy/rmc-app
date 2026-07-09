import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { InjectRedis } from '../common/decorators/inject-redis.decorator';
import { ContentService } from '../content/content.service';
import { YoutubeProvider } from './providers/youtube.provider';
import { FacebookProvider } from './providers/facebook.provider';
import { InstagramProvider } from './providers/instagram.provider';
import { TwitterProvider } from './providers/twitter.provider';
import { NormalizedChannel, NormalizedPost, SocialFeed, SocialProvider } from './social.types';

const CACHE_KEY = 'social:feed';
// Cache TTL is generous so a transient Redis/API blip never empties the feed;
// the in-process poll keeps it fresh well before this expires.
const CACHE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Aggregates the latest posts from every configured social platform into a
 * single feed, refreshed on a background interval and cached (Redis + memory).
 *
 * Reads are served from cache so the public landing page never blocks on a
 * third-party API. A platform with missing credentials is skipped; a platform
 * that errors is logged and omitted from that refresh (last good cache stays).
 */
@Injectable()
export class SocialService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialService.name);
  private readonly providers: SocialProvider[];
  private timer: NodeJS.Timeout | null = null;
  /** In-process fallback if Redis is unavailable. */
  private memoryFeed: SocialFeed | null = null;
  private refreshing = false;

  constructor(
    private readonly config: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    private readonly content: ContentService,
    private readonly youtube: YoutubeProvider,
    facebook: FacebookProvider,
    instagram: InstagramProvider,
    twitter: TwitterProvider,
  ) {
    this.providers = [this.youtube, facebook, instagram, twitter];
  }

  /**
   * Apply admin-managed overrides from the Social CMS (key: "social-media")
   * before a refresh — currently the YouTube channel that drives the featured
   * video, derived from that channel's link. Falls back to env when unset.
   */
  private async applyContentOverrides(): Promise<void> {
    try {
      const social = await this.content.getByKey('social-media');
      const channels = (social?.channels ?? []) as Array<{ key?: string; href?: string }>;
      const yt = channels.find((c) => c.key === 'youtube');
      this.youtube.setChannel(yt?.href);
    } catch (err) {
      this.logger.warn(`Social content overrides unavailable: ${(err as Error).message}`);
    }
  }

  onModuleInit(): void {
    if (!this.config.get<boolean>('social.enabled', true)) {
      this.logger.log('Social feed disabled (SOCIAL_FEED_ENABLED=false).');
      return;
    }
    const active = this.providers.filter((p) => p.isConfigured());
    if (active.length === 0) {
      this.logger.log(
        'Social feed: no platforms configured — section falls back to admin content.',
      );
      return;
    }
    this.logger.log(
      `Social feed: polling ${active.map((p) => p.platform).join(', ')} every ` +
        `${this.config.get<number>('social.pollMinutes', 15)}m.`,
    );

    // Kick off an initial refresh without blocking startup, then poll.
    void this.refresh();
    const intervalMs = this.config.get<number>('social.pollMinutes', 15) * 60 * 1000;
    this.timer = setInterval(() => void this.refresh(), intervalMs);
    // Don't keep the event loop alive solely for the poller.
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Public read — cached feed (Redis → memory → empty). */
  async getFeed(): Promise<SocialFeed> {
    // Never block the public feed on Redis: only read when the connection is
    // actually ready, and even then guard with a short timeout. Falls back to
    // the in-process feed (kept fresh by the poller) when Redis is down/slow.
    if (this.redis.status === 'ready') {
      try {
        const raw = await this.withTimeout(this.redis.get(CACHE_KEY), 1500);
        if (raw) return JSON.parse(raw) as SocialFeed;
      } catch (err) {
        this.logger.warn(`Redis read skipped, using memory feed: ${(err as Error).message}`);
      }
    }
    return this.memoryFeed ?? this.emptyFeed();
  }

  /** Reject after `ms` so a hung Redis op never stalls a request/poll. */
  private withTimeout<T>(op: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      op,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`redis timeout (${ms}ms)`)), ms),
      ),
    ]);
  }

  /**
   * Refresh from every configured platform, merge newest-first, and cache.
   * Returns the freshly built feed. Concurrency-guarded so overlapping polls
   * (interval + manual trigger) don't double-fetch.
   */
  async refresh(): Promise<SocialFeed> {
    if (this.refreshing) return this.getFeed();
    this.refreshing = true;
    try {
      await this.applyContentOverrides();
      const active = this.providers.filter((p) => p.isConfigured());
      const maxPosts = this.config.get<number>('social.maxPosts', 12);

      const results = await Promise.allSettled(active.map((p) => p.fetch(maxPosts)));

      const posts: NormalizedPost[] = [];
      const channels: NormalizedChannel[] = [];
      results.forEach((r, i) => {
        const platform = active[i].platform;
        if (r.status === 'fulfilled') {
          posts.push(...r.value.posts);
          if (r.value.channel) channels.push(r.value.channel);
        } else {
          this.logger.warn(`Refresh failed for ${platform}: ${r.reason?.message ?? r.reason}`);
        }
      });

      posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      const feed: SocialFeed = {
        posts: posts.slice(0, maxPosts),
        channels,
        fetchedAt: new Date().toISOString(),
        configured: active.length > 0,
      };

      this.memoryFeed = feed;
      if (this.redis.status === 'ready') {
        try {
          await this.withTimeout(
            this.redis.set(CACHE_KEY, JSON.stringify(feed), 'EX', CACHE_TTL_SECONDS),
            1500,
          );
        } catch (err) {
          this.logger.warn(`Redis write failed (memory cache kept): ${(err as Error).message}`);
        }
      }
      this.logger.log(
        `Social feed refreshed: ${feed.posts.length} posts from ${channels.length} platform(s).`,
      );
      return feed;
    } finally {
      this.refreshing = false;
    }
  }

  private emptyFeed(): SocialFeed {
    const active = this.providers.some((p) => p.isConfigured());
    return { posts: [], channels: [], fetchedAt: null, configured: active };
  }
}
