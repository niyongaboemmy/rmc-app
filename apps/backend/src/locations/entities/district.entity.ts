import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Province } from './province.entity';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  code: string;

  @Column({ name: 'province_id', type: 'uuid' })
  provinceId: string;

  @ManyToOne(() => Province, { eager: true })
  @JoinColumn({ name: 'province_id' })
  province: Province;
}
