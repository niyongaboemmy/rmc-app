import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { JobApplication } from './job-application.entity';

/**
 * A single phone-OTP challenge for the public "track your application" flow.
 * Not tied to a user account — the phone is matched against the phone stored on
 * the application record, so anonymous applicants can verify ownership.
 */
@Entity('tracking_verifications')
export class TrackingVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_tracking_verifications_application')
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => JobApplication, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: JobApplication;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  /** sha-256 of (otp + server pepper). Never store the raw OTP. */
  @Column({ name: 'otp_hash', type: 'varchar', length: 64 })
  otpHash: string;

  @Index('IDX_tracking_verifications_expires')
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /** Set once the OTP is successfully used — enforces single-use (replay protection). */
  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
