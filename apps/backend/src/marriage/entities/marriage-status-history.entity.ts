import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MarriageApplication } from './marriage-application.entity';

@Entity('marriage_status_history')
export class MarriageStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => MarriageApplication, (app) => app.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: MarriageApplication;

  @Column({ name: 'from_status', type: 'varchar', length: 30, nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 30 })
  toStatus: string;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date;
}
