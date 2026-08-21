import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DawahAnswer } from './dawah-answer.entity';
import { User } from '../../users/entities/user.entity';

/**
 * One member's vote on one answer. `UQ_dawah_votes_one_per_user` IS the "one vote per
 * person" rule — a re-vote UPDATEs the existing row, it does not stack. `value` is +1/-1
 * only (CHK_dawah_votes_value); there is no zero, an un-vote deletes the row.
 */
@Entity('dawah_votes')
export class DawahVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'answer_id', type: 'uuid' })
  answerId: string;

  @ManyToOne(() => DawahAnswer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'answer_id' })
  answer?: DawahAnswer;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'smallint' })
  value: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
