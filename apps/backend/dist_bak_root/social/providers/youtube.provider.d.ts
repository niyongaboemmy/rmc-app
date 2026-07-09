import { ConfigService } from '@nestjs/config';
import { ProviderResult, SocialProvider } from '../social.types';
export declare class YoutubeProvider implements SocialProvider {
    private readonly config;
    readonly platform: "youtube";
    private readonly logger;
    private channelOverride;
    private resolvedCache;
    constructor(config: ConfigService);
    setChannel(raw?: string): void;
    private get cfg();
    isConfigured(): boolean;
    fetch(maxPosts: number): Promise<ProviderResult>;
    private resolveChannelId;
    private fetchViaRss;
    private fetchSubscriberCount;
}
