import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MarriageApplication } from './marriage-application.entity';

@Entity('marriage_transactions')
export class MarriageTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => MarriageApplication, (app) => app.transactions)
  @JoinColumn({ name: 'application_id' })
  application: MarriageApplication;

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
