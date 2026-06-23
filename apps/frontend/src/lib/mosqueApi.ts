import { apiClient } from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type MosqueStatus = 'active' | 'inactive';

export interface Mosque {
  id: string;
  name: string;
  parentMosqueId: string | null;
  address: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  provinceId: string | null;
  districtId: string | null;
  sectorId: string | null;
  capacity: number | null;
  foundingYear: number | null;
  phone: string | null;
  email: string | null;
  fridayPrayerTime: string | null;
  imamName: string | null;
  imamPhone: string | null;
  imamPhoto: string | null;
  status: MosqueStatus;
  createdAt: string;
  updatedAt: string;
}

/** Payload for create/update — mirrors the backend CreateMosqueDto. */
export interface MosqueInput {
  name: string;
  parentMosqueId?: string | null;
  address?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  provinceId?: string | null;
  districtId?: string | null;
  sectorId?: string | null;
  capacity?: number | null;
  foundingYear?: number | null;
  phone?: string | null;
  email?: string | null;
  fridayPrayerTime?: string | null;
  imamName?: string | null;
  imamPhone?: string | null;
  imamPhoto?: string | null;
}

export interface MosqueImam {
  id: string;
  mosqueId: string;
  userId: string;
  isPrimary: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface AssignImamInput {
  userId: string;
  isPrimary?: boolean;
  startDate?: string;
  endDate?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface ListParams {
  districtId?: string;
  status?: MosqueStatus;
}

/**
 * Strip empty strings to `undefined` so optional UUID / number fields validate
 * server-side (class-validator rejects empty strings on @IsUUID / @IsNumber).
 */
function clean(input: MosqueInput): MosqueInput {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === '' || value === null) continue;
    out[key] = value;
  }
  return out as unknown as MosqueInput;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const mosqueApi = {
  list: async (params: ListParams = {}): Promise<Mosque[]> => {
    const res = await apiClient.get<{ data: Mosque[] }>('/mosques', { params });
    return res.data.data;
  },

  get: async (id: string): Promise<Mosque> => {
    const res = await apiClient.get<{ data: Mosque }>(`/mosques/${id}`);
    return res.data.data;
  },

  create: async (input: MosqueInput): Promise<Mosque> => {
    const res = await apiClient.post<{ data: Mosque }>('/mosques', clean(input));
    return res.data.data;
  },

  update: async (id: string, input: MosqueInput): Promise<Mosque> => {
    const res = await apiClient.put<{ data: Mosque }>(`/mosques/${id}`, clean(input));
    return res.data.data;
  },

  /** Soft-delete — backend sets status to `inactive`. */
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/mosques/${id}`);
  },

  /** Re-activate a deactivated mosque. */
  reactivate: async (id: string, input: MosqueInput): Promise<Mosque> => {
    const res = await apiClient.put<{ data: Mosque }>(`/mosques/${id}`, {
      ...clean(input),
      status: 'active',
    });
    return res.data.data;
  },

  getImams: async (id: string): Promise<MosqueImam[]> => {
    const res = await apiClient.get<{ data: MosqueImam[] }>(`/mosques/${id}/imams`);
    return res.data.data;
  },

  assignImam: async (id: string, input: AssignImamInput): Promise<MosqueImam> => {
    const res = await apiClient.post<{ data: MosqueImam }>(`/mosques/${id}/imams`, input);
    return res.data.data;
  },
};
