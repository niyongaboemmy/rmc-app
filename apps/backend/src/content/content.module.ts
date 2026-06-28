import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteContent } from './entities/site-content.entity';
import { HistoryEntry } from './entities/history-entry.entity';
import { CommitteeMember } from './entities/committee-member.entity';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SiteContent, HistoryEntry, CommitteeMember])],
  providers: [ContentService],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
