import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { DawahQuestion } from './dawah-question.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Where an answer can be in its life.
 *
 * `pending_review` exists here and NOT on questions — the asymmetry is deliberate (plan
 * §0.1). An answer in a category flagged `scholar_review` is held here until a Scholar
 * acts, because an answer about fiqh IS a ruling and someone will act on it.
 *
 * The initial value is COMPUTED SERVER-SIDE from the question's category `answer_policy`.
 * It must never arrive from a DTO: a client-settable status is a client-settable
 * publication gate.
 *
 * Mirrored by CHK_dawah_answers_status.
 */
export type AnswerStatus = 'pending_review' | 'published' | 'auto_hidden' | 'hidden' | 'deleted';

/**
 * An answer to a community question.
 *
 * ── Release and verify are two different acts ────────────────────────────────────────
 *
 *   · released_by_id → a scholar said "not harmful". The answer is published. NO badge.
 *   · verified_by_id → a scholar said "RMC says this is correct". Badge, pinned to top.
 *
 * A scholar clearing a queue of twenty answers is doing the first. If these were one
 * field — or one button — every answer a scholar merely triaged would silently carry
 * RMC's endorsement, which is the precise harm this whole feature is designed around.
 *
 * Two invariants live in the DB, not here, because a check in TypeScript loses the race
 * when two scholars act at once:
 *   · UQ_dawah_answers_one_verified        — at most one verified answer per question
 *   · CHK_dawah_answers_verified_published — "verified but hidden" cannot be stored
 */
@Entity('dawah_answers')
export class DawahAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_dawah_answers_question')
  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => DawahQuestion, (question) => question.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question?: DawahQuestion;

  /** MARKDOWN SOURCE, never HTML — see DawahQuestion.body. */
  @Column({ type: 'text' })
  body: string;

  /** Always written, even when anonymous. Anonymity is stripped in the projection. */
  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { nullable: false, eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous: boolean;

  /** Computed from the category's answer_policy on create. Never from a DTO. */
  @Column({ type: 'varchar', length: 20, default: 'pending_review' })
  status: AnswerStatus;

  /** "RMC says this is correct." Set only by a Scholar (DISCUSSIONS_VERIFY). */
  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  /**
   * WHO verified. Accountability, not decoration — "Verified by RMC" with no scholar
   * behind it is an institution hiding behind itself. SET NULL on user delete: the record
   * of the act survives, only the attribution goes.
   */
  @Column({ name: 'verified_by_id', type: 'uuid', nullable: true })
  verifiedById: string | null;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by_id' })
  verifiedBy?: User | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  /** Released from review WITHOUT endorsement. Internal — never public (see the contract). */
  @Column({ name: 'released_by_id', type: 'uuid', nullable: true })
  releasedById: string | null;

  @Column({ name: 'vote_score', type: 'int', default: 0 })
  voteScore: number;

  /** Never public: publishing it tells an abuser how many more reports they need. */
  @Column({ name: 'report_count', type: 'int', default: 0 })
  reportCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
