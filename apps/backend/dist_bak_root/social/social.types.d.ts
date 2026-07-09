export type SocialPlatform = 'facebook' | 'twitter' | 'instagram' | 'youtube';
export interface NormalizedPost {
    platform: SocialPlatform;
    handle: string;
    text: string;
    image?: string;
    url: string;
    likes: number;
    comments: number;
    publishedAt: string;
}
export interface NormalizedChannel {
    key: SocialPlatform;
    label: string;
    followers: number;
    href: string;
}
export interface ProviderResult {
    posts: NormalizedPost[];
    channel: NormalizedChannel | null;
}
export interface SocialProvider {
    readonly platform: SocialPlatform;
    isConfigured(): boolean;
    fetch(maxPosts: number): Promise<ProviderResult>;
}
export interface SocialFeed {
    posts: NormalizedPost[];
    channels: NormalizedChannel[];
    fetchedAt: string | null;
    configured: boolean;
}
