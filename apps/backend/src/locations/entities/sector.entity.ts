import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { District } from './district.entity';

@Entity('sectors')
export class Sector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'district_id', type: 'uuid' })
  districtId: string;

  @ManyToOne(() => District, { eager: true })
  @JoinColumn({ name: 'district_id' })
  district: District;
}
