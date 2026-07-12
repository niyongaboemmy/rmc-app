import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn,
  OneToMany, Index,
} from 'typeorm';
import { FuneralStatusHistory } from './funeral-status-history.entity';

@Entity('funeral_requests')
export class FuneralRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Deceased ───────────────────────────────────────────────────────
  @Column({ name: 'deceased_full_name', type: 'varchar', length: 150 })
  deceasedFullName: string;

  @Column({ name: 'deceased_gender', type: 'varchar', length: 10 })
  deceasedGender: string;

  @Column({ name: 'deceased_date_of_birth', type: 'date', nullable: true })
  deceasedDateOfBirth: string | null;

  @Column({ name: 'deceased_date_of_death', type: 'date' })
  deceasedDateOfDeath: string;

  @Column({ name: 'deceased_national_id', type: 'varchar', length: 20, nullable: true })
  deceasedNationalId: string | null;

  @Column({ name: 'deceased_place_of_death', type: 'varchar', length: 200, nullable: true })
  deceasedPlaceOfDeath: string | null;

  @Column({ name: 'deceased_cause_of_death', type: 'text', nullable: true })
  deceasedCauseOfDeath: string | null;

  /**
   * File-server key of the uploaded death certificate. Legacy rows may still hold a
   * bare filename with no file behind it — those have no mime type (see below).
   */
  @Column({ name: 'death_certificate', type: 'varchar', length: 500, nullable: true })
  deathCertificate: string | null;

  @Column({ name: 'death_certificate_name', type: 'varchar', length: 255, nullable: true })
  deathCertificateName: string | null;

  /** Present only when a real file was uploaded — the admin UI keys off this. */
  @Column({ name: 'death_certificate_mime', type: 'varchar', length: 100, nullable: true })
  deathCertificateMime: string | null;

  @Column({ name: 'death_certificate_size', type: 'integer', nullable: true })
  deathCertificateSize: number | null;

  // ── Family ─────────────────────────────────────────────────────────
  @Column({ name: 'family_next_of_kin', type: 'varchar', length: 150 })
  familyNextOfKin: string;

  @Column({ name: 'family_phone', type: 'varchar', length: 30 })
  familyPhone: string;

  @Column({ name: 'family_email', type: 'varchar', length: 150, nullable: true })
  familyEmail: string | null;

  @Column({ name: 'family_address', type: 'varchar', length: 300, nullable: true })
  familyAddress: string | null;

  @Column({ name: 'family_emergency_contact', type: 'varchar', length: 30, nullable: true })
  familyEmergencyContact: string | null;

  // ── Arrangements ───────────────────────────────────────────────────
  @Column({ name: 'arr_preferred_mosque', type: 'varchar', length: 200, nullable: true })
  arrPreferredMosque: string | null;

  @Column({ name: 'arr_preferred_cemetery', type: 'varchar', length: 200, nullable: true })
  arrPreferredCemetery: string | null;

  @Column({ name: 'arr_preferred_burial_date', type: 'date', nullable: true })
  arrPreferredBurialDate: string | null;

  @Column({ name: 'arr_preferred_burial_time', type: 'varchar', length: 10, nullable: true })
  arrPreferredBurialTime: string | null;

  @Column({ name: 'arr_transportation_required', type: 'boolean', default: false })
  arrTransportationRequired: boolean;

  @Column({ name: 'arr_notes', type: 'text', nullable: true })
  arrNotes: string | null;

  // ── Status ─────────────────────────────────────────────────────────
  /** Holds a funeral_steps.key. The ordered active steps define the lifecycle. */
  @Index('IDX_funeral_req_stage')
  @Column({ type: 'varchar', length: 40, default: 'reported' })
  stage: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => FuneralStatusHistory, (h) => h.request, { cascade: true })
  statusHistory: FuneralStatusHistory[];
}
