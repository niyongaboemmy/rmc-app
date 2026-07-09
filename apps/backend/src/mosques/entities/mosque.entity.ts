import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('mosques')
export class Mosque {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'parent_mosque_id', type: 'uuid', nullable: true })
  parentMosqueId: string | null;

  @ManyToOne(() => Mosque, { nullable: true })
  @JoinColumn({ name: 'parent_mosque_id' })
  parentMosque: Mosque | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'gps_lat', type: 'decimal', precision: 10, scale: 8, nullable: true })
  gpsLat: number | null;

  @Column({ name: 'gps_lng', type: 'decimal', precision: 11, scale: 8, nullable: true })
  gpsLng: number | null;

  @Column({ name: 'province_id', type: 'uuid', nullable: true })
  provinceId: string | null;

  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  districtId: string | null;

  @Column({ name: 'sector_id', type: 'uuid', nullable: true })
  sectorId: string | null;

  @Column({ type: 'integer', nullable: true })
  capacity: number | null;

  @Column({ name: 'founding_year', type: 'integer', nullable: true })
  foundingYear: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'friday_prayer_time', type: 'time', nullable: true })
  fridayPrayerTime: string | null;

  @Column({ name: 'imam_name', type: 'varchar', length: 200, nullable: true })
  imamName: string | null;

  @Column({ name: 'imam_phone', type: 'varchar', length: 20, nullable: true })
  imamPhone: string | null;

  @Column({ name: 'imam_photo', type: 'text', nullable: true })
  imamPhoto: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
