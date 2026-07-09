import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('phone_otp_verifications')
export class PhoneOtpVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_phone_otp_verifications_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index('IDX_phone_otp_verifications_phone')
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ name: 'otp_hash', type: 'varchar', length: 64 })
  otpHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
