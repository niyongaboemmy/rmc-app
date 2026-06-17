import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('verses_of_day')
export class VerseOfDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  surah: number;

  @Column({ type: 'integer' })
  ayah: number;

  @Column({ name: 'arabic_text', type: 'text' })
  arabicText: string;

  @Column({ name: 'translation_en', type: 'text' })
  translationEn: string;

  @Column({ name: 'translation_rw', type: 'text', nullable: true })
  translationRw: string | null;

  @Column({ type: 'varchar', length: 50 })
  reference: string;

  @Column({ name: 'display_date', type: 'date', unique: true })
  displayDate: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
