import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Mosque } from './mosque.entity';

@Entity('mosque_imams')
export class MosqueImam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mosque_id', type: 'uuid' })
  mosqueId: string;

  @ManyToOne(() => Mosque)
  @JoinColumn({ name: 'mosque_id' })
  mosque: Mosque;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
