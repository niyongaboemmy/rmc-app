import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { ContentStatus, DawahCourse } from './entities/dawah-course.entity';
import { DawahCourseLesson } from './entities/dawah-course-lesson.entity';
import { DawahCourseEnrollment } from './entities/dawah-course-enrollment.entity';
import { DawahLessonCompletion } from './entities/dawah-lesson-completion.entity';

/**
 * A member's view of their own progress in one course. Returned by every
 * progress write and by the read the detail page makes when a member opens a
 * course. `enrolled` is false for a signed-in member who has completed nothing
 * yet — there is no enrolment row until the first completion.
 */
export interface CourseProgress {
  enrolled: boolean;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  completedAt: Date | null;
  /** Lesson ids the member has completed — drives the per-lesson ticks. */
  completedLessonIds: string[];
}

/**
 * Enrolment and per-lesson progress — the LMS layer over the course catalogue.
 *
 * There is no "Enroll" button: a member is AUTO-ENROLLED the first time they
 * mark any lesson complete. `dawah_lesson_completions` is the source of truth;
 * `dawah_course_enrollments` carries the denormalised roll-up. Both the
 * enrolment roll-up and the course's `enrollment_count` are kept correct by the
 * same recompute-don't-drift discipline the lesson_count uses
 * (DawahCourseService.syncLessonCount) — the roll-up is recomputed from the
 * completions table on every write, never blindly incremented.
 *
 * `enrollment_count` is the one exception, and deliberately: it changes only
 * when a brand-new enrolment row appears, so it is incremented exactly there,
 * guarded by an ON CONFLICT DO NOTHING insert that lets only the transaction
 * that actually created the row do the increment (race-safe under two
 * concurrent first-completions).
 */
@Injectable()
export class DawahEnrollmentService {
  constructor(
    @InjectRepository(DawahCourse)
    private readonly courses: Repository<DawahCourse>,
    @InjectRepository(DawahCourseLesson)
    private readonly lessons: Repository<DawahCourseLesson>,
    @InjectRepository(DawahCourseEnrollment)
    private readonly enrollments: Repository<DawahCourseEnrollment>,
    @InjectRepository(DawahLessonCompletion)
    private readonly completions: Repository<DawahLessonCompletion>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Resolve the lesson and its published course, or 404. Progress is only ever
   * tracked against a lesson that (a) exists and (b) belongs to a PUBLISHED
   * course — the same visibility gate the public detail page enforces, so a
   * member cannot accrue progress against a draft by guessing a lesson id.
   */
  private async resolveLesson(
    lessonId: string,
  ): Promise<{ lesson: DawahCourseLesson; course: DawahCourse }> {
    const lesson = await this.lessons.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const course = await this.courses.findOne({
      where: { id: lesson.courseId, status: ContentStatus.PUBLISHED },
    });
    if (!course) throw new NotFoundException('Course not found');

    return { lesson, course };
  }

  /**
   * Recompute the enrolment roll-up for (user, course) from the completions
   * table and persist it. `lessonCount` is the course's denormalised count, the
   * progress denominator. Returns the fresh roll-up. Assumes an enrolment row
   * already exists.
   */
  private async recomputeEnrollment(
    manager: EntityManager,
    courseId: string,
    userId: string,
    lessonCount: number,
  ): Promise<DawahCourseEnrollment> {
    const completed = await manager.count(DawahLessonCompletion, {
      where: { courseId, userId },
    });

    const percent =
      lessonCount > 0 ? Math.min(100, Math.round((completed / lessonCount) * 100)) : 0;
    // "Complete" needs at least one lesson to exist — an empty course is never
    // 100%. completed >= lessonCount (not ===) is defensive: a lesson deleted
    // after completion can leave completed transiently above the count.
    const isComplete = lessonCount > 0 && completed >= lessonCount;

    const enrollment = await manager.findOneOrFail(DawahCourseEnrollment, {
      where: { courseId, userId },
    });
    enrollment.completedLessons = Math.min(completed, lessonCount);
    enrollment.progressPercent = percent;
    enrollment.lastActivityAt = new Date();
    // Sticky until re-earned: keep the original completion date on subsequent
    // writes, clear it only when the course drops back below 100%.
    if (isComplete) {
      enrollment.completedAt = enrollment.completedAt ?? new Date();
    } else {
      enrollment.completedAt = null;
    }
    return manager.save(enrollment);
  }

  /**
   * Mark a lesson complete for a member. Idempotent — a repeated call inserts
   * nothing and just returns current progress. Auto-enrols on the first
   * completion.
   */
  async markComplete(userId: string, lessonId: string): Promise<CourseProgress> {
    const { course } = await this.resolveLesson(lessonId);

    await this.dataSource.transaction(async (manager) => {
      // Auto-enrol: create the enrolment row iff absent, and only then bump the
      // course's learner count. ON CONFLICT makes the pair race-safe.
      const inserted: Array<{ id: string }> = await manager.query(
        `INSERT INTO "dawah_course_enrollments" ("course_id", "user_id")
         VALUES ($1, $2)
         ON CONFLICT ("course_id", "user_id") DO NOTHING
         RETURNING "id"`,
        [course.id, userId],
      );
      if (inserted.length > 0) {
        await manager.increment(DawahCourse, { id: course.id }, 'enrollmentCount', 1);
      }

      // Record the completion (idempotent).
      await manager.query(
        `INSERT INTO "dawah_lesson_completions" ("user_id", "lesson_id", "course_id")
         VALUES ($1, $2, $3)
         ON CONFLICT ("user_id", "lesson_id") DO NOTHING`,
        [userId, lessonId, course.id],
      );

      await this.recomputeEnrollment(manager, course.id, userId, course.lessonCount);
    });

    return this.getProgress(userId, course.id);
  }

  /**
   * Un-mark a lesson. Deletes the completion and recomputes progress; the
   * enrolment row and the course's learner count STAY — enrolment is sticky,
   * only progress moves.
   */
  async unmarkComplete(userId: string, lessonId: string): Promise<CourseProgress> {
    const { course } = await this.resolveLesson(lessonId);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(DawahLessonCompletion, { userId, lessonId });
      // No enrolment row means nothing to recompute (un-completing something you
      // never completed) — the delete above was already a no-op.
      const enrolled = await manager.exists(DawahCourseEnrollment, {
        where: { courseId: course.id, userId },
      });
      if (enrolled) {
        await this.recomputeEnrollment(manager, course.id, userId, course.lessonCount);
      }
    });

    return this.getProgress(userId, course.id);
  }

  /**
   * A member's progress in a course, by course id. Cheap: one enrolment row plus
   * the member's completed lesson ids. Safe to call for a member with no
   * enrolment — returns the empty (not-enrolled) shape.
   */
  async getProgress(userId: string, courseId: string): Promise<CourseProgress> {
    const [enrollment, completions, course] = await Promise.all([
      this.enrollments.findOne({ where: { courseId, userId } }),
      this.completions.find({ where: { courseId, userId }, select: { lessonId: true } }),
      this.courses.findOne({ where: { id: courseId }, select: { id: true, lessonCount: true } }),
    ]);

    return {
      enrolled: !!enrollment,
      completedLessons: enrollment?.completedLessons ?? 0,
      totalLessons: course?.lessonCount ?? 0,
      progressPercent: enrollment?.progressPercent ?? 0,
      completedAt: enrollment?.completedAt ?? null,
      completedLessonIds: completions.map((c) => c.lessonId),
    };
  }
}
