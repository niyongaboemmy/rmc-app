import { apiClient } from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DonationStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type DonationFrequency = 'once' | 'monthly' | 'yearly';
export type CampaignStatus = 'active' | 'paused' | 'closed';

export interface DonationCampaign {
  id: string;
  title: string;
  slug: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  currency: string;
  fundType: string;
  subFundId: string | null;
  startDate: string;
  endDate: string | null;
  heroImageUrl: string | null;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignWithStats extends DonationCampaign {
  receivedAmount: number;
  donationCount: number;
}

/** Public donate-page program with its live raised total (completed transactions). */
export interface PublicCampaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  targetAmount: number;
  receivedAmount: number;
  currency: string;
  fundType: string;
  subFundId: string | null;
  heroImageUrl: string | null;
  startDate: string;
  endDate: string | null;
}

export interface Donation {
  id: string;
  campaignId: string | null;
  campaign: DonationCampaign | null;
  donorId: string | null;
  donorName: string | null;
  donorEmail: string | null;
  isAnonymous: boolean;
  amount: number;
  currency: string;
  frequency: DonationFrequency;
  paymentMethod: string | null;
  paymentReference: string | null;
  status: DonationStatus;
  message: string | null;
  donatedAt: string;
  createdAt: string;
}

export interface DonationsResult {
  items: Donation[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface DonationStats {
  count: number;
  byCurrency: { currency: string; count: number; received: number; pending: number; total: number }[];
  byProgram: { campaignId: string | null; title: string; currency: string; count: number; received: number; total: number }[];
  byStatus: { status: DonationStatus; count: number; total: number }[];
}

export interface CreateDonationPayload {
  campaignSlug?: string | null;
  amount: number;
  currency?: string;
  frequency?: DonationFrequency;
  paymentMethod?: string;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  isAnonymous?: boolean;
  message?: string;
}

export type DonationSort = 'date' | 'amount' | 'donor' | 'status';
export type SortOrder = 'ASC' | 'DESC';

export interface DonationFilters {
  dateFrom?: string;
  dateTo?: string;
  campaignId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: DonationSort;
  order?: SortOrder;
}

/** One day in the dashboard daily-received series. */
export interface DailyPoint {
  date: string;
  received: number;
  count: number;
}
export interface DailyReceived {
  currency: string;
  days: number;
  series: DailyPoint[];
}

export interface CampaignPayload {
  title?: string;
  slug?: string;
  description?: string;
  targetAmount?: number;
  raisedAmount?: number;
  currency?: string;
  fundType?: string;
  subFundId?: string | null;
  startDate?: string;
  endDate?: string | null;
  heroImageUrl?: string | null;
  status?: CampaignStatus;
}

export interface UpdateDonationPayload {
  amount?: number;
  status?: DonationStatus;
  frequency?: DonationFrequency;
  campaignId?: string | null;
  donorName?: string;
  donorEmail?: string;
  currency?: string;
}

// ── Display helpers ─────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<DonationStatus, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
};

export const STATUS_LABELS: Record<DonationStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
};

const SYMBOLS: Record<string, string> = { RWF: 'RWF', USD: '$', EUR: '€', GBP: '£' };

export function formatCurrency(currency: string, amount: number): string {
  const n = Number(amount || 0).toLocaleString('en-US');
  return currency === 'RWF' ? `RWF ${n}` : `${SYMBOLS[currency] ?? currency} ${n}`;
}

// ── API ─────────────────────────────────────────────────────────────────────────

export const donationsApi = {
  // Public
  listCampaigns: async (): Promise<PublicCampaign[]> => {
    const { data } = await apiClient.get('/donations/campaigns');
    return data.data ?? data;
  },

  donate: async (payload: CreateDonationPayload): Promise<Donation> => {
    const { data } = await apiClient.post('/donations', payload);
    return data.data ?? data;
  },

  /** Re-check a pending (gateway-backed) donation and get its current status. */
  checkStatus: async (id: string): Promise<Donation> => {
    const { data } = await apiClient.get(`/donations/${id}/status`);
    return data.data ?? data;
  },

  // Admin
  admin: {
    list: async (filters?: DonationFilters): Promise<DonationsResult> => {
      const { data } = await apiClient.get('/admin/donations', { params: filters });
      return data.data ?? data;
    },

    getStats: async (filters?: Omit<DonationFilters, 'page' | 'limit' | 'search'>): Promise<DonationStats> => {
      const { data } = await apiClient.get('/admin/donations/stats', { params: filters });
      return data.data ?? data;
    },

    getDaily: async (days = 30, currency = 'RWF'): Promise<DailyReceived> => {
      const { data } = await apiClient.get('/admin/donations/daily', { params: { days, currency } });
      return data.data ?? data;
    },

    updateDonation: async (id: string, payload: UpdateDonationPayload): Promise<Donation> => {
      const { data } = await apiClient.patch(`/admin/donations/${id}`, payload);
      return data.data ?? data;
    },

    listCampaigns: async (): Promise<CampaignWithStats[]> => {
      const { data } = await apiClient.get('/admin/donations/campaigns');
      return data.data ?? data;
    },

    listDeletedCampaigns: async (): Promise<CampaignWithStats[]> => {
      const { data } = await apiClient.get('/admin/donations/campaigns/deleted');
      return data.data ?? data;
    },

    restoreCampaign: async (id: string): Promise<void> => {
      await apiClient.post(`/admin/donations/campaigns/${id}/restore`);
    },

    createCampaign: async (payload: CampaignPayload): Promise<DonationCampaign> => {
      const { data } = await apiClient.post('/admin/donations/campaigns', payload);
      return data.data ?? data;
    },

    updateCampaign: async (id: string, payload: CampaignPayload): Promise<DonationCampaign> => {
      const { data } = await apiClient.patch(`/admin/donations/campaigns/${id}`, payload);
      return data.data ?? data;
    },

    deleteCampaign: async (id: string): Promise<void> => {
      await apiClient.delete(`/admin/donations/campaigns/${id}`);
    },
  },
};
