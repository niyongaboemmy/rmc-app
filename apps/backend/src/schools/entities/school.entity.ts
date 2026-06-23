import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SchoolLevel {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  MADRASSA = 'madrassa',
  TVET = 'tvet',
}

export enum SchoolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/** An Islamic school listed in the public "Find Islamic Schools" directory. */
@Entity('schools')
export class School {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Index('IDX_schools_level')
  @Column({ type: 'varchar', length: 20, default: SchoolLevel.PRIMARY })
  level: SchoolLevel;

  @Column({ name: 'principal_name', type: 'varchar', length: 150, nullable: true })
  principalName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  /** Human-readable location label, e.g. "Nyarugenge, Kigali". */
  @Column({ type: 'varchar', length: 150, nullable: true })
  district: string | null;

  @Index('IDX_schools_province_code')
  @Column({ name: 'province_code', type: 'varchar', length: 8, nullable: true })
  provinceCode: string | null;

  @Column({ name: 'gps_lat', type: 'double precision', nullable: true })
  gpsLat: number | null;

  @Column({ name: 'gps_lng', type: 'double precision', nullable: true })
  gpsLng: number | null;

  @Column({ type: 'varchar', length: 20, default: SchoolStatus.ACTIVE })
  status: SchoolStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
