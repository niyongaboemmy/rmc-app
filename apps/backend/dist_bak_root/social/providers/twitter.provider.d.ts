import { ConfigService } from '@nestjs/config';
import { ProviderResult, SocialProvider } from '../social.types';
export declare class TwitterProvider implements SocialProvider {
    private readonly config;
    readonly platform: "twitter";
    private readonly logger;
    constructor(config: ConfigService);
    private get cfg();
    isConfigured(): boolean;
    fetch(maxPosts: number): Promise<ProviderResult>;
    private fetchViaSyndication;
}
