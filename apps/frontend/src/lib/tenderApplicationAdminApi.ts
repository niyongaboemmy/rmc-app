import { apiClient } from './api';
import type {
  TenderApplication,
  TenderApplicationDocument,
  TenderApplicationStatus,
  TenderDocumentType,
  TenderMoreInfoField,
} from './tenderApplicationApi';

export interface AdminTenderApplication extends TenderApplication {
  applicant?: { id: string; name: string; email: string | null; phone: string | null };
}

export interface AdminListFilters {
  status?: string;
  tenderId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedApplications {
  items: AdminTenderApplication[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface TenderReports {
  total: number;
  byStatus: Array<{ status: TenderApplicationStatus; count: string }>;
  awardedValue: number;
}

/** Admin action names — the backend maps each to the resulting status. */
export type TenderStatusAction =
  | 'start_review'
  | 'request_more_info'
  | 'shortlist'
  | 'award'
  | 'reject';

export const tenderApplicationAdminApi = {
  list: async (filters: AdminListFilters = {}): Promise<PaginatedApplications> => {
    const { data } = await apiClient.get('/admin/tenders/applications', { params: filters });
    return data.data ?? data;
  },

  getById: async (id: string): Promise<AdminTenderApplication> => {
    const { data } = await apiClient.get(`/admin/tenders/applications/${id}`);
    return data.data ?? data;
  },

  updateStatus: async (
    id: string,
    action: TenderStatusAction,
    body: {
      notes?: string;
      reason?: string;
      /** request_more_info only — what the bidder is allowed to correct. */
      moreInfoFields?: TenderMoreInfoField[];
      moreInfoDocumentTypes?: TenderDocumentType[];
    } = {},
  ): Promise<AdminTenderApplication> => {
    const { data } = await apiClient.patch(`/admin/tenders/applications/${id}/status`, {
      action,
      ...body,
    });
    return data.data ?? data;
  },

  verifyDocument: async (
    id: string,
    documentId: string,
    verified: boolean,
  ): Promise<TenderApplicationDocument> => {
    const { data } = await apiClient.patch(
      `/admin/tenders/applications/${id}/documents/${documentId}/verify`,
      { verified },
    );
    return data.data ?? data;
  },

  getReports: async (filters: { dateFrom?: string; dateTo?: string } = {}): Promise<TenderReports> => {
    const { data } = await apiClient.get('/admin/tenders/reports', { params: filters });
    return data.data ?? data;
  },

  /** Streams the CSV back as a Blob so the caller can trigger a download. */
  exportCsv: async (filters: AdminListFilters = {}): Promise<Blob> => {
    const { data } = await apiClient.get('/admin/tenders/reports/export', {
      params: filters,
      responseType: 'blob',
    });
    return data;
  },
};
