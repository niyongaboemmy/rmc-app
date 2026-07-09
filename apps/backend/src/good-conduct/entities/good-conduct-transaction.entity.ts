import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GoodConductRequest } from './good-conduct-request.entity';

@Entity('good_conduct_transactions')
export class GoodConductTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @ManyToOne(() => GoodConductRequest, (request) => request.transactions)
  @JoinColumn({ name: 'request_id' })
  request: GoodConductRequest;

  @Column({ type: 'varchar', length: 20 })
  method: string;

  @Column({ name: 'provider_ref', type: 'varchar', length: 200, nullable: true })
  providerRef: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'RWF' })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'initiated_at', type: 'timestamptz' })
  initiatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'confirmed_by', type: 'uuid', nullable: true })
  confirmedBy: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
