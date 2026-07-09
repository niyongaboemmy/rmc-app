import { ConfigService } from '@nestjs/config';
import { ProviderResult, SocialProvider } from '../social.types';
export declare class FacebookProvider implements SocialProvider {
    private readonly config;
    readonly platform: "facebook";
    constructor(config: ConfigService);
    private get cfg();
    isConfigured(): boolean;
    fetch(maxPosts: number): Promise<ProviderResult>;
}
