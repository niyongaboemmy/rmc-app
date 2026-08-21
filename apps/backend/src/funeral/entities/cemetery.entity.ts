import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';

@Entity('cemeteries')
export class Cemetery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_cemetery_name')
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 300 })
  address: string;

  @Column({ type: 'int', default: 0 })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  used: number;

  @Column({ name: 'contact_person', type: 'varchar', length: 150, nullable: true })
  contactPerson: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'gps_lat', type: 'decimal', precision: 10, scale: 7, nullable: true })
  gpsLat: string | null;

  @Column({ name: 'gps_lng', type: 'decimal', precision: 10, scale: 7, nullable: true })
  gpsLng: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
