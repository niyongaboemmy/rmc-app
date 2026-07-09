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
var TwitterProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const http_util_1 = require("./http.util");
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';
let TwitterProvider = TwitterProvider_1 = class TwitterProvider {
    constructor(config) {
        this.config = config;
        this.platform = 'twitter';
        this.logger = new common_1.Logger(TwitterProvider_1.name);
    }
    get cfg() {
        return {
            bearer: this.config.get('social.twitter.bearer', ''),
            userId: this.config.get('social.twitter.userId', ''),
            username: this.config.get('social.twitter.username', ''),
        };
    }
    isConfigured() {
        const { bearer, userId, username } = this.cfg;
        return Boolean((bearer && userId) || username);
    }
    async fetch(maxPosts) {
        const { bearer, userId, username } = this.cfg;
        if (!bearer && username)
            return this.fetchViaSyndication(username, maxPosts);
        const auth = { Authorization: `Bearer ${bearer}` };
        const limit = Math.min(100, Math.max(5, maxPosts));
        const tweets = await (0, http_util_1.fetchJson)(`https://api.twitter.com/2/users/${userId}/tweets?max_results=${limit}` +
            `&tweet.fields=created_at,public_metrics&expansions=attachments.media_keys` +
            `&media.fields=preview_image_url,url,type`, auth);
        let user = {};
        try {
            user = await (0, http_util_1.fetchJson)(`https://api.twitter.com/2/users/${userId}?user.fields=public_metrics,username,name`, auth);
        }
        catch {
        }
        const apiUsername = user.data?.username;
        const handle = apiUsername ? `@${apiUsername}` : user.data?.name || 'X / Twitter';
        const mediaByKey = new Map();
        for (const m of tweets.includes?.media ?? []) {
            if (m.media_key)
                mediaByKey.set(m.media_key, m);
        }
        const posts = (tweets.data ?? [])
            .filter((t) => t.id)
            .map((t) => {
            const key = t.attachments?.media_keys?.[0];
            const media = key ? mediaByKey.get(key) : undefined;
            return {
                platform: 'twitter',
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
    async fetchViaSyndication(username, maxPosts) {
        const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/` +
            `${encodeURIComponent(username)}?dnt=false&lang=en`;
        let html = '';
        const delays = [0, 2500, 6000];
        for (let attempt = 0; attempt < delays.length; attempt++) {
            if (delays[attempt])
                await new Promise((r) => setTimeout(r, delays[attempt]));
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
        if (!html)
            throw new Error('X syndication rate-limited (429) on all attempts');
        const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
        if (!json)
            throw new Error('X syndication: timeline data not found');
        const data = JSON.parse(json);
        const entries = data.props?.pageProps?.timeline?.entries ?? [];
        let channelUser;
        const posts = [];
        for (const entry of entries) {
            const t = entry.content?.tweet;
            if (!t?.id_str)
                continue;
            channelUser ??= t.user;
            const media = t.extended_entities?.media?.[0] ?? t.entities?.media?.[0];
            const screen = t.user?.screen_name || username;
            posts.push({
                platform: 'twitter',
                handle: t.user?.name || `@${screen}`,
                text: (t.full_text || t.text || '')
                    .replace(/(\s*https:\/\/t\.co\/\S+)+\s*$/, '')
                    .trim(),
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
};
exports.TwitterProvider = TwitterProvider;
exports.TwitterProvider = TwitterProvider = TwitterProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TwitterProvider);
function parseTwitterDate(raw) {
    if (!raw)
        return new Date(0).toISOString();
    const d = new Date(raw);
    return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}
//# sourceMappingURL=twitter.provider.js.map