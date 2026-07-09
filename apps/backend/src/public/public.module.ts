import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerseOfDay } from './entities/verse-of-day.entity';
import { Announcement } from './entities/announcement.entity';
import { BlogPost, BlogCategory } from './entities/blog-post.entity';
import { GalleryItem } from './entities/gallery-item.entity';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerseOfDay, Announcement, BlogPost, BlogCategory, GalleryItem]),
  ],
  providers: [PublicService],
  controllers: [PublicController],
  exports: [PublicService],
})
export class PublicModule {}
