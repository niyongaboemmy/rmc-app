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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const http_util_1 = require("./http.util");
let InstagramProvider = class InstagramProvider {
    constructor(config) {
        this.config = config;
        this.platform = 'instagram';
    }
    get cfg() {
        return {
            userId: this.config.get('social.instagram.userId', ''),
            token: this.config.get('social.instagram.token', ''),
            version: this.config.get('social.metaGraphVersion', 'v21.0'),
        };
    }
    isConfigured() {
        const { userId, token } = this.cfg;
        return Boolean(userId && token);
    }
    async fetch(maxPosts) {
        const { userId, token, version } = this.cfg;
        const base = `https://graph.facebook.com/${version}`;
        const fields = 'caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
        const media = await (0, http_util_1.fetchJson)(`${base}/${userId}/media?fields=${encodeURIComponent(fields)}&limit=${maxPosts}&access_token=${encodeURIComponent(token)}`);
        let profile = {};
        try {
            profile = await (0, http_util_1.fetchJson)(`${base}/${userId}?fields=username,followers_count&access_token=${encodeURIComponent(token)}`);
        }
        catch {
        }
        const username = profile.username ? `@${profile.username}` : 'Instagram';
        const posts = (media.data ?? []).map((m) => ({
            platform: 'instagram',
            handle: username,
            text: m.caption || '',
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
};
exports.InstagramProvider = InstagramProvider;
exports.InstagramProvider = InstagramProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], InstagramProvider);
//# sourceMappingURL=instagram.provider.js.map