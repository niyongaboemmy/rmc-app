import { apiClient } from './api';
import type {
  ScholarshipApplication,
  ScholarshipProgram,
  EducationLevel,
} from './scholarshipApi';

/**
 * What the admin detail endpoint returns: the application plus the two things a
 * reviewer needs that are not columns on it — who applied, and WHICH scholarship
 * they applied to. Both are attached ad-hoc by `adminGetById`, not relations.
 */
export interface AdminScholarshipApplication extends ScholarshipApplication {
  applicant?: { id: string; name: string; email: string | null; phone: string | null };
  program?: Pick<
    ScholarshipProgram,
    'id' | 'slug' | 'title' | 'titleI18n' | 'level' | 'deadline' | 'status' | 'requiredDocuments'
  >;
}

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

export interface I18nTextPayload {
  en?: string;
  rw?: string;
  ar?: string;
}

export interface RequiredDocumentPayload {
  key: string;
  label: I18nTextPayload;
  required?: boolean;
}

/**
 * Note there is no `status`. Publishing and closing are their own endpoints, so
 * a half-written scholarship cannot go live through a general save.
 */
export interface CreateScholarshipProgramPayload {
  title: string;
  description: string;
  titleI18n?: I18nTextPayload;
  descriptionI18n?: I18nTextPayload;
  requiredDocuments?: RequiredDocumentPayload[];
  level?: EducationLevel;
  slots?: number;
  opensAt?: string;
  deadline?: string;
  referenceNumber?: string;
  /** @deprecated Derived from `status` server-side; kept for the old form. */
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

  getOne: async (id: string): Promise<AdminScholarshipApplication> => {
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

  verifyDocument: async (
    id: string,
    docId: string,
    verified: boolean,
  ): Promise<ScholarshipApplication> => {
    const { data } = await apiClient.patch(
      `/admin/scholarship/applications/${id}/documents/${docId}/verify`,
      { verified },
    );
    return data.data ?? data;
  },

  getReports: async (params?: { programId?: string; dateFrom?: string; dateTo?: string }): Promise<AdminScholarshipStats> => {
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

  /** Make it public. Rejects an incomplete offer (title, description, deadline). */
  publishProgram: async (id: string): Promise<ScholarshipProgram> => {
    const { data } = await apiClient.post(`/admin/scholarship/programs/${id}/publish`);
    return data.data ?? data;
  },

  /** Stop accepting applications. Submitted ones continue through review. */
  closeProgram: async (id: string): Promise<ScholarshipProgram> => {
    const { data } = await apiClient.post(`/admin/scholarship/programs/${id}/close`);
    return data.data ?? data;
  },

  deleteProgram: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/scholarship/programs/${id}`);
  },
};
