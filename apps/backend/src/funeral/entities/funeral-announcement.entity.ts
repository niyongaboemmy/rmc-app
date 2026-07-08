import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';

/** A public janāzah (funeral prayer) notice. */
@Entity('funeral_announcements')
export class FuneralAnnouncement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'int', default: 0 })
  age: number;

  @Column({ name: 'date_of_death', type: 'date', nullable: true })
  dateOfDeath: string | null;

  @Column({ name: 'janazah_location', type: 'varchar', length: 200 })
  janazahLocation: string;

  @Index('IDX_announcement_prayer_time')
  @Column({ name: 'prayer_time', type: 'timestamptz' })
  prayerTime: Date;

  @Column({ name: 'burial_location', type: 'varchar', length: 200 })
  burialLocation: string;

  @Column({ type: 'text', nullable: true })
  verse: string | null;

  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
