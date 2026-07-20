import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { DawahCategory } from './dawah-category.entity';
import { DawahAnswer } from './dawah-answer.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Where a question can be in its life.
 *
 * There is deliberately NO `pending_review` here — that state exists only for answers.
 * The asymmetry is the whole moderation model (plan §0.1): a bad question is noise, a bad
 * answer is a false ruling someone acts on. A question goes live on submit and can only
 * be pulled BACK. Mirrored by CHK_dawah_questions_status.
 *
 * `auto_hidden` is distinct from `hidden` ON PURPOSE: a moderator must be able to see at
 * a glance whether a human made the call or a report threshold did. Collapsing the two
 * destroys exactly the signal needed to notice the threshold being abused.
 */
export type QuestionStatus = 'published' | 'auto_hidden' | 'hidden' | 'locked' | 'deleted';

/**
 * The language the member WROTE IN — not a translation axis.
 *
 * Every other Dawah table carries tri-lingual sibling columns (title_en/_rw/_ar) because
 * an admin types all three. User-generated content has exactly one language, and nobody
 * is going to translate their own question into two others. The listing filters on this;
 * the frontend sets `dir` from it per-post, so an Arabic question renders RTL on the
 * English page. Mirrored by CHK_dawah_questions_lang.
 */
export type PostLanguage = 'en' | 'rw' | 'ar';

/**
 * A question in the community Q&A.
 *
 * `author_id` is NOT NULL even when `is_anonymous` — always. Anonymity is a projection
 * concern, stripped in DawahDiscussionsService.toPublic(), never a storage concern. A
 * nullable author would mean an anonymous member is unbannable, which is not anonymity,
 * it is impunity.
 */
@Entity('dawah_questions')
export class DawahQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Permalink: /dawah/discussions/:slug. */
  @Column({ type: 'varchar', length: 180, unique: true })
  slug: string;

  /** Plain text. Never HTML — the title is not rich content. */
  @Column({ type: 'varchar', length: 200 })
  title: string;

  /**
   * MARKDOWN SOURCE, never HTML.
   *
   * The public renderer turns this into sanitised HTML on read. Storing HTML would make
   * the entire defence "DOMPurify never has a bug", and would bake today's DOMPurify into
   * the database — a bypass found next year would already be stored. See plan §5.
   */
  @Column({ type: 'text', default: '' })
  body: string;

  @Column({ type: 'varchar', length: 20, default: 'en' })
  language: PostLanguage;

  @Index('IDX_dawah_questions_category')
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  /** The SHARED Dawah taxonomy — a "Fiqh" question means the same Fiqh as a Fiqh course. */
  @ManyToOne(() => DawahCategory, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: DawahCategory | null;

  /** Always written. See the class comment. */
  @Index('IDX_dawah_questions_author')
  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { nullable: false, eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author?: User;

  /** Hides the name in the projection. Never hides the row's author_id. */
  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous: boolean;

  @Column({ type: 'varchar', length: 20, default: 'published' })
  status: QuestionStatus;

  /** Denormalised. EXCLUDES pending_review answers — "3 answers" with none visible is a bug. */
  @Column({ name: 'answer_count', type: 'int', default: 0 })
  answerCount: number;

  /** Denormalised. Drives auto-hide at REPORT_AUTOHIDE_THRESHOLD. Never public. */
  @Column({ name: 'report_count', type: 'int', default: 0 })
  reportCount: number;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  /** Denormalised so the listing can badge "answered" without joining. */
  @Column({ name: 'verified_answer_id', type: 'uuid', nullable: true })
  verifiedAnswerId: string | null;

  /**
   * The sort key for "active" — NOT `updated_at`.
   *
   * An edit bumps updated_at, so sorting on it would let anyone float a stale question to
   * the top by fixing a typo. This moves only on real activity: a new answer.
   */
  @Column({ name: 'last_activity_at', type: 'timestamptz', default: () => 'now()' })
  lastActivityAt: Date;

  @OneToMany(() => DawahAnswer, (answer) => answer.question)
  answers?: DawahAnswer[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
