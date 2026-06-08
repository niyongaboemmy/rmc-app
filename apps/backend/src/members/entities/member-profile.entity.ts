import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('member_profiles')
export class MemberProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'membership_number', type: 'varchar', length: 20, unique: true })
  membershipNumber: string;

  @Column({ name: 'joined_date', type: 'date' })
  joinedDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  occupation: string | null;

  @Column({ name: 'education_level', type: 'varchar', length: 50, nullable: true })
  educationLevel: string | null;

  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 100, nullable: true })
  emergencyContactName: string | null;

  @Column({ name: 'emergency_contact_phone', type: 'varchar', length: 20, nullable: true })
  emergencyContactPhone: string | null;

  @Column({ name: 'consent_given', type: 'boolean', default: false })
  consentGiven: boolean;

  @Column({ name: 'consent_date', type: 'timestamptz', nullable: true })
  consentDate: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
