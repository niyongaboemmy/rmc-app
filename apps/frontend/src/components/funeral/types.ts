/**
 * Funeral Services — shared domain types.
 *
 * These mirror the shapes the backend module will eventually expose. Until that
 * exists, the UI is driven by the dummy data in ./data.ts and funeralApi.ts
 * returns the same shapes so swapping in the real API is a one-file change.
 */

export type Gender = 'male' | 'female';

/**
 * A request's lifecycle stage — a `FuneralStep.key`. The set of steps is
 * data-driven (managed in the funeral CMS), so this is just a string.
 */
export type FuneralStage = string;

/** Trilingual text as returned by the steps API. */
export interface StepText {
  en: string;
  rw: string;
  ar: string;
}

/** A configurable lifecycle step (from the funeral steps API / CMS). */
export interface FuneralStepConfig {
  id: string;
  key: string;
  title: StepText;
  description: StepText;
  sortOrder: number;
  isActive: boolean;
  color?: string;
  icon?: string;
}

/** Who is viewing — actions are shown/hidden per role. */
export type FuneralRole =
  | 'super_admin'
  | 'mosque_admin'
  | 'committee'
  | 'volunteer'
  | 'family';

export interface DeceasedInfo {
  fullName: string;
  gender: Gender;
  dateOfBirth: string; // ISO date
  dateOfDeath: string; // ISO date
  nationalId: string;
  placeOfDeath: string;
  causeOfDeath?: string;
  /** File-server key of the uploaded death certificate. */
  deathCertificate?: string;
  deathCertificateName?: string;
  /**
   * Present only when a real file was uploaded. Legacy reports (before uploads
   * existed) carry a bare filename in `deathCertificate` and no mime type — the
   * admin UI uses this to tell the two apart.
   */
  deathCertificateMime?: string;
  deathCertificateSize?: number;
}

export interface FamilyInfo {
  nextOfKin: string;
  phone: string;
  email?: string;
  address: string;
  emergencyContact?: string;
}

export interface FuneralArrangements {
  /** Mosque name for display (resolved from the id by the backend). */
  preferredMosque?: string;
  /** Mosque id — the stored reference. */
  preferredMosqueId?: string;
  preferredCemetery?: string;
  preferredBurialDate?: string;
  preferredBurialTime?: string;
  transportationRequired: boolean;
  notes?: string;
}

/** Full payload submitted by the request form. */
export interface FuneralRequestPayload {
  deceased: DeceasedInfo;
  family: FamilyInfo;
  arrangements: FuneralArrangements;
}

export interface TimelineStep {
  stage: FuneralStage;
  status: 'done' | 'active' | 'pending';
  timestamp?: string; // ISO datetime
  assignedVolunteer?: string;
  notes?: string;
}

export interface FuneralRequest extends FuneralRequestPayload {
  id: string;
  stage: FuneralStage;
  createdAt: string;
  timeline: TimelineStep[];
}

export interface Transport {
  id: string;
  name: string;
  mosqueId: string;
  /** Resolved mosque name (from the backend). */
  mosque: string;
  location: string;
  phone: string;
  isActive: boolean;
}

export interface Cemetery {
  id: string;
  name: string;
  address: string;
  capacity: number;
  used: number;
  contactPerson: string;
  phone: string;
  lat?: number;
  lng?: number;
}

