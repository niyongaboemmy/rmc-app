import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Append-only audit trail of every status transition, so the admin side can show
 * who moved an application where, and when the applicant was told.
 */
@Entity('hajj_status_history')
export class HajjStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  /** Null on the very first row (creation). */
  @Column({ name: 'from_status', type: 'varchar', length: 30, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 30 })
  toStatus: string;

  /** Null when the transition was made by the system (e.g. initial submission). */
  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date;
}
