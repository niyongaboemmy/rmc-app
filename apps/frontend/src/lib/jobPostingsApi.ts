import { apiClient } from './api';

export type JobPostingStatus = 'draft' | 'open' | 'closed';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'volunteer';

export interface JobPosting {
  id: string;
  title: string;
  slug: string;
  department: string | null;
  employmentType: EmploymentType;
  location: string | null;
  districtId: string | null;
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  numberOfPositions: number;
  salaryRange: string | null;
  status: JobPostingStatus;
  applicationDeadline: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  applicationsCount?: number;
}

export interface CreateJobPostingPayload {
  title: string;
  department?: string;
  employmentType?: EmploymentType;
  location?: string;
  districtId?: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  numberOfPositions?: number;
  salaryRange?: string;
  applicationDeadline?: string;
  status?: JobPostingStatus;
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  volunteer: 'Volunteer',
};

// ── Public ────────────────────────────────────────────────────────────────────

export const jobPostingsApi = {
  listOpen: async (params?: { search?: string; employmentType?: string; districtId?: string }): Promise<JobPosting[]> => {
    const { data } = await apiClient.get('/job-postings', { params });
    return data.data ?? data;
  },
  get: async (id: string): Promise<JobPosting> => {
    const { data } = await apiClient.get(`/job-postings/${id}`);
    return data.data ?? data;
  },
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const jobPostingsAdminApi = {
  list: async (params?: { status?: string; search?: string }): Promise<JobPosting[]> => {
    const { data } = await apiClient.get('/admin/job-postings', { params });
    return data.data ?? data;
  },
  get: async (id: string): Promise<JobPosting> => {
    const { data } = await apiClient.get(`/admin/job-postings/${id}`);
    return data.data ?? data;
  },
  create: async (payload: CreateJobPostingPayload): Promise<JobPosting> => {
    const { data } = await apiClient.post('/admin/job-postings', payload);
    return data.data ?? data;
  },
  update: async (id: string, payload: Partial<CreateJobPostingPayload>): Promise<JobPosting> => {
    const { data } = await apiClient.patch(`/admin/job-postings/${id}`, payload);
    return data.data ?? data;
  },
  publish: async (id: string): Promise<JobPosting> => {
    const { data } = await apiClient.post(`/admin/job-postings/${id}/publish`);
    return data.data ?? data;
  },
  close: async (id: string): Promise<JobPosting> => {
    const { data } = await apiClient.post(`/admin/job-postings/${id}/close`);
    return data.data ?? data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/job-postings/${id}`);
  },
};
