import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { DawahCategory } from './dawah-category.entity';
import { DawahCourseLesson } from './dawah-course-lesson.entity';

/** How demanding the course is. Mirrored by CHK_dawah_course_level. */
export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

/** How the course is delivered. Mirrored by CHK_dawah_course_format. */
export enum CourseFormat {
  SELF_PACED = 'self_paced',
  IN_PERSON = 'in_person',
  HYBRID = 'hybrid',
}

/**
 * Publish state, shared by courses and books — both are catalogue records with
 * the same draft → published → archived lifecycle, and the public endpoints
 * filter on `published` alone. Mirrored by CHK_dawah_course_status and
 * CHK_dawah_book_status.
 */
export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * The language a course is *taught* in — distinct from the tri-lingual columns,
 * which are translations of the catalogue copy. A course can be described in
 * all three locales but delivered only in Kinyarwanda. 'multi' covers a course
 * taught in more than one. Mirrored by CHK_dawah_course_lang.
 */
export const COURSE_LANGUAGES = ['en', 'rw', 'ar', 'multi'] as const;
export type CourseLanguage = (typeof COURSE_LANGUAGES)[number];

/**
 * A course in the Dawah Learning catalogue. This is a catalogue record, not an
 * LMS course: there is no enrolment, no progress and no fee — see plan §11/§12
 * for where those bolt on. What it does carry is everything the public listing
 * and detail pages need to render and filter without a join per card.
 */
@Entity('dawah_courses')
export class DawahCourse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The public detail route is /dawah/courses/:slug, so this is a URL. */
  @Column({ type: 'varchar', length: 140, unique: true })
  slug: string;

  @Index('IDX_dawah_courses_category')
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => DawahCategory, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: DawahCategory | null;

  @Column({ name: 'title_en', type: 'varchar', length: 160 })
  titleEn: string;

  @Column({ name: 'title_rw', type: 'varchar', length: 160, default: '' })
  titleRw: string;

  @Column({ name: 'title_ar', type: 'varchar', length: 160, default: '' })
  titleAr: string;

  /** Short blurb on the card. Plain text — the rich copy is `description`. */
  @Column({ name: 'summary_en', type: 'varchar', length: 300 })
  summaryEn: string;

  @Column({ name: 'summary_rw', type: 'varchar', length: 300, default: '' })
  summaryRw: string;

  @Column({ name: 'summary_ar', type: 'varchar', length: 300, default: '' })
  summaryAr: string;

  /** Rich HTML from RichTextEditor, rendered on the detail page. */
  @Column({ name: 'description_en', type: 'text', default: '' })
  descriptionEn: string;

  @Column({ name: 'description_rw', type: 'text', default: '' })
  descriptionRw: string;

  @Column({ name: 'description_ar', type: 'text', default: '' })
  descriptionAr: string;

  @Column({ type: 'varchar', length: 20, default: CourseLevel.BEGINNER })
  level: CourseLevel;

  /** Delivery language — see COURSE_LANGUAGES. */
  @Column({ type: 'varchar', length: 20, default: 'en' })
  language: CourseLanguage;

  @Column({ type: 'varchar', length: 20, default: CourseFormat.SELF_PACED })
  format: CourseFormat;

  /** file-server key under the public `dawah-covers/` prefix. */
  @Column({ name: 'cover_image_key', type: 'varchar', length: 500, nullable: true })
  coverImageKey: string | null;

  /**
   * The instructor is stored as flat text, not a user FK: RMC's instructors are
   * named on a card, they do not log in. Giving them accounts is a role and an
   * ownership model (plan §11.3), not a column change.
   */
  @Column({ name: 'instructor_name', type: 'varchar', length: 150, nullable: true })
  instructorName: string | null;

  @Column({ name: 'instructor_title', type: 'varchar', length: 150, nullable: true })
  instructorTitle: string | null;

  @Column({ name: 'instructor_photo_key', type: 'varchar', length: 500, nullable: true })
  instructorPhotoKey: string | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  /**
   * Denormalised count of the course's lessons, so a listing of 24 cards does
   * not become 24 COUNT queries. The service maintains it on lesson create /
   * delete — nothing else may write it.
   */
  @Column({ name: 'lesson_count', type: 'int', default: 0 })
  lessonCount: number;

  /**
   * Denormalised count of enrolled learners — the "N learners" stat on the card
   * and detail page. Maintained by DawahEnrollmentService the first time a user
   * is auto-enrolled (never decremented on un-completing a lesson: enrolment is
   * sticky once earned). Nothing else may write it.
   */
  @Column({ name: 'enrollment_count', type: 'int', default: 0 })
  enrollmentCount: number;

  /** Surfaced in the landing page's course outline (/dawah/courses/featured). */
  @Index('IDX_dawah_courses_featured')
  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Index('IDX_dawah_courses_status')
  @Column({ type: 'varchar', length: 20, default: ContentStatus.DRAFT })
  status: ContentStatus;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /** Set the first time status becomes `published`. */
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @OneToMany(() => DawahCourseLesson, (lesson) => lesson.course)
  lessons?: DawahCourseLesson[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
