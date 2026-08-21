import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DawahCourse } from './dawah-course.entity';
import { User } from '../../users/entities/user.entity';

/**
 * One member's enrolment in one course, with the DENORMALISED progress roll-up.
 *
 * The row is created lazily — a member is auto-enrolled the first time they mark
 * any lesson complete (there is no "Enroll" button). `completed_lessons` /
 * `progress_percent` / `completed_at` are recomputed from
 * `dawah_lesson_completions` (the source of truth) on every progress write, so
 * the detail page can render a progress bar from one row instead of counting.
 *
 * Enrolment is sticky: un-completing every lesson leaves the row (and the
 * course's enrollment_count) in place — you took the course, the count reflects
 * that. Only progress drops back to 0.
 */
@Unique('UQ_dawah_course_enrollments_one_per_user', ['courseId', 'userId'])
@Entity('dawah_course_enrollments')
export class DawahCourseEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_dawah_course_enrollments_course')
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => DawahCourse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course?: DawahCourse;

  @Index('IDX_dawah_course_enrollments_user')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /** Count of the user's completed lessons in this course. Recomputed on write. */
  @Column({ name: 'completed_lessons', type: 'int', default: 0 })
  completedLessons: number;

  /** 0–100, = round(completed_lessons / course.lesson_count * 100). */
  @Column({ name: 'progress_percent', type: 'int', default: 0 })
  progressPercent: number;

  @Column({ name: 'last_activity_at', type: 'timestamptz', default: () => 'now()' })
  lastActivityAt: Date;

  /** Set when progress first reaches 100%; cleared if a lesson is later un-completed. */
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
