import { apiClient } from './api';
import type { GoodConductRequest } from './goodConductApi';

export interface AdminGoodConductListResult {
  items: GoodConductRequest[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdminGoodConductStats {
  total: number;
  byStatus: { status: string; count: string }[];
  revenue: number;
}

export type GoodConductStatusAction = 'start_review' | 'approve' | 'reject' | 'request_more_info';

export interface UpdateGoodConductStatusPayload {
  action: GoodConductStatusAction;
  notes?: string;
  reason?: string;
}

export const goodConductAdminApi = {
  list: async (params?: {
    status?: string;
    paymentStatus?: string;
    mosqueId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminGoodConductListResult> => {
    const { data } = await apiClient.get('/admin/good-conduct/requests', { params });
    return data.data ?? data;
  },

  getOne: async (id: string): Promise<GoodConductRequest> => {
    const { data } = await apiClient.get(`/admin/good-conduct/requests/${id}`);
    return data.data ?? data;
  },

  updateStatus: async (id: string, payload: UpdateGoodConductStatusPayload): Promise<GoodConductRequest> => {
    const { data } = await apiClient.patch(`/admin/good-conduct/requests/${id}/status`, payload);
    return data.data ?? data;
  },

  assignImam: async (
    id: string,
    payload: { mosqueImamId?: string; note?: string },
  ): Promise<GoodConductRequest> => {
    const { data } = await apiClient.post(`/admin/good-conduct/requests/${id}/assign-imam`, payload);
    return data.data ?? data;
  },

  confirmPayment: async (
    id: string,
    payload: { method: 'cash' | 'bank'; amount: number },
  ): Promise<GoodConductRequest> => {
    const { data } = await apiClient.post(`/admin/good-conduct/requests/${id}/payment/confirm`, payload);
    return data.data ?? data;
  },

  issueCertificate: async (id: string): Promise<GoodConductRequest> => {
    const { data } = await apiClient.post(`/admin/good-conduct/requests/${id}/certificate`);
    return data.data ?? data;
  },

  getReports: async (params?: { dateFrom?: string; dateTo?: string }): Promise<AdminGoodConductStats> => {
    const { data } = await apiClient.get('/admin/good-conduct/reports', { params });
    return data.data ?? data;
  },

  /** Downloads the CSV via an authenticated request (the endpoint requires GOOD_CONDUCT_REPORTS). */
  exportCsv: async (params?: {
    status?: string;
    paymentStatus?: string;
    mosqueId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Blob> => {
    const { data } = await apiClient.get('/admin/good-conduct/reports/export', {
      params,
      responseType: 'blob',
    });
    return data;
  },
};
