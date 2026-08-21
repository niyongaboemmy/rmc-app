import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DawahCourse } from './dawah-course.entity';

/**
 * What a lesson actually contains. Only `text` is reachable today — the admin
 * UI writes nothing else. `video` / `audio` / `pdf` / `link` are the deferred
 * media resources (plan §4.3): shipping the value now means Phase 7 adds a
 * player component, not a migration and an API version bump.
 * Mirrored by CHK_dawah_lesson_content_type.
 */
export enum LessonContentType {
  TEXT = 'text',
  VIDEO = 'video',
  AUDIO = 'audio',
  PDF = 'pdf',
  LINK = 'link',
}

/**
 * One entry in a course's outline. Lessons are ordered within their course and
 * die with it (ON DELETE CASCADE) — they have no life of their own.
 *
 * No soft delete here, unlike its parent: a removed lesson is a mistake being
 * corrected while a course is still being built, not a record anyone will want
 * to audit. The course above it keeps `deleted_at`.
 */
// Composite, and declared at class level for that reason: every read of this
// table is "the lessons of course X, in outline order", which this index serves
// end-to-end. A property-level @Index on courseId would claim the same NAME for
// a single-column index and quietly contradict the migration.
@Index('IDX_dawah_course_lessons_course_sort', ['courseId', 'sortOrder'])
@Entity('dawah_course_lessons')
export class DawahCourseLesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => DawahCourse, (course) => course.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course?: DawahCourse;

  @Column({ name: 'title_en', type: 'varchar', length: 160 })
  titleEn: string;

  @Column({ name: 'title_rw', type: 'varchar', length: 160, default: '' })
  titleRw: string;

  @Column({ name: 'title_ar', type: 'varchar', length: 160, default: '' })
  titleAr: string;

  /** One-line description shown in the collapsed outline accordion. */
  @Column({ name: 'summary_en', type: 'text', default: '' })
  summaryEn: string;

  @Column({ name: 'summary_rw', type: 'text', default: '' })
  summaryRw: string;

  @Column({ name: 'summary_ar', type: 'text', default: '' })
  summaryAr: string;

  /** Rich HTML — the lesson itself, for `text` lessons. */
  @Column({ name: 'body_en', type: 'text', default: '' })
  bodyEn: string;

  @Column({ name: 'body_rw', type: 'text', default: '' })
  bodyRw: string;

  @Column({ name: 'body_ar', type: 'text', default: '' })
  bodyAr: string;

  @Column({ name: 'content_type', type: 'varchar', length: 20, default: LessonContentType.TEXT })
  contentType: LessonContentType;

  /**
   * DEFERRED — Phase 7. file-server key for a hosted video / audio / PDF.
   * Nothing writes this yet; it stays null. Deliberate, do not remove (§4.3).
   */
  @Column({ name: 'media_key', type: 'varchar', length: 500, nullable: true })
  mediaKey: string | null;

  /**
   * DEFERRED — Phase 7. External media URL (YouTube and the like), the
   * alternative to hosting the bytes ourselves. Also null today.
   */
  @Column({ name: 'media_url', type: 'varchar', length: 500, nullable: true })
  mediaUrl: string | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  /** Position in the outline. Maintained by the reorder endpoint. */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
