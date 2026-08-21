import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenderApplication } from './tender-application.entity';

@Entity('tender_application_status_history')
export class TenderApplicationStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_tender_app_history_application')
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

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

  @ManyToOne(() => TenderApplication, (a) => a.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: TenderApplication;
}
