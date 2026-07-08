import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';

@Entity('funeral_volunteers')
export class FuneralVolunteer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  /** Mosque the volunteer is registered under (mosques.id). */
  @Index('IDX_volunteer_mosque')
  @Column({ name: 'mosque_id', type: 'uuid' })
  mosqueId: string;

  /** Skill keys (funeral_skills.key) the volunteer is skilled in. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  skills: string[];

  @Column({ type: 'boolean', default: true })
  available: boolean;

  @Column({ name: 'assigned_task', type: 'varchar', length: 40, nullable: true })
  assignedTask: string | null;

  /** Funeral request this volunteer is currently assigned to (funeral_requests.id). */
  @Index('IDX_volunteer_assigned_request')
  @Column({ name: 'assigned_request_id', type: 'uuid', nullable: true })
  assignedRequestId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
