import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DawahCategory } from './dawah-category.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Where a question can be in its life.
 *
 * `pending` is the entry state for anything a member submits, and it is the reversal of
 * the model this table was built for (migration 054). Questions used to go live on submit
 * and could only be pulled back, because the answers were the dangerous part and they were
 * what got held. Now RMC writes the answers, so nothing is public until RMC has answered
 * it — the question is what waits.
 *
 * `rejected` is distinct from `hidden`: rejected means RMC declined to answer a
 * submission, hidden means a published entry was withdrawn. Both are invisible to the
 * public, but a reviewer clearing the queue needs to tell "we said no" from "we changed
 * our minds", and one list of `hidden` rows cannot.
 *
 * Mirrored by CHK_dawah_questions_status. CHK_dawah_questions_published_has_answer
 * additionally forbids the one incoherent state — published with no answer.
 */
export type QuestionStatus = 'pending' | 'published' | 'rejected' | 'hidden' | 'deleted';

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
 * One entry in the Dawah Q&A: a question and RMC's answer to it.
 *
 * A row arrives one of two ways — an admin authors both halves at once, or a member
 * submits the question and an admin supplies the answer later. Either way the answer is
 * RMC's, which is why it lives here on the question rather than in a table of competing
 * answers: there is only ever one, and it is authoritative.
 *
 * `author_id` is who ASKED (NOT NULL — an unattributable submission is unbannable);
 * `answered_by_id` is who answered, and is null until someone has.
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

  /** Submissions start `pending`; an admin-authored entry is `published` immediately. */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: QuestionStatus;

  /**
   * RMC's answer. MARKDOWN SOURCE, never HTML — see `body`.
   *
   * Empty until answered. A published row with an empty answer is refused by
   * CHK_dawah_questions_published_has_answer, so the public listing can render the answer
   * unconditionally without a "coming soon" branch that should never be reachable.
   */
  @Column({ name: 'answer_body', type: 'text', default: '' })
  answerBody: string;

  /** The admin who wrote the answer. SET NULL on delete — the ruling outlives the account. */
  @Column({ name: 'answered_by_id', type: 'uuid', nullable: true })
  answeredById: string | null;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'answered_by_id' })
  answeredBy?: User | null;

  @Column({ name: 'answered_at', type: 'timestamptz', nullable: true })
  answeredAt: Date | null;

  /**
   * When it became public — the listing's sort key.
   *
   * Not `created_at`, which is when the member asked: a question submitted in March and
   * answered in July belongs at the top of the list in July, not buried in March.
   */
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  /** Retained from the forum model; no longer a sort key. See `publishedAt`. */
  @Column({ name: 'last_activity_at', type: 'timestamptz', default: () => 'now()' })
  lastActivityAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
