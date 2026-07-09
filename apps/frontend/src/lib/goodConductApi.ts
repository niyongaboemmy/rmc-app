import { apiClient } from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type GoodConductStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'more_info_requested'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'closed';

export type PaymentStatus = 'unpaid' | 'pending_cash' | 'processing' | 'paid' | 'refunded' | 'failed';
export type GoodConductMotif = 'employment' | 'visa' | 'school' | 'other';

export interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  notes: string | null;
  changedAt: string;
}

export interface GoodConductRequest {
  id: string;
  certificateNumber: string | null;
  applicantId: string;
  fullNames: string;
  fatherName: string | null;
  motherName: string | null;
  districtId: string | null;
  sectorId: string | null;
  cell: string | null;
  village: string | null;
  email: string | null;
  phone: string;
  mosqueId: string | null;
  requestedImamName: string | null;
  assignedImamId: string | null;
  motif: GoodConductMotif;
  motifDetail: string | null;
  status: GoodConductStatus;
  paymentStatus: PaymentStatus;
  amountDue: number;
  amountPaid: number;
  reviewNotes: string | null;
  rejectionReason: string | null;
  moreInfoRequested: string | null;
  certificateUrl: string | null;
  certificateIssuedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
}

export interface CreateGoodConductRequestPayload {
  fullNames: string;
  fatherName?: string;
  motherName?: string;
  districtId?: string;
  sectorId?: string;
  cell?: string;
  village?: string;
  email?: string;
  phone: string;
  mosqueId?: string;
  requestedImamName?: string;
  motif: GoodConductMotif;
  motifDetail?: string;
}

export interface PaymentCheckResult {
  paymentStatus: string;
  gatewayStatus: string;
  responseCode: string;
  message: string;
}

// ── Status helpers ────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<GoodConductStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  more_info_requested: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  closed: 'bg-purple-100 text-purple-700',
};

// ── Member API ────────────────────────────────────────────────────────────────

export const goodConductApi = {
  createDraft: async (payload: CreateGoodConductRequestPayload): Promise<GoodConductRequest> => {
    const { data } = await apiClient.post('/good-conduct/requests', payload);
    return data.data ?? data;
  },

  updateDraft: async (
    id: string,
    payload: Partial<CreateGoodConductRequestPayload>,
  ): Promise<GoodConductRequest> => {
    const { data } = await apiClient.patch(`/good-conduct/requests/${id}`, payload);
    return data.data ?? data;
  },

  cancel: async (id: string): Promise<GoodConductRequest> => {
    const { data } = await apiClient.post(`/good-conduct/requests/${id}/cancel`);
    return data.data ?? data;
  },

  getById: async (id: string): Promise<GoodConductRequest> => {
    const { data } = await apiClient.get(`/good-conduct/requests/${id}`);
    return data.data ?? data;
  },

  listMine: async (): Promise<GoodConductRequest[]> => {
    const { data } = await apiClient.get('/good-conduct/requests');
    return data.data ?? data;
  },

  initiateMomoPayment: async (
    id: string,
    mobilePhone: string,
  ): Promise<{
    request: GoodConductRequest;
    transaction: { id: string; status: string; providerRef: string | null };
    gatewayRef: string | null;
    responseCode: string;
    message: string;
  }> => {
    const { data } = await apiClient.post(`/good-conduct/requests/${id}/pay`, { mobilePhone });
    return data.data ?? data;
  },

  submitBankTransferNotice: async (id: string): Promise<GoodConductRequest> => {
    const { data } = await apiClient.post(`/good-conduct/requests/${id}/pay/bank-notice`);
    return data.data ?? data;
  },

  checkPaymentStatus: async (id: string): Promise<PaymentCheckResult> => {
    const { data } = await apiClient.get(`/good-conduct/requests/${id}/pay/status`);
    return data.data ?? data;
  },

  getCertificateData: async (id: string): Promise<GoodConductCertificateData> => {
    const { data } = await apiClient.get(`/good-conduct/requests/${id}/certificate-data`);
    return data.data ?? data;
  },
};

export interface GoodConductCertificateData {
  id: string;
  certificateNumber: string;
  fullNames: string;
  fatherName: string | null;
  motherName: string | null;
  residence: string;
  mosqueName: string | null;
  imamName: string | null;
  motif: GoodConductMotif;
  motifDetail: string | null;
  certificateIssuedAt: string;
  verifyUrl: string | null;
}

export interface PublicVerification {
  certificateNumber: string;
  fullName: string;
  mosqueName: string | null;
  imamName: string | null;
  motif: GoodConductMotif;
  issuedAt: string | null;
  status: 'valid';
}

export interface BankTransferDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export const goodConductPublicApi = {
  verify: async (certificateNumber: string): Promise<PublicVerification | null> => {
    try {
      const { data } = await apiClient.get(`/good-conduct/public/verify/${certificateNumber}`);
      return data.data ?? data;
    } catch {
      return null;
    }
  },

  /** Real, admin-configured bank details — null if not yet configured (never a fabricated fallback). */
  getBankDetails: async (): Promise<BankTransferDetails | null> => {
    try {
      const { data } = await apiClient.get('/good-conduct/public/bank-details');
      // `data.data` is legitimately `null` when bank transfer isn't configured yet —
      // unlike other endpoints here, `?? data` would wrongly fall back to the envelope.
      return data.data;
    } catch {
      return null;
    }
  },
};
