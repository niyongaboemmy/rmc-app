"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SocialService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const inject_redis_decorator_1 = require("../common/decorators/inject-redis.decorator");
const content_service_1 = require("../content/content.service");
const youtube_provider_1 = require("./providers/youtube.provider");
const facebook_provider_1 = require("./providers/facebook.provider");
const instagram_provider_1 = require("./providers/instagram.provider");
const twitter_provider_1 = require("./providers/twitter.provider");
const CACHE_KEY = 'social:feed';
const CACHE_TTL_SECONDS = 24 * 60 * 60;
let SocialService = SocialService_1 = class SocialService {
    constructor(config, redis, content, youtube, facebook, instagram, twitter) {
        this.config = config;
        this.redis = redis;
        this.content = content;
        this.youtube = youtube;
        this.logger = new common_1.Logger(SocialService_1.name);
        this.timer = null;
        this.memoryFeed = null;
        this.refreshing = false;
        this.providers = [this.youtube, facebook, instagram, twitter];
    }
    async applyContentOverrides() {
        try {
            const social = await this.content.getByKey('social-media');
            const channels = (social?.channels ?? []);
            const yt = channels.find((c) => c.key === 'youtube');
            this.youtube.setChannel(yt?.href);
        }
        catch (err) {
            this.logger.warn(`Social content overrides unavailable: ${err.message}`);
        }
    }
    onModuleInit() {
        if (!this.config.get('social.enabled', true)) {
            this.logger.log('Social feed disabled (SOCIAL_FEED_ENABLED=false).');
            return;
        }
        const active = this.providers.filter((p) => p.isConfigured());
        if (active.length === 0) {
            this.logger.log('Social feed: no platforms configured — section falls back to admin content.');
            return;
        }
        this.logger.log(`Social feed: polling ${active.map((p) => p.platform).join(', ')} every ` +
            `${this.config.get('social.pollMinutes', 15)}m.`);
        void this.refresh();
        const intervalMs = this.config.get('social.pollMinutes', 15) * 60 * 1000;
        this.timer = setInterval(() => void this.refresh(), intervalMs);
        this.timer.unref?.();
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async getFeed() {
        if (this.redis.status === 'ready') {
            try {
                const raw = await this.withTimeout(this.redis.get(CACHE_KEY), 1500);
                if (raw)
                    return JSON.parse(raw);
            }
            catch (err) {
                this.logger.warn(`Redis read skipped, using memory feed: ${err.message}`);
            }
        }
        return this.memoryFeed ?? this.emptyFeed();
    }
    withTimeout(op, ms) {
        return Promise.race([
            op,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`redis timeout (${ms}ms)`)), ms)),
        ]);
    }
    async refresh() {
        if (this.refreshing)
            return this.getFeed();
        this.refreshing = true;
        try {
            await this.applyContentOverrides();
            const active = this.providers.filter((p) => p.isConfigured());
            const maxPosts = this.config.get('social.maxPosts', 12);
            const results = await Promise.allSettled(active.map((p) => p.fetch(maxPosts)));
            const posts = [];
            const channels = [];
            results.forEach((r, i) => {
                const platform = active[i].platform;
                if (r.status === 'fulfilled') {
                    posts.push(...r.value.posts);
                    if (r.value.channel)
                        channels.push(r.value.channel);
                }
                else {
                    this.logger.warn(`Refresh failed for ${platform}: ${r.reason?.message ?? r.reason}`);
                }
            });
            posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
            const feed = {
                posts: posts.slice(0, maxPosts),
                channels,
                fetchedAt: new Date().toISOString(),
                configured: active.length > 0,
            };
            this.memoryFeed = feed;
            if (this.redis.status === 'ready') {
                try {
                    await this.withTimeout(this.redis.set(CACHE_KEY, JSON.stringify(feed), 'EX', CACHE_TTL_SECONDS), 1500);
                }
                catch (err) {
                    this.logger.warn(`Redis write failed (memory cache kept): ${err.message}`);
                }
            }
            this.logger.log(`Social feed refreshed: ${feed.posts.length} posts from ${channels.length} platform(s).`);
            return feed;
        }
        finally {
            this.refreshing = false;
        }
    }
    emptyFeed() {
        const active = this.providers.some((p) => p.isConfigured());
        return { posts: [], channels: [], fetchedAt: null, configured: active };
    }
};
exports.SocialService = SocialService;
exports.SocialService = SocialService = SocialService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, inject_redis_decorator_1.InjectRedis)()),
    __metadata("design:paramtypes", [config_1.ConfigService,
        ioredis_1.default,
        content_service_1.ContentService,
        youtube_provider_1.YoutubeProvider,
        facebook_provider_1.FacebookProvider,
        instagram_provider_1.InstagramProvider,
        twitter_provider_1.TwitterProvider])
], SocialService);
//# sourceMappingURL=social.service.js.map