import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScholarshipApplication } from './scholarship-application.entity';

@Entity('scholarship_status_history')
export class ScholarshipStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => ScholarshipApplication, (application) => application.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'application_id' })
  application: ScholarshipApplication;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20 })
  toStatus: string;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date;
}
