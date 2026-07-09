import { ConfigService } from '@nestjs/config';
import { ProviderResult, SocialProvider } from '../social.types';
export declare class InstagramProvider implements SocialProvider {
    private readonly config;
    readonly platform: "instagram";
    constructor(config: ConfigService);
    private get cfg();
    isConfigured(): boolean;
    fetch(maxPosts: number): Promise<ProviderResult>;
}
