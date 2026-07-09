import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContentModule } from '../content/content.module';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { YoutubeProvider } from './providers/youtube.provider';
import { FacebookProvider } from './providers/facebook.provider';
import { InstagramProvider } from './providers/instagram.provider';
import { TwitterProvider } from './providers/twitter.provider';

@Module({
  imports: [ConfigModule, ContentModule],
  providers: [SocialService, YoutubeProvider, FacebookProvider, InstagramProvider, TwitterProvider],
  controllers: [SocialController],
  exports: [SocialService],
})
export class SocialModule {}
