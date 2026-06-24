import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_users_national_id')
  @Column({ name: 'national_id', type: 'varchar', length: 16, unique: true, nullable: true })
  nationalId: string | null;

  @Index('IDX_users_email')
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Index('IDX_users_phone')
  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string | null;

  @Column({ name: 'profile_photo_url', type: 'varchar', length: 500, nullable: true })
  profilePhotoUrl: string | null;

  @Index('IDX_users_role')
  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: string;

  @Index('IDX_users_status')
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'member_category', type: 'varchar', length: 20, default: 'standard' })
  memberCategory: string;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_phone_verified', type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'mfa_enabled', type: 'boolean', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'mfa_secret', type: 'varchar', length: 500, nullable: true })
  mfaSecret: string | null;

  @Column({ name: 'two_factor_enabled', type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Index('IDX_users_role_id')
  @Column({ name: 'role_id', type: 'uuid', nullable: true })
  roleId: string | null;

  @ManyToOne(() => Role, { nullable: true, eager: false })
  @JoinColumn({ name: 'role_id' })
  roleEntity: Role | null;

  @Index('IDX_users_mosque_id')
  @Column({ name: 'mosque_id', type: 'uuid', nullable: true })
  mosqueId: string | null;

  @Index('IDX_users_area_id')
  @Column({ name: 'area_id', type: 'uuid', nullable: true })
  areaId: string | null;

  @Column({ name: 'digital_id_number', type: 'varchar', length: 20, unique: true, nullable: true })
  digitalIdNumber: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
