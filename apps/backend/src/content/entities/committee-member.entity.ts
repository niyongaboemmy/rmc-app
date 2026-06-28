import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('committee_members')
export class CommitteeMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  nameEn: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  nameRw: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  nameAr: string;

  @Column({ type: 'varchar', length: 200 })
  roleEn: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  roleRw: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  roleAr: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
