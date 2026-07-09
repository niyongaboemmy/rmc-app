"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('social', () => ({
    enabled: process.env.SOCIAL_FEED_ENABLED !== 'false',
    pollMinutes: Math.max(1, parseInt(process.env.SOCIAL_FEED_POLL_MINUTES || '15', 10)),
    maxPosts: Math.max(1, parseInt(process.env.SOCIAL_FEED_MAX_POSTS || '12', 10)),
    metaGraphVersion: process.env.META_GRAPH_VERSION || 'v21.0',
    youtube: {
        apiKey: process.env.YOUTUBE_API_KEY || '',
        channelId: process.env.YOUTUBE_CHANNEL_ID || '',
    },
    facebook: {
        pageId: process.env.FACEBOOK_PAGE_ID || '',
        token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
    },
    instagram: {
        userId: process.env.INSTAGRAM_USER_ID || '',
        token: process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
    },
    twitter: {
        bearer: process.env.TWITTER_BEARER_TOKEN || '',
        userId: process.env.TWITTER_USER_ID || '',
        username: (process.env.TWITTER_USERNAME || '').replace(/^@/, ''),
    },
}));
//# sourceMappingURL=social.config.js.map