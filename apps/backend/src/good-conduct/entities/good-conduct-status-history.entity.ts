import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GoodConductRequest } from './good-conduct-request.entity';

@Entity('good_conduct_status_history')
export class GoodConductStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @ManyToOne(() => GoodConductRequest, (request) => request.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: GoodConductRequest;

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
