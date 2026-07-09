import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('provinces')
export class Province {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  code: string;
}
