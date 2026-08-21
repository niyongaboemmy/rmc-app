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
  /** Extra documents the applicant uploads when responding to a more-info request. */
  additionalDocuments?: JobDocument[];
}

export interface JobApplication {
  id: string;
  trackingNumber: string;
  trackingCode: string;
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
  /** The admin-posted vacancy being applied to (preferred). */
  jobPostingId?: string;
  /** Only used for the legacy free-text path when no jobPostingId is given. */
  positionAppliedFor?: string;
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

/** Minimal, public-safe status view returned after phone-OTP verification. */
export interface JobApplicationPublicStatus {
  trackingCode: string;
  fullNames: string;
  positionAppliedFor: string;
  status: JobApplicationStatus;
  moreInfoRequested: string | null;
  rejectionReason: string | null;
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

  /**
   * Step 1 — request an SMS OTP. Only the tracking code is needed; the code is
   * sent to the phone captured when the application was submitted. Returns a
   * masked hint of that phone so the applicant knows where to look.
   */
  trackRequestOtp: async (trackingCode: string): Promise<{ expiresAt: string; phoneHint: string }> => {
    const { data } = await apiClient.post('/job-applications/track/request-otp', {
      trackingCode: trackingCode.trim(),
    });
    return data.data ?? data;
  },

  /** Step 2 — verify the OTP; returns a short-lived token plus the status. */
  trackVerifyOtp: async (
    trackingCode: string,
    otp: string,
  ): Promise<{ token: string } & JobApplicationPublicStatus> => {
    const { data } = await apiClient.post('/job-applications/track/verify-otp', {
      trackingCode: trackingCode.trim(),
      otp: otp.trim(),
    });
    return data.data ?? data;
  },

  /** Step 3 — refresh the status with a valid tracking token. */
  trackSession: async (token: string): Promise<JobApplicationPublicStatus> => {
    const { data } = await apiClient.get('/job-applications/track/session', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.data ?? data;
  },

  cancel: async (id: string): Promise<JobApplication> => {
    const { data } = await apiClient.post(`/job-applications/${id}/cancel`);
    return data.data ?? data;
  },

  respondMoreInfo: async (
    id: string,
    payload: { message: string; documents?: JobDocument[] },
  ): Promise<JobApplication> => {
    const { data } = await apiClient.post(`/job-applications/${id}/respond`, payload);
    return data.data ?? data;
  },
};
