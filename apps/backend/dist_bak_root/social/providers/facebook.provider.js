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
exports.FacebookProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const http_util_1 = require("./http.util");
let FacebookProvider = class FacebookProvider {
    constructor(config) {
        this.config = config;
        this.platform = 'facebook';
    }
    get cfg() {
        return {
            pageId: this.config.get('social.facebook.pageId', ''),
            token: this.config.get('social.facebook.token', ''),
            version: this.config.get('social.metaGraphVersion', 'v21.0'),
        };
    }
    isConfigured() {
        const { pageId, token } = this.cfg;
        return Boolean(pageId && token);
    }
    async fetch(maxPosts) {
        const { pageId, token, version } = this.cfg;
        const base = `https://graph.facebook.com/${version}`;
        const fields = 'message,story,full_picture,permalink_url,created_time,' +
            'likes.summary(true).limit(0),comments.summary(true).limit(0)';
        const feed = await (0, http_util_1.fetchJson)(`${base}/${pageId}/posts?fields=${encodeURIComponent(fields)}&limit=${maxPosts}&access_token=${encodeURIComponent(token)}`);
        let page = {};
        try {
            page = await (0, http_util_1.fetchJson)(`${base}/${pageId}?fields=name,followers_count,fan_count,link&access_token=${encodeURIComponent(token)}`);
        }
        catch {
        }
        const handle = page.name || 'Facebook';
        const posts = (feed.data ?? [])
            .filter((p) => p.message || p.story || p.full_picture)
            .map((p) => ({
            platform: 'facebook',
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
};
exports.FacebookProvider = FacebookProvider;
exports.FacebookProvider = FacebookProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FacebookProvider);
//# sourceMappingURL=facebook.provider.js.map