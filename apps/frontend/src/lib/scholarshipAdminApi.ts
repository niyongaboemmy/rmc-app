import { apiClient } from './api';
import type {
  ScholarshipApplication,
  ScholarshipProgram,
  EducationLevel,
} from './scholarshipApi';

export interface AdminScholarshipListResult {
  items: ScholarshipApplication[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdminScholarshipStats {
  total: number;
  byStatus: { status: string; count: string }[];
}

export type ScholarshipStatusAction = 'start_review' | 'approve' | 'reject' | 'confirm';

export interface UpdateScholarshipStatusPayload {
  action: ScholarshipStatusAction;
  notes?: string;
  reason?: string;
}

export interface CreateScholarshipProgramPayload {
  title: string;
  description: string;
  level?: EducationLevel;
  amount?: number;
  deadline?: string;
  isOpen?: boolean;
}

export const scholarshipAdminApi = {
  list: async (params?: {
    status?: string;
    programId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminScholarshipListResult> => {
    const { data } = await apiClient.get('/admin/scholarship/applications', { params });
    return data.data ?? data;
  },

  getOne: async (id: string): Promise<ScholarshipApplication> => {
    const { data } = await apiClient.get(`/admin/scholarship/applications/${id}`);
    return data.data ?? data;
  },

  updateStatus: async (
    id: string,
    payload: UpdateScholarshipStatusPayload,
  ): Promise<ScholarshipApplication> => {
    const { data } = await apiClient.patch(`/admin/scholarship/applications/${id}/status`, payload);
    return data.data ?? data;
  },

  getReports: async (params?: { dateFrom?: string; dateTo?: string }): Promise<AdminScholarshipStats> => {
    const { data } = await apiClient.get('/admin/scholarship/reports', { params });
    return data.data ?? data;
  },

  exportCsv: async (params?: {
    status?: string;
    programId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Blob> => {
    const { data } = await apiClient.get('/admin/scholarship/reports/export', {
      params,
      responseType: 'blob',
    });
    return data;
  },

  // ── Programs ──────────────────────────────────────────────────────────────

  listPrograms: async (): Promise<ScholarshipProgram[]> => {
    const { data } = await apiClient.get('/admin/scholarship/programs');
    return data.data ?? data;
  },

  createProgram: async (payload: CreateScholarshipProgramPayload): Promise<ScholarshipProgram> => {
    const { data } = await apiClient.post('/admin/scholarship/programs', payload);
    return data.data ?? data;
  },

  updateProgram: async (
    id: string,
    payload: Partial<CreateScholarshipProgramPayload>,
  ): Promise<ScholarshipProgram> => {
    const { data } = await apiClient.patch(`/admin/scholarship/programs/${id}`, payload);
    return data.data ?? data;
  },

  deleteProgram: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/scholarship/programs/${id}`);
  },
};
