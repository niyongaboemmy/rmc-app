import { apiClient } from './api';
import type { JobApplication, JobApplicationStatus } from './jobsApi';

export interface AdminJobsListResult {
  items: JobApplication[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type JobStatusAction =
  | 'start_review'
  | 'shortlist'
  | 'accept'
  | 'reject'
  | 'request_more_info';

export interface UpdateJobStatusPayload {
  action: JobStatusAction;
  /** Requested document keys, for `request_more_info`. */
  documents?: string[];
  notes?: string;
  reason?: string;
}

/** Application counts by status over an optional date range (admin reports). */
export interface JobReports {
  total: number;
  byStatus: Array<{ status: JobApplicationStatus; count: string }>;
}

export const jobsAdminApi = {
  list: async (params?: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminJobsListResult> => {
    const { data } = await apiClient.get('/admin/job-applications', { params });
    return data.data ?? data;
  },

  getOne: async (id: string): Promise<JobApplication> => {
    const { data } = await apiClient.get(`/admin/job-applications/${id}`);
    return data.data ?? data;
  },

  updateStatus: async (id: string, payload: UpdateJobStatusPayload): Promise<JobApplication> => {
    const { data } = await apiClient.patch(`/admin/job-applications/${id}/status`, payload);
    return data.data ?? data;
  },

  getReports: async (params?: { dateFrom?: string; dateTo?: string }): Promise<JobReports> => {
    const { data } = await apiClient.get('/admin/job-applications/reports', { params });
    return data.data ?? data;
  },
};
