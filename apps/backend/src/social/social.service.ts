import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { InjectRedis } from '../common/decorators/inject-redis.decorator';
import { YoutubeProvider } from './providers/youtube.provider';
import { FacebookProvider } from './providers/facebook.provider';
import { InstagramProvider } from './providers/instagram.provider';
import { TwitterProvider } from './providers/twitter.provider';
import {
  NormalizedChannel,
  NormalizedPost,
  SocialFeed,
  SocialProvider,
} from './social.types';

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
    youtube: YoutubeProvider,
    facebook: FacebookProvider,
    instagram: InstagramProvider,
    twitter: TwitterProvider,
  ) {
    this.providers = [youtube, facebook, instagram, twitter];
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
    const intervalMs =
      this.config.get<number>('social.pollMinutes', 15) * 60 * 1000;
    this.timer = setInterval(() => void this.refresh(), intervalMs);
    // Don't keep the event loop alive solely for the poller.
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Public read — cached feed (Redis → memory → empty). */
  async getFeed(): Promise<SocialFeed> {
    try {
      const raw = await this.redis.get(CACHE_KEY);
      if (raw) return JSON.parse(raw) as SocialFeed;
    } catch (err) {
      this.logger.warn(`Redis read failed, using memory feed: ${(err as Error).message}`);
    }
    return this.memoryFeed ?? this.emptyFeed();
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
      const active = this.providers.filter((p) => p.isConfigured());
      const maxPosts = this.config.get<number>('social.maxPosts', 12);

      const results = await Promise.allSettled(
        active.map((p) => p.fetch(maxPosts)),
      );

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

      posts.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );

      const feed: SocialFeed = {
        posts: posts.slice(0, maxPosts),
        channels,
        fetchedAt: new Date().toISOString(),
        configured: active.length > 0,
      };

      this.memoryFeed = feed;
      try {
        await this.redis.set(CACHE_KEY, JSON.stringify(feed), 'EX', CACHE_TTL_SECONDS);
      } catch (err) {
        this.logger.warn(`Redis write failed (memory cache kept): ${(err as Error).message}`);
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
