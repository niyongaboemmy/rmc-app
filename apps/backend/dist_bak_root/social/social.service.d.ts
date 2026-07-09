import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ContentService } from '../content/content.service';
import { YoutubeProvider } from './providers/youtube.provider';
import { FacebookProvider } from './providers/facebook.provider';
import { InstagramProvider } from './providers/instagram.provider';
import { TwitterProvider } from './providers/twitter.provider';
import { SocialFeed } from './social.types';
export declare class SocialService implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly redis;
    private readonly content;
    private readonly youtube;
    private readonly logger;
    private readonly providers;
    private timer;
    private memoryFeed;
    private refreshing;
    constructor(config: ConfigService, redis: Redis, content: ContentService, youtube: YoutubeProvider, facebook: FacebookProvider, instagram: InstagramProvider, twitter: TwitterProvider);
    private applyContentOverrides;
    onModuleInit(): void;
    onModuleDestroy(): void;
    getFeed(): Promise<SocialFeed>;
    private withTimeout;
    refresh(): Promise<SocialFeed>;
    private emptyFeed;
}
