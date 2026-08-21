/**
 * Funeral Services API client — backed by the NestJS funeral module
 * (requests, cemeteries, and lifecycle steps).
 */

import axios from 'axios';
import { apiClient, API_BASE_URL } from './api';
import { downloadXlsx } from './downloadXlsx';
import type {
  FuneralRequestPayload,
  FuneralRequest,
  FuneralStage,
  FuneralStepConfig,
  Cemetery,
  Transport,
} from '@/components/funeral/types';

export type CemeteryPayload = Omit<Cemetery, 'id'>;
export type TransportPayload = Omit<Transport, 'id' | 'mosque'>;

export interface StepInput {
  key?: string;
  titleEn?: string;
  titleRw?: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionRw?: string;
  descriptionAr?: string;
  sortOrder?: number;
  isActive?: boolean;
  color?: string;
  icon?: string;
}

export interface FuneralRequestResult {
  id: string;
  status: 'received';
}

export interface FuneralStatsResult {
  total: number;
  pending: number;
  completed: number;
  byStage: Record<FuneralStage, number>;
}

/** Accepted certificate formats — kept in step with the backend's allow-list. */
export const FUNERAL_DOC_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';
export const FUNERAL_DOC_MAX_BYTES = 10 * 1024 * 1024;

/** What POST /funeral/documents returns once the certificate is stored. */
export interface UploadedFuneralDocument {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export const funeralApi = {
  // ── Public ──────────────────────────────────────────────────────────────
  /**
   * Upload the death certificate. Goes to the backend (not the file server), which
   * validates it and forwards it under a service token — no auth needed here.
   *
   * Raw axios, not apiClient: the shared instance forces
   * `Content-Type: application/json`, which strips the multipart boundary and the
   * server then sees no file at all.
   */
  async uploadDocument(
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<UploadedFuneralDocument> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await axios.post(`${API_BASE_URL}/funeral/documents`, form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return data.data ?? data;
  },

  /** Submit a new funeral service request. */
  async submitRequest(payload: FuneralRequestPayload): Promise<FuneralRequestResult> {
    const { data } = await apiClient.post('/funeral/requests', payload);
    return data.data ?? data;
  },

  /**
   * Admin — fetch the death certificate's bytes as an object URL.
   *
   * The certificate is NOT publicly readable; it comes through the authenticated
   * admin route. Revoke the URL with URL.revokeObjectURL() when done.
   */
  async deathCertificateObjectUrl(requestId: string): Promise<string> {
    const { data } = await apiClient.get(
      `/admin/funeral/requests/${requestId}/death-certificate`,
      { responseType: 'blob' },
    );
    return URL.createObjectURL(data as Blob);
  },

  // ── Admin ───────────────────────────────────────────────────────────────
  /** List funeral requests (admin). */
  async listRequests(params?: { stage?: string; search?: string }): Promise<FuneralRequest[]> {
    const { data } = await apiClient.get('/admin/funeral/requests', { params });
    return data.data ?? data;
  },

  /** Admin — download the requests matching the filters as an .xlsx report. */
  exportRequestsXlsx(params?: { stage?: string; search?: string }): Promise<void> {
    return downloadXlsx('/admin/funeral/requests/export', { ...params }, 'funeral-requests');
  },

  /** Fetch a single request by id (admin). */
  async getRequest(id: string): Promise<FuneralRequest> {
    const { data } = await apiClient.get(`/admin/funeral/requests/${id}`);
    return data.data ?? data;
  },

  /** Move a request to a new stage (admin). Returns the updated request. */
  async updateRequestStage(id: string, stage: FuneralStage, notes?: string): Promise<FuneralRequest> {
    const { data } = await apiClient.patch(`/admin/funeral/requests/${id}/stage`, { stage, notes });
    return data.data ?? data;
  },

  /** Headline request figures (admin). */
  async getStats(): Promise<FuneralStatsResult> {
    const { data } = await apiClient.get('/admin/funeral/stats');
    return data.data ?? data;
  },

  // ── Cemeteries ────────────────────────────────────────────────────────────
  /** List cemeteries (public directory + admin). */
  async listCemeteries(): Promise<Cemetery[]> {
    const { data } = await apiClient.get('/funeral/cemeteries');
    return data.data ?? data;
  },

  /** Create a cemetery (admin). */
  async createCemetery(payload: CemeteryPayload): Promise<Cemetery> {
    const { data } = await apiClient.post('/admin/funeral/cemeteries', payload);
    return data.data ?? data;
  },

  /** Update a cemetery (admin). */
  async updateCemetery(id: string, payload: CemeteryPayload): Promise<Cemetery> {
    const { data } = await apiClient.patch(`/admin/funeral/cemeteries/${id}`, payload);
    return data.data ?? data;
  },

  /** Delete a cemetery (admin). */
  async deleteCemetery(id: string): Promise<void> {
    await apiClient.delete(`/admin/funeral/cemeteries/${id}`);
  },

  // ── Transports ────────────────────────────────────────────────────────────
  /** Active transport means grouped-ready (public directory). */
  async listTransports(): Promise<Transport[]> {
    const { data } = await apiClient.get('/funeral/transports');
    return data.data ?? data;
  },

  /** All transports incl. inactive (admin). */
  async adminListTransports(): Promise<Transport[]> {
    const { data } = await apiClient.get('/admin/funeral/transports');
    return data.data ?? data;
  },

  async createTransport(payload: TransportPayload): Promise<Transport> {
    const { data } = await apiClient.post('/admin/funeral/transports', payload);
    return data.data ?? data;
  },

  async updateTransport(id: string, payload: TransportPayload): Promise<Transport> {
    const { data } = await apiClient.patch(`/admin/funeral/transports/${id}`, payload);
    return data.data ?? data;
  },

  async deleteTransport(id: string): Promise<void> {
    await apiClient.delete(`/admin/funeral/transports/${id}`);
  },

  // ── Lifecycle steps (CMS) ─────────────────────────────────────────────────
  /** Active lifecycle steps (public — drives the status timeline). */
  async listSteps(): Promise<FuneralStepConfig[]> {
    const { data } = await apiClient.get('/funeral/steps');
    return data.data ?? data;
  },

  /** All steps incl. inactive (admin). */
  async adminListSteps(): Promise<FuneralStepConfig[]> {
    const { data } = await apiClient.get('/admin/funeral/steps');
    return data.data ?? data;
  },

  async createStep(payload: StepInput): Promise<FuneralStepConfig> {
    const { data } = await apiClient.post('/admin/funeral/steps', payload);
    return data.data ?? data;
  },

  async updateStep(id: string, payload: StepInput): Promise<FuneralStepConfig> {
    const { data } = await apiClient.patch(`/admin/funeral/steps/${id}`, payload);
    return data.data ?? data;
  },

  async deleteStep(id: string): Promise<void> {
    await apiClient.delete(`/admin/funeral/steps/${id}`);
  },

  /** Persist a new step order (ids in display order). */
  async reorderSteps(ids: string[]): Promise<FuneralStepConfig[]> {
    const { data } = await apiClient.patch('/admin/funeral/steps/reorder', { ids });
    return data.data ?? data;
  },
};
