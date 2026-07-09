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
var YoutubeProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const http_util_1 = require("./http.util");
const API = 'https://www.googleapis.com/youtube/v3';
let YoutubeProvider = YoutubeProvider_1 = class YoutubeProvider {
    constructor(config) {
        this.config = config;
        this.platform = 'youtube';
        this.logger = new common_1.Logger(YoutubeProvider_1.name);
        this.channelOverride = '';
        this.resolvedCache = new Map();
    }
    setChannel(raw) {
        const v = (raw || '').trim();
        this.channelOverride = v && v !== '#' ? v : '';
    }
    get cfg() {
        return {
            apiKey: this.config.get('social.youtube.apiKey', ''),
            channelId: this.config.get('social.youtube.channelId', ''),
        };
    }
    isConfigured() {
        return Boolean(this.channelOverride || this.cfg.channelId);
    }
    async fetch(maxPosts) {
        const { apiKey } = this.cfg;
        const channelId = (await this.resolveChannelId()) || this.cfg.channelId;
        if (!channelId)
            return { posts: [], channel: null };
        if (!apiKey)
            return this.fetchViaRss(channelId, maxPosts);
        const channel = await (0, http_util_1.fetchJson)(`${API}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`);
        const ch = channel.items?.[0];
        const uploads = ch?.contentDetails?.relatedPlaylists?.uploads;
        const title = ch?.snippet?.title || 'YouTube';
        if (!uploads)
            return { posts: [], channel: null };
        const playlist = await (0, http_util_1.fetchJson)(`${API}/playlistItems?part=snippet,contentDetails&playlistId=${uploads}&maxResults=${maxPosts}&key=${apiKey}`);
        const items = (playlist.items ?? []).filter((i) => i.contentDetails?.videoId);
        const ids = items.map((i) => i.contentDetails.videoId).join(',');
        const stats = new Map();
        if (ids) {
            try {
                const videos = await (0, http_util_1.fetchJson)(`${API}/videos?part=statistics&id=${ids}&key=${apiKey}`);
                for (const v of videos.items ?? []) {
                    if (v.id) {
                        stats.set(v.id, {
                            likes: Number(v.statistics?.likeCount ?? 0),
                            comments: Number(v.statistics?.commentCount ?? 0),
                        });
                    }
                }
            }
            catch (err) {
                this.logger.warn(`YouTube video stats unavailable: ${err.message}`);
            }
        }
        const posts = items.map((i) => {
            const videoId = i.contentDetails.videoId;
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
    async resolveChannelId() {
        const input = this.channelOverride;
        if (!input)
            return '';
        if (this.resolvedCache.has(input))
            return this.resolvedCache.get(input);
        const direct = input.match(/channel\/(UC[\w-]{20,})/)?.[1] ||
            (/^UC[\w-]{20,}$/.test(input) ? input : '');
        if (direct) {
            this.resolvedCache.set(input, direct);
            return direct;
        }
        const pageUrl = input.startsWith('http')
            ? input
            : `https://www.youtube.com/${input.startsWith('@') ? input : '@' + input}`;
        try {
            const res = await fetch(pageUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' },
            });
            if (res.ok) {
                const html = await res.text();
                const id = html.match(/"externalId":"(UC[\w-]{20,})"/)?.[1] ||
                    html.match(/"channelId":"(UC[\w-]{20,})"/)?.[1] ||
                    html.match(/channel\/(UC[\w-]{20,})/)?.[1] ||
                    '';
                if (id) {
                    this.resolvedCache.set(input, id);
                    return id;
                }
            }
            this.logger.warn(`YouTube: could not resolve channel id from "${input}".`);
        }
        catch (err) {
            this.logger.warn(`YouTube channel resolve failed: ${err.message}`);
        }
        return '';
    }
    async fetchViaRss(channelId, maxPosts) {
        const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
        if (!res.ok)
            throw new Error(`YouTube RSS responded ${res.status}`);
        const xml = await res.text();
        const head = xml.split('<entry>')[0];
        const channelTitle = decodeXml(head.match(/<title>([\s\S]*?)<\/title>/)?.[1]) || 'YouTube';
        const entries = xml.split('<entry>').slice(1);
        const posts = entries.slice(0, maxPosts).map((e) => {
            const videoId = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? '';
            return {
                platform: 'youtube',
                handle: decodeXml(e.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/)?.[1]) || channelTitle,
                text: decodeXml(e.match(/<title>([\s\S]*?)<\/title>/)?.[1]),
                image: e.match(/<media:thumbnail\s+url="([^"]+)"/)?.[1],
                url: `https://www.youtube.com/watch?v=${videoId}`,
                likes: 0,
                comments: 0,
                publishedAt: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? new Date(0).toISOString(),
            };
        }).filter((p) => p.url.endsWith('=') === false);
        return {
            posts,
            channel: {
                key: 'youtube',
                label: channelTitle,
                followers: await this.fetchSubscriberCount(channelId),
                href: `https://www.youtube.com/channel/${channelId}`,
            },
        };
    }
    async fetchSubscriberCount(channelId) {
        try {
            const res = await fetch(`https://www.youtube.com/channel/${channelId}`, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' },
            });
            if (!res.ok)
                return 0;
            const html = await res.text();
            const raw = html.match(/"content":"([\d.,]+[KMB]?)\s+subscribers?"/i)?.[1] ||
                html.match(/([\d.,]+[KMB]?)\s+subscribers?/i)?.[1];
            return raw ? parseAbbreviatedCount(raw) : 0;
        }
        catch (err) {
            this.logger.warn(`YouTube subscriber count unavailable: ${err.message}`);
            return 0;
        }
    }
};
exports.YoutubeProvider = YoutubeProvider;
exports.YoutubeProvider = YoutubeProvider = YoutubeProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], YoutubeProvider);
function parseAbbreviatedCount(raw) {
    const m = raw.replace(/,/g, '').match(/^([\d.]+)\s*([KMB])?$/i);
    if (!m)
        return 0;
    const n = parseFloat(m[1]);
    const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] ?? 1;
    return Math.round(n * mult);
}
function decodeXml(s) {
    if (!s)
        return '';
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .trim();
}
//# sourceMappingURL=youtube.provider.js.map