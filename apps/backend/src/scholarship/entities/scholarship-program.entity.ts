import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum ScholarshipLevel {
  SECONDARY = 'secondary',
  TVET = 'tvet',
  UNIVERSITY = 'university',
}

/**
 * Where an opportunity is in its life. Replaces the `isOpen` boolean, which
 * could not express "being written" — an admin had no way to compose a
 * scholarship without it being live the moment it was saved.
 */
export enum ScholarshipProgramStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}

/** Multilingual text. Falls back to the single-language column when absent. */
export interface I18nText {
  en: string;
  rw: string;
  ar: string;
}

/** One upload the applicant must attach — drives the wizard's document step. */
export interface RequiredDocument {
  /** Stable key stored on the uploaded document row, e.g. 'transcript'. */
  key: string;
  label: I18nText;
  required: boolean;
}

/**
 * A scholarship OPPORTUNITY: the thing RMC announces, an applicant reads, and
 * an application is made against.
 *
 * Named `ScholarshipProgram` because the table and the `scholarship_applications
 * .program_id` FK already were — renaming buys nothing and costs every
 * reference. User-facing copy says "scholarship"; "program" is code-only.
 *
 * See docs/scholarship-opportunity-flow-implementation-plan.md.
 */
@Entity('scholarship_programs')
export class ScholarshipProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Readable URL segment: /services/scholarship/<slug>. Assigned when the
   * opportunity is first named and kept stable afterwards, so a published link
   * never rots. Null only for a draft that has not been titled yet — the unique
   * index is partial, and Postgres permits many NULLs.
   */
  @Index('IDX_scholarship_programs_slug', { unique: true })
  @Column({ type: 'varchar', length: 160, nullable: true })
  slug: string | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  /**
   * The WHOLE of what an applicant reads: what the scholarship is, who may
   * apply, what it covers, what it is worth.
   *
   * Rich text (HTML from the shared RichTextEditor), not plain. It replaced
   * three plain-text columns and an `amount` number in migration 077 — the
   * editor carries its own headings, so the structure that once justified
   * separate columns now lives inside this one and RMC shapes the page rather
   * than filling in a fixed form.
   *
   * Sanitised at render, never at write: see the frontend's lib/sanitize.
   */
  @Column({ type: 'text' })
  description: string;

  /**
   * Trilingual copy. `title`/`description` above remain the fallback, the same
   * arrangement `announcements` uses — so a row authored before this existed
   * still renders, in one language, instead of rendering blank.
   */
  @Column({ name: 'title_i18n', type: 'jsonb', nullable: true })
  titleI18n: I18nText | null;

  @Column({ name: 'description_i18n', type: 'jsonb', nullable: true })
  descriptionI18n: I18nText | null;

  @Column({ name: 'required_documents', type: 'jsonb', default: () => "'[]'" })
  requiredDocuments: RequiredDocument[];

  /** The call-for-applications PDF and anything else worth reading before applying. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  attachments: Array<{ key: string; name: string; mimeType: string; size: number }>;

  @Column({ type: 'varchar', length: 20, nullable: true })
  level: ScholarshipLevel | null;

  /** How many awards are on offer. Null when RMC would rather not commit. */
  @Column({ type: 'int', nullable: true })
  slots: number | null;

  /** Internal citation, e.g. RMC-SCHP-2607-0001. Never a credential. */
  @Column({ name: 'reference_number', type: 'varchar', length: 40, nullable: true })
  referenceNumber: string | null;

  /** Applications open at this moment. Null means "as soon as it is published". */
  @Column({ name: 'opens_at', type: 'timestamptz', nullable: true })
  opensAt: Date | null;

  /** Last moment an application may be SUBMITTED. Enforced server-side at both
   *  draft creation and submit — a draft can sit for days, so the check that
   *  counts is the one at submit. */
  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date | null;

  @Column({ type: 'varchar', length: 20, default: ScholarshipProgramStatus.DRAFT })
  status: ScholarshipProgramStatus;

  /**
   * @deprecated Superseded by `status`. Kept and written in sync only so the
   * current admin UI and public list keep working; retired in the cleanup phase
   * once nothing reads it. Do not branch on this in new code.
   */
  @Column({ name: 'is_open', type: 'boolean', default: true })
  isOpen: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
