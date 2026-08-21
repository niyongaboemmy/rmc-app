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
//   GET  /scholarship/applications/by-number/:number     public (status tracking)

export type ScholarshipApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'confirmed';

export type EducationLevel = 'secondary' | 'tvet' | 'university';
export type GuardianRelationship = 'parent' | 'guardian' | 'sibling' | 'other';

export interface ScholarshipProgram {
  id: string;
  title: string;
  description: string;
  level: EducationLevel | null;
  amount: number | null;
  deadline: string | null;
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
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ScholarshipApplication {
  id: string;
  applicationNumber: string;
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
  programId?: string;
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

  getByNumber: async (number: string): Promise<ScholarshipApplication | null> => {
    try {
      const { data } = await apiClient.get(`/scholarship/applications/by-number/${number}`);
      return data.data ?? data;
    } catch {
      return null;
    }
  },
};
