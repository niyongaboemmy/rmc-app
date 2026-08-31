import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DawahCategory } from './entities/dawah-category.entity';
import { DawahCourse } from './entities/dawah-course.entity';
import { DawahCourseLesson } from './entities/dawah-course-lesson.entity';
import { DawahCourseEnrollment } from './entities/dawah-course-enrollment.entity';
import { DawahLessonCompletion } from './entities/dawah-lesson-completion.entity';
import { DawahBook } from './entities/dawah-book.entity';
import { DawahQuestion } from './entities/dawah-question.entity';
import { DawahQuestionRating } from './entities/dawah-question-rating.entity';
import { DawahModerationLog } from './entities/dawah-moderation-log.entity';
import { DawahCategoryService } from './dawah-category.service';
import { DawahCourseService } from './dawah-course.service';
import { DawahEnrollmentService } from './dawah-enrollment.service';
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
      DawahCategory,
      DawahCourse,
      DawahCourseLesson,
      DawahBook,
      DawahCourseEnrollment,
      DawahLessonCompletion,
      // Discussions. RMC writes both halves of an entry, so the question, its rating and
      // the moderation trail are the whole model — the answers/votes/reports tables of
      // the old community-forum design are gone (migration 064).
      DawahQuestion,
      DawahModerationLog,
      DawahQuestionRating,
    ]),
    PublicUploadModule,
    EmailModule,
    JwtModule.register({}),
  ],
  providers: [
    DawahCategoryService,
    DawahCourseService,
    DawahEnrollmentService,
    DawahBookService,
    DawahDiscussionsService,
    OptionalCallerService,
  ],
  controllers: [DawahController, DawahAdminController],
  exports: [DawahCategoryService, DawahCourseService, DawahBookService, DawahDiscussionsService],
})
export class DawahModule {}
