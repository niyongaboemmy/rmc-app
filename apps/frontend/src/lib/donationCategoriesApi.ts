import { apiClient } from './api';

// ── Public (localized) shape — consumed by the donate page ───────────────────

export interface PublicSubFund {
  id: string;
  key: string;
  image: string | null;
  campaignSlug: string | null;
  label: string;
  long: string;
  impact: string;
  examples: string[];
}

export interface PublicCategory {
  id: string;
  key: string;
  icon: string;
  tone: string;
  image: string | null;
  title: string;
  desc: string;
  long: string;
  impact: string;
  subfunds: PublicSubFund[];
}

// ── Admin (full multilingual) shape ──────────────────────────────────────────

export type CategoryStatus = 'active' | 'inactive';
export interface Tri { en: string; rw: string; ar: string }
export interface TriListT { en: string[]; rw: string[]; ar: string[] }

export interface AdminSubFund {
  id: string;
  categoryId: string;
  key: string;
  image: string | null;
  campaignSlug: string | null;
  labelEn: string; labelRw: string; labelAr: string;
  longEn: string; longRw: string; longAr: string;
  impactEn: string; impactRw: string; impactAr: string;
  examplesEn: string[]; examplesRw: string[]; examplesAr: string[];
  sortOrder: number;
  status: CategoryStatus;
}

export interface AdminCategory {
  id: string;
  key: string;
  icon: string;
  tone: string;
  image: string | null;
  titleEn: string; titleRw: string; titleAr: string;
  descEn: string; descRw: string; descAr: string;
  longEn: string; longRw: string; longAr: string;
  impactEn: string; impactRw: string; impactAr: string;
  sortOrder: number;
  status: CategoryStatus;
  subfunds: AdminSubFund[];
}

// ── Payloads (nested tri objects, mapped to columns on the backend) ──────────

export interface CategoryPayload {
  key?: string;
  icon?: string;
  tone?: string;
  image?: string;
  title?: Partial<Tri>;
  desc?: Partial<Tri>;
  long?: Partial<Tri>;
  impact?: Partial<Tri>;
  sortOrder?: number;
  status?: CategoryStatus;
}

export interface SubFundPayload {
  key?: string;
  image?: string;
  campaignSlug?: string | null;
  label?: Partial<Tri>;
  long?: Partial<Tri>;
  impact?: Partial<Tri>;
  examples?: Partial<TriListT>;
  sortOrder?: number;
  status?: CategoryStatus;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const donationCategoriesApi = {
  /** Public localized categories + sub-funds for the donate page. */
  listPublic: async (locale: string): Promise<PublicCategory[]> => {
    const { data } = await apiClient.get('/donations/categories', { params: { locale } });
    return data.data ?? data;
  },

  admin: {
    list: async (): Promise<AdminCategory[]> => {
      const { data } = await apiClient.get('/admin/donations/categories');
      return data.data ?? data;
    },
    listDeleted: async (): Promise<AdminCategory[]> => {
      const { data } = await apiClient.get('/admin/donations/categories/deleted');
      return data.data ?? data;
    },
    restoreCategory: async (id: string): Promise<void> => {
      await apiClient.post(`/admin/donations/categories/${id}/restore`);
    },
    createCategory: async (payload: CategoryPayload): Promise<AdminCategory> => {
      const { data } = await apiClient.post('/admin/donations/categories', payload);
      return data.data ?? data;
    },
    updateCategory: async (id: string, payload: CategoryPayload): Promise<AdminCategory> => {
      const { data } = await apiClient.patch(`/admin/donations/categories/${id}`, payload);
      return data.data ?? data;
    },
    deleteCategory: async (id: string): Promise<void> => {
      await apiClient.delete(`/admin/donations/categories/${id}`);
    },
    createSubFund: async (categoryId: string, payload: SubFundPayload): Promise<AdminSubFund> => {
      const { data } = await apiClient.post(`/admin/donations/categories/${categoryId}/subfunds`, payload);
      return data.data ?? data;
    },
    updateSubFund: async (subId: string, payload: SubFundPayload): Promise<AdminSubFund> => {
      const { data } = await apiClient.patch(`/admin/donations/categories/subfunds/${subId}`, payload);
      return data.data ?? data;
    },
    deleteSubFund: async (subId: string): Promise<void> => {
      await apiClient.delete(`/admin/donations/categories/subfunds/${subId}`);
    },
  },
};
