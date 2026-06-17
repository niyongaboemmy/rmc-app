import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('prayer_time_adjustments')
export class PrayerTimeAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mosque_id', type: 'uuid', unique: true })
  mosqueId: string;

  @Column({ name: 'fajr_adj', type: 'integer', default: 0 })
  fajrAdj: number;

  @Column({ name: 'sunrise_adj', type: 'integer', default: 0 })
  sunriseAdj: number;

  @Column({ name: 'dhuhr_adj', type: 'integer', default: 0 })
  dhuhrAdj: number;

  @Column({ name: 'asr_adj', type: 'integer', default: 0 })
  asrAdj: number;

  @Column({ name: 'maghrib_adj', type: 'integer', default: 0 })
  maghribAdj: number;

  @Column({ name: 'isha_adj', type: 'integer', default: 0 })
  ishaAdj: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
