import { apiClient } from './api';

// ── Types ──────────────────────────────────────────────────────────────────────
//
// REST contract this module is written against (backend not yet built — see
// HANDOFF for the ticket split). Mirrors goodConductApi.ts / marriageApi.ts shapes:
//
//   GET  /scholarship/programs                        public, list open programs
//   GET  /scholarship/programs/:id                     public
//   POST /scholarship/applications/draft                auth
//   PUT  /scholarship/applications/:id/draft             auth
//   POST /scholarship/applications/:id/submit            auth
//   POST /scholarship/applications/:id/cancel            auth
//   GET  /scholarship/applications/:id                   auth
//   GET  /scholarship/applications                       auth (listMine)
//
//   POST /scholarship/applications/track/request-otp     public  \
//   POST /scholarship/applications/track/verify-otp      public   > see TrackByOtp
//   GET  /scholarship/applications/track/session         token   /
//
// There is deliberately NO public by-number lookup. It used to exist and
// returned the whole application — national ID, date of birth, applicant and
// guardian phones — keyed on a SEQUENTIAL number that could simply be counted
// through. Tracking is now gated on a random code plus an SMS OTP to the phone
// on file (migration 051).

export type ScholarshipApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'confirmed';

/**
 * Everything a verified tracking session may see — and nothing else.
 *
 * Mirrors `getTrackingInfo` on the backend exactly. Kept separate from
 * `ScholarshipApplication` (the authenticated, full record) so that widening one
 * cannot silently widen the other: an applicant proving control of their phone
 * earns the right to see where their case has got to, not to be read back their
 * own national ID.
 */
export interface ScholarshipPublicStatus {
  trackingCode: string;
  applicationNumber: string | null;
  fullNames: string;
  schoolName: string;
  educationLevel: EducationLevel;
  status: ScholarshipApplicationStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: Array<{ toStatus: ScholarshipApplicationStatus; changedAt: string }>;
}

export type EducationLevel = 'secondary' | 'tvet' | 'university';
export type GuardianRelationship = 'parent' | 'guardian' | 'sibling' | 'other';

export type ScholarshipProgramStatus = 'draft' | 'published' | 'closed';

export interface I18nText {
  en: string;
  rw: string;
  ar: string;
}

export interface RequiredDocument {
  key: string;
  label: I18nText;
  required: boolean;
}

/**
 * A scholarship OPPORTUNITY — what RMC announces and an application is made
 * against. `titleI18n`/`descriptionI18n` fall back to `title`/`description`,
 * matching how announcements behave, so rows authored before the trilingual
 * fields existed still render.
 */
export interface ScholarshipProgram {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  titleI18n: I18nText | null;
  descriptionI18n: I18nText | null;
  eligibilityI18n: I18nText | null;
  benefitsI18n: I18nText | null;
  requiredDocuments: RequiredDocument[];
  attachments: Array<{ key: string; name: string; mimeType: string; size: number }>;
  level: EducationLevel | null;
  amount: number | null;
  slots: number | null;
  referenceNumber: string | null;
  opensAt: string | null;
  deadline: string | null;
  status: ScholarshipProgramStatus;
  /** @deprecated Derived from `status`; prefer `status` in new code. */
  isOpen: boolean;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  notes: string | null;
  changedAt: string;
}

export type ScholarshipDocumentType = 'transcript' | 'academic_record' | 'proof' | 'additional';

export interface ScholarshipDocument {
  id: string;
  documentType: ScholarshipDocumentType;
  /**
   * Which of the scholarship's declared documents this file answers. Null for a
   * generic upload, or anything filed before scholarships declared their own
   * (migration 055) — `documentType` alone is a four-value label that cannot
   * tell two "additional" files apart.
   */
  requirementKey?: string | null;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  verified: boolean;
  verifiedAt: string | null;
  uploadedAt: string;
}

