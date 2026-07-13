import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { FuneralRequest } from './funeral-request.entity';

/** Append-only log of a funeral request's stage transitions. */
@Entity('funeral_status_history')
export class FuneralStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_funeral_history_request')
  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @Column({ type: 'varchar', length: 40 })
  stage: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'assigned_volunteer', type: 'varchar', length: 150, nullable: true })
  assignedVolunteer: string | null;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => FuneralRequest, (r) => r.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: FuneralRequest;
}
