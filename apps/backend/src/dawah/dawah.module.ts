import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DawahCategory } from './entities/dawah-category.entity';
import { DawahCourse } from './entities/dawah-course.entity';
import { DawahCourseLesson } from './entities/dawah-course-lesson.entity';
import { DawahBook } from './entities/dawah-book.entity';
import { DawahQuestion } from './entities/dawah-question.entity';
import { DawahAnswer } from './entities/dawah-answer.entity';
import { DawahReport } from './entities/dawah-report.entity';
import { DawahModerationLog } from './entities/dawah-moderation-log.entity';
import { DawahVote } from './entities/dawah-vote.entity';
import { DawahCategoryService } from './dawah-category.service';
import { DawahCourseService } from './dawah-course.service';
import { DawahBookService } from './dawah-book.service';
import { DawahDiscussionsService } from './dawah-discussions.service';
import { OptionalCallerService } from './optional-caller.service';
import { DawahController } from './dawah.controller';
import { DawahAdminController } from './dawah-admin.controller';
import { PublicUploadModule } from '../integrations/storage/public-upload.module';
import { EmailModule } from '../integrations/email/email.module';

/**
 * Dawah Learning — the public course catalogue and digital library.
 *
 * PublicUploadModule is imported directly; it is deliberately NOT re-exported
 * by the IntegrationsModule barrel. It carries the file pipeline that stores
 * book PDFs under the protected `dawah-library/` prefix and fetches them back
 * with a service token.
 *
 * JwtModule is here only so OptionalCallerService can VERIFY a bearer token on
 * the @Public() preview/download routes — those need to see an identity when
 * one is offered without demanding one. Nothing here mints tokens.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DawahCategory, DawahCourse, DawahCourseLesson, DawahBook,
      // Discussions. Votes/reports/moderation_log have tables but no entities yet —
      // Phase A reads nothing from them, and an entity for a table nobody queries is
      // dead code that looks like a feature.
      DawahQuestion, DawahAnswer, DawahReport, DawahModerationLog, DawahVote,
    ]),
    PublicUploadModule,
    EmailModule,
    JwtModule.register({}),
  ],
  providers: [
    DawahCategoryService,
    DawahCourseService,
    DawahBookService,
    DawahDiscussionsService,
    OptionalCallerService,
  ],
  controllers: [DawahController, DawahAdminController],
  exports: [DawahCategoryService, DawahCourseService, DawahBookService, DawahDiscussionsService],
})
export class DawahModule {}
