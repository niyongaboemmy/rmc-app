import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DawahCourseLesson } from './dawah-course-lesson.entity';
import { DawahCourse } from './dawah-course.entity';
import { User } from '../../users/entities/user.entity';

/**
 * The source of truth for progress: one row per (user, lesson) the moment that
 * lesson is marked complete. UNIQUE(user_id, lesson_id) makes "mark complete"
 * idempotent — a repeated click inserts nothing.
 *
 * `course_id` is denormalised from the lesson so the service can count a user's
 * completions within a course in one indexed query
 * (IDX_dawah_lesson_completions_course_user) rather than joining through
 * lessons on every progress recompute.
 *
 * Only a created_at-style stamp is kept (`completed_at`); there is nothing to
 * update — the row exists iff the lesson is complete, and un-completing deletes
 * it.
 */
@Unique('UQ_dawah_lesson_completions_one_per_user', ['userId', 'lessonId'])
@Index('IDX_dawah_lesson_completions_course_user', ['courseId', 'userId'])
@Entity('dawah_lesson_completions')
export class DawahLessonCompletion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => DawahCourseLesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson?: DawahCourseLesson;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => DawahCourse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course?: DawahCourse;

  @CreateDateColumn({ name: 'completed_at', type: 'timestamptz' })
  completedAt: Date;
}
