import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Polymorphic phone-OTP challenge shared by every "track your application" flow
 * (jobs, hajj, marriage, …). `subjectType` + `subjectId` identify the record
 * without a hard FK, so one table serves all services. The phone is matched
 * against the phone stored on the subject record — no user account required.
 */
@Entity('tracking_otps')
@Index('IDX_tracking_otps_subject', ['subjectType', 'subjectId'])
export class TrackingOtp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_type', type: 'varchar', length: 40 })
  subjectType: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  /** sha-256 of (otp + server pepper). Never store the raw OTP. */
  @Column({ name: 'otp_hash', type: 'varchar', length: 64 })
  otpHash: string;

  @Index('IDX_tracking_otps_expires')
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /** Set once the OTP is used — enforces single-use (replay protection). */
  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