export interface SaveScholarshipDocumentPayload {
  documentType: ScholarshipDocumentType;
  /**
   * Which of the scholarship's declared `requiredDocuments` this file answers.
   * Omitted for generic uploads — `documentType` is only a four-value label, so
   * this is what actually identifies the document (migration 055).
   */
  requirementKey?: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ScholarshipApplication {
  id: string;
  /** Human reference for correspondence. Sequential — never a credential. */
  applicationNumber: string;
  /** The credential the applicant tracks with. Shown on the success screen. */
  trackingCode: string;
  applicantId: string;
  programId: string | null;
  fullNames: string;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | null;
  nationalId: string | null;
  phone: string;
  email: string | null;
  districtId: string | null;
  sectorId: string | null;
  cell: string | null;
  village: string | null;
  schoolName: string;
  educationLevel: EducationLevel;
  currentYear: string;
  averageGrade: string | null;
  guardianName: string;
  guardianPhone: string;
  relationship: GuardianRelationship;
  motivation: string;
  status: ScholarshipApplicationStatus;
  reviewNotes: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
  documents?: ScholarshipDocument[];
}

export interface CreateScholarshipApplicationPayload {
  /** REQUIRED — the scholarship being applied to. The backend rejects a payload without it. */
  programId: string;
  fullNames: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  nationalId?: string;
  phone: string;
  email?: string;
  districtId?: string;
  sectorId?: string;
  cell?: string;
  village?: string;
  schoolName: string;
  educationLevel: EducationLevel;
  currentYear: string;
  averageGrade?: string;
  guardianName: string;
  guardianPhone: string;
  relationship: GuardianRelationship;
  motivation: string;
}

// ── Status helpers ────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<ScholarshipApplicationStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  confirmed: 'bg-violet-100 text-violet-700',
};

// ── Member API ────────────────────────────────────────────────────────────────

export const scholarshipApi = {
  createDraft: async (payload: CreateScholarshipApplicationPayload): Promise<ScholarshipApplication> => {
    const { data } = await apiClient.post('/scholarship/applications/draft', payload);
    return data.data ?? data;
  },

  updateDraft: async (
    id: string,
    payload: Partial<CreateScholarshipApplicationPayload>,
  ): Promise<ScholarshipApplication> => {
    const { data } = await apiClient.put(`/scholarship/applications/${id}/draft`, payload);
    return data.data ?? data;
  },

  submit: async (id: string): Promise<ScholarshipApplication> => {
    const { data } = await apiClient.post(`/scholarship/applications/${id}/submit`);
    return data.data ?? data;
  },

  cancel: async (id: string): Promise<ScholarshipApplication> => {
    const { data } = await apiClient.post(`/scholarship/applications/${id}/cancel`);
    return data.data ?? data;
  },

  getById: async (id: string): Promise<ScholarshipApplication> => {
    const { data } = await apiClient.get(`/scholarship/applications/${id}`);
    return data.data ?? data;
  },

  listMine: async (): Promise<ScholarshipApplication[]> => {
    const { data } = await apiClient.get('/scholarship/applications');
    return data.data ?? data;
  },

  saveDocument: async (
    id: string,
    payload: SaveScholarshipDocumentPayload,
  ): Promise<ScholarshipDocument> => {
    const { data } = await apiClient.post(`/scholarship/applications/${id}/documents`, payload);
    return data.data ?? data;
  },

  deleteDocument: async (id: string, docId: string): Promise<void> => {
    await apiClient.delete(`/scholarship/applications/${id}/documents/${docId}`);
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

export const scholarshipPublicApi = {
  listPrograms: async (): Promise<ScholarshipProgram[]> => {
    try {
      const { data } = await apiClient.get('/scholarship/programs');
      return data.data ?? data;
    } catch {
      return [];
    }
  },

  getProgram: async (id: string): Promise<ScholarshipProgram | null> => {
    try {
      const { data } = await apiClient.get(`/scholarship/programs/${id}`);
      return data.data ?? data;
    } catch {
      return null;
    }
  },

  /** One scholarship by its public slug. Null for anything not published. */
  getProgramBySlug: async (slug: string): Promise<ScholarshipProgram | null> => {
    try {
      const { data } = await apiClient.get(`/scholarship/programs/slug/${encodeURIComponent(slug)}`);
      return data.data ?? data;
    } catch {
      return null;
    }
  },

};
