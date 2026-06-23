import { apiClient } from './api';
import type { SchoolLevel } from '@/components/schools/data';

// ── Types ────────────────────────────────────────────────────────────────────

export type SchoolStatus = 'active' | 'inactive';

export interface School {
  id: string;
  name: string;
  level: SchoolLevel;
  principalName: string | null;
  phone: string | null;
  email: string | null;
  district: string | null;
  provinceCode: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  status: SchoolStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolPayload {
  name: string;
  level: SchoolLevel;
  principalName?: string;
  phone?: string;
  email?: string;
  district?: string;
  provinceCode?: string;
  gpsLat?: number;
  gpsLng?: number;
  status?: SchoolStatus;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const schoolsApi = {
  // Public — active schools for the directory/map.
  list: async (): Promise<School[]> => {
    const { data } = await apiClient.get('/schools');
    return data.data ?? data;
  },

  // Admin
  admin: {
    list: async (): Promise<School[]> => {
      const { data } = await apiClient.get('/admin/schools');
      return data.data ?? data;
    },

    create: async (payload: SchoolPayload): Promise<School> => {
      const { data } = await apiClient.post('/admin/schools', payload);
      return data.data ?? data;
    },

    update: async (id: string, payload: Partial<SchoolPayload>): Promise<School> => {
      const { data } = await apiClient.patch(`/admin/schools/${id}`, payload);
      return data.data ?? data;
    },

    remove: async (id: string): Promise<void> => {
      await apiClient.delete(`/admin/schools/${id}`);
    },
  },
};
