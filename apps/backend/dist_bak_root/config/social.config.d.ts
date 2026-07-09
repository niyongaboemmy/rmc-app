declare const _default: (() => {
    enabled: boolean;
    pollMinutes: number;
    maxPosts: number;
    metaGraphVersion: string;
    youtube: {
        apiKey: string;
        channelId: string;
    };
    facebook: {
        pageId: string;
        token: string;
    };
    instagram: {
        userId: string;
        token: string;
    };
    twitter: {
        bearer: string;
        userId: string;
        username: string;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    enabled: boolean;
    pollMinutes: number;
    maxPosts: number;
    metaGraphVersion: string;
    youtube: {
        apiKey: string;
        channelId: string;
    };
    facebook: {
        pageId: string;
        token: string;
    };
    instagram: {
        userId: string;
        token: string;
    };
    twitter: {
        bearer: string;
        userId: string;
        username: string;
    };
}>;
export default _default;
