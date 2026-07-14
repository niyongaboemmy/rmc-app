import { apiClient } from './api';

// ── Types ──────────────────────────────────────────────────────────────────────
// Frontend contract for the Job Applications service. Mirrors the shape of the
// good-conduct API so the backend module (not yet built) can slot in behind it.

export type JobApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'more_info_requested'
  | 'accepted'
  | 'rejected'
  | 'cancelled';

export interface JobStatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  notes: string | null;
  changedAt: string;
}

/** A single uploaded document — the `key` is what the file-server returns. */
export interface JobDocument {
  key: string;
  name: string;
}

export interface JobApplicationDocuments {
  applicationLetter: JobDocument;
  cv: JobDocument;
  nationalId: JobDocument;
  criminalRecord: JobDocument;
  academicPapers: JobDocument[];
  /** Either a verified good-conduct certificate number… */
  goodConductCertificateNumber?: string;
  /** …or an uploaded good-conduct certificate file. */
  goodConductCertificate?: JobDocument;
  /** Optional employer recommendation letter. */
  employerRecommendation?: JobDocument;
}

export interface JobApplication {
  id: string;
  trackingNumber: string;
  applicantId: string;
  fullNames: string;
  email: string | null;
  phone: string;
  positionAppliedFor: string;
  districtId: string | null;
  sectorId: string | null;
  cell: string | null;
  village: string | null;
  documents: JobApplicationDocuments;
  status: JobApplicationStatus;
  reviewNotes: string | null;
  rejectionReason: string | null;
  moreInfoRequested: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: JobStatusHistoryEntry[];
}

export interface CreateJobApplicationPayload {
  fullNames: string;
  email?: string;
  phone: string;
  positionAppliedFor: string;
  districtId?: string;
  sectorId?: string;
  cell?: string;
  village?: string;
  documents: JobApplicationDocuments;
}

// ── Status helpers ──────────────────────────────────────────────────────────────

export const JOB_STATUS_COLORS: Record<JobApplicationStatus, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  shortlisted: 'bg-emerald-100 text-emerald-700',
  more_info_requested: 'bg-orange-100 text-orange-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

/** Minimal, public-safe status view returned by the tracking-number lookup. */
export interface JobApplicationPublicStatus {
  trackingNumber: string;
  fullNames: string;
  positionAppliedFor: string;
  status: JobApplicationStatus;
  submittedAt: string | null;
  createdAt: string;
  statusHistory: { fromStatus: string | null; toStatus: string; changedAt: string }[];
}

// ── Member API ──────────────────────────────────────────────────────────────────

export const jobsApi = {
  create: async (payload: CreateJobApplicationPayload): Promise<JobApplication> => {
    const { data } = await apiClient.post('/job-applications', payload);
    return data.data ?? data;
  },

  listMine: async (): Promise<JobApplication[]> => {
    const { data } = await apiClient.get('/job-applications');
    return data.data ?? data;
  },

  getById: async (id: string): Promise<JobApplication> => {
    const { data } = await apiClient.get(`/job-applications/${id}`);
    return data.data ?? data;
  },

  /** Public status lookup by tracking number — returns null when not found. */
  track: async (trackingNumber: string): Promise<JobApplicationPublicStatus | null> => {
    try {
      const { data } = await apiClient.get(
        `/job-applications/track/${encodeURIComponent(trackingNumber.trim())}`,
      );
      return data.data ?? data;
    } catch {
      return null;
    }
  },

  cancel: async (id: string): Promise<JobApplication> => {
    const { data } = await apiClient.post(`/job-applications/${id}/cancel`);
    return data.data ?? data;
  },
};
