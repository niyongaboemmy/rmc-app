import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum PartyRole {
  BRIDE = 'bride',
  GROOM = 'groom',
  WALI = 'wali',
  IMAM = 'imam',
}

@Entity('marriage_party_confirmations')
export class MarriagePartyConfirmation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_mpc_application_id')
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ type: 'enum', enum: PartyRole })
  role: PartyRole;

  @Column({ type: 'varchar', length: 150, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  nid: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Index('IDX_mpc_token', { unique: true })
  @Column({ name: 'confirmation_token', type: 'varchar', length: 80, unique: true, nullable: true })
  confirmationToken: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
