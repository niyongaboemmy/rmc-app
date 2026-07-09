import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MemberCategory {
  STANDARD = 'standard',
  STUDENT = 'student',
  SCHOLAR = 'scholar',
  PARTNER = 'partner',
  VIP = 'vip',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum MemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DECEASED = 'deceased',
}

@Entity('member_profiles')
export class MemberProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

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

  // Phase 2 additions
  @Column({ name: 'national_id', type: 'varchar', length: 16, nullable: true })
  nationalId: string | null;

  @Column({ type: 'varchar', length: 30, default: MemberCategory.STANDARD })
  category: string;

  @Column({ name: 'mosque_id', type: 'uuid', nullable: true })
  mosqueId: string | null;

  @Column({ name: 'province_id', type: 'uuid', nullable: true })
  provinceId: string | null;

  @Column({ name: 'district_id', type: 'uuid', nullable: true })
  districtId: string | null;

  @Column({ name: 'sector_id', type: 'uuid', nullable: true })
  sectorId: string | null;

  @Column({ name: 'photo_key', type: 'varchar', length: 500, nullable: true })
  photoKey: string | null;

  @Column({ name: 'approval_status', type: 'varchar', length: 20, default: ApprovalStatus.PENDING })
  approvalStatus: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'member_status', type: 'varchar', length: 20, default: MemberStatus.ACTIVE })
  memberStatus: string;

  @Column({ name: 'status_reason', type: 'text', nullable: true })
  statusReason: string | null;

  @Column({ name: 'status_changed_by', type: 'uuid', nullable: true })
  statusChangedBy: string | null;

  @Column({ name: 'status_changed_at', type: 'timestamptz', nullable: true })
  statusChangedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
