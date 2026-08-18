import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { DawahQuestion } from './dawah-question.entity';

/**
 * One reader's "was this helpful?" on one published entry.
 *
 * Anonymous by design. The detail page is @Public and most of its readers will never
 * hold an account, so gating this behind a login would measure the members rather than
 * the readership — and the readership is the thing the answer is written for.
 *
 * ── voter_hash is a browser, not a person ───────────────────────────────────────────
 *
 * The client mints a random token once, keeps it in localStorage and sends it back on
 * every rating; this stores its SHA-256, never the token itself. So a leaked dump cannot
 * be replayed as somebody's identity, and the column is a dedupe key and nothing else.
 *
 * UQ_dawah_question_ratings_one_per_voter IS the "one rating per browser" rule — a
 * second POST from the same browser UPDATEs `helpful` rather than stacking a row, which
 * is also what lets a reader change their mind from yes to no.
 *
 * None of this is proof of identity: clearing storage or opening a private window earns
 * a second vote. That is the accepted ceiling for an unauthenticated helpfulness signal,
 * and why the tallies stay an editorial hint for RMC rather than a public score.
 *
 * `ip_hash` is likewise hashed and exists only so a lopsided burst is visible as one
 * source. It is deliberately NOT part of the unique key: a mosque or a campus behind one
 * NAT would then get a single vote between all of them.
 */
@Entity('dawah_question_ratings')
export class DawahQuestionRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_dawah_question_ratings_question')
  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => DawahQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question?: DawahQuestion;

  /** true = helpful, false = not. There is no third state; an undo deletes the row. */
  @Column({ type: 'boolean' })
  helpful: boolean;

  /** SHA-256 of the client's browser token. Never the token. See the class comment. */
  @Column({ name: 'voter_hash', type: 'varchar', length: 64 })
  voterHash: string;

  /** SHA-256 of the caller's IP, for abuse triage only. Never part of the unique key. */
  @Column({ name: 'ip_hash', type: 'varchar', length: 64, nullable: true })
  ipHash: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
