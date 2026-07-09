import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('history_entries')
export class HistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar', length: 200 })
  titleEn: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  titleRw: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  titleAr: string;

  @Column({ type: 'text' })
  descriptionEn: string;

  @Column({ type: 'text', default: '' })
  descriptionRw: string;

  @Column({ type: 'text', default: '' })
  descriptionAr: string;

  @Column({ type: 'varchar', nullable: true })
  imageKey: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
