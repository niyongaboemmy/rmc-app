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

/** A skill/task key (funeral_skills.key) — the set is admin-managed, so a string. */
export type VolunteerTask = string;

/** A configurable attendant skill (from the funeral skills API / CMS). */
export interface FuneralSkillConfig {
  id: string;
  key: string;
  label: StepText;
  sortOrder: number;
  isActive: boolean;
}

export interface DeceasedInfo {
  fullName: string;
  gender: Gender;
  dateOfBirth: string; // ISO date
  dateOfDeath: string; // ISO date
  nationalId: string;
  placeOfDeath: string;
  causeOfDeath?: string;
  /** File name / storage key of the uploaded death certificate. */
  deathCertificate?: string;
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
  ghuslRequired: boolean;
  kafanRequired: boolean;
  janazahPrayerRequired: boolean;
  transportationRequired: boolean;
  gravePreparationRequired: boolean;
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
  reference: string;
  stage: FuneralStage;
  createdAt: string;
  timeline: TimelineStep[];
}

export interface Volunteer {
  id: string;
  name: string;
  skills: VolunteerTask[];
  available: boolean;
  phone: string;
  /** Mosque this volunteer is registered under. */
  mosqueId: string;
  /** Mosque name for display (resolved from the id by the backend). */
  mosqueName?: string;
  assignedTask?: VolunteerTask;
  /** Id of the funeral request this volunteer is assigned to, when busy. */
  assignedRequestId?: string;
}

/** Minimal funeral descriptor used when picking who a volunteer serves. */
export interface FuneralOption {
  id: string;
  reference: string;
  deceasedName: string;
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

export interface FuneralAnnouncement {
  id: string;
  name: string;
  age: number;
  dateOfDeath: string; // ISO date
  janazahLocation: string;
  prayerTime: string; // ISO datetime
  burialLocation: string;
  verse?: string;
  photoUrl?: string;
}
