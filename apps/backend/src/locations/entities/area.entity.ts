import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Sector } from './sector.entity';
import { District } from './district.entity';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'sector_id', type: 'uuid', nullable: true })
  sectorId: string | null;

  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  districtId: string | null;

  @ManyToOne(() => Sector, { nullable: true, eager: false })
  @JoinColumn({ name: 'sector_id' })
  sector: Sector | null;

  @ManyToOne(() => District, { nullable: true, eager: false })
  @JoinColumn({ name: 'district_id' })
  district: District | null;
}
