import { apiClient } from './api';
import type { JobApplication } from './jobsApi';

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
  notes?: string;
  reason?: string;
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
};
