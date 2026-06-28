import { apiClient } from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type MarriageApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'amendments_requested'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'closed';

export type PaymentStatus = 'unpaid' | 'pending_cash' | 'processing' | 'paid' | 'refunded' | 'failed';
export type VenueType = 'mosque' | 'outside';
export type PaymentMethod = 'momo' | 'bank' | 'cash';

export interface MarriageDocument {
  id: string;
  documentType: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  verified: boolean;
  verifiedAt: string | null;
  uploadedAt: string;
}

export interface ApplicantSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  notes: string | null;
  changedAt: string;
}

export interface MarriageApplication {
  id: string;
  applicationNumber: string;
  applicantId: string;
  notificationPhone: string | null;
  groomName: string;
  groomNid: string;
  groomFatherName: string | null;
  groomBirthDate: string | null;
  groomPhone: string | null;
  brideName: string;
  brideNid: string;
  brideFatherName: string | null;
  brideBirthDate: string | null;
  bridePhone: string | null;
  waliName: string | null;
  waliNid: string | null;
  waliPhone: string | null;
  mahrAmount: number | null;
  mahrCurrency: string;
  mahrDescription: string | null;
  witness1Nid: string;
  witness1Name: string | null;
  witness2Nid: string;
  witness2Name: string | null;
  requestedOfficiant: string | null;
  assignedImamId: string | null;
  venueType: VenueType;
  province: string | null;
  district: string | null;
  mosqueId: string | null;
  venueAddress: string | null;
  preferredDateFrom: string | null;
  preferredDateTo: string | null;
  ceremonyDate: string | null;
  status: MarriageApplicationStatus;
  paymentStatus: PaymentStatus;
  amountDue: number;
  amountPaid: number;
  paymentMethod: PaymentMethod | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  amendmentsRequestedText: string | null;
  weddingPhotoUrl: string | null;
  certificateUrl: string | null;
  certificateQrCode: string | null;
  certificateIssuedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  applicant?: ApplicantSummary | null;
  documents: MarriageDocument[];
  statusHistory: StatusHistoryEntry[];
}

export interface CreateMarriageApplicationPayload {
  notificationPhone: string;
  groomName: string;
  groomNid: string;
  groomFatherName: string;
  groomBirthDate: string;
  groomPhone: string;
  brideName: string;
  brideNid: string;
  brideFatherName: string;
  brideBirthDate: string;
  bridePhone: string;
  witness1Nid: string;
  witness1Name: string;
  witness2Nid: string;
  witness2Name: string;
  waliName?: string;
  waliNid?: string;
  waliPhone?: string;
  mahrAmount?: number;
  mahrDescription?: string;
  requestedOfficiant?: string;
  venueType: VenueType;
  province: string;
  district: string;
  mosqueId?: string;
  venueAddress?: string;
  preferredDateFrom: string;
  preferredDateTo?: string;
  paymentMethod: PaymentMethod;
}

export interface AdminApplicationsResult {
  items: MarriageApplication[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface UpdateStatusPayload {
  status: MarriageApplicationStatus;
  notes?: string;
  rejectionReason?: string;
  amendmentsRequestedText?: string;
}

export interface ScheduleCeremonyPayload {
  ceremonyDate: string;
  assignedImamId?: string;
  notes?: string;
}

export interface SaveDocumentPayload {
  documentType:
    | 'groom_id'
    | 'bride_id'
    | 'groom_photo'
    | 'bride_photo'
    | 'wali_consent'
    | 'mahr_agreement'
    | 'portrait'
    | 'additional';
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface AdminStats {
  total: number;
  byStatus: { status: string; count: string }[];
  revenue: number;
}

export interface MarriageFeeTier {
  amount: number;
  label: string;
  description: string;
}

export interface MarriageFees {
  mosque: MarriageFeeTier;
  outside: MarriageFeeTier;
}

export interface PublicVerification {
  applicationNumber: string;
  groomName: string;
  brideName: string;
  ceremonyDate: string | null;
  issuedAt: string | null;
  status: 'valid';
}

// ── Status helpers ────────────────────────────────────────────────────────────

export const STATUS_FLOW: MarriageApplicationStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'amendments_requested',
  'approved',
  'completed',
  'closed',
];

export const ACTIVE_STATUSES: MarriageApplicationStatus[] = [
  'draft', 'submitted', 'under_review', 'amendments_requested', 'approved', 'completed',
];

export const STATUS_COLORS: Record<MarriageApplicationStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  amendments_requested: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  closed: 'bg-purple-100 text-purple-700',
};

// ── Member API ────────────────────────────────────────────────────────────────

export const marriageApi = {
  createDraft: async (payload: CreateMarriageApplicationPayload): Promise<MarriageApplication> => {
    const { data } = await apiClient.post('/marriage/applications/draft', payload);
    return data.data ?? data;
  },

  updateDraft: async (id: string, payload: Partial<CreateMarriageApplicationPayload>): Promise<MarriageApplication> => {
    const { data } = await apiClient.put(`/marriage/applications/${id}/draft`, payload);
    return data.data ?? data;
  },

  submit: async (id: string): Promise<MarriageApplication> => {
    const { data } = await apiClient.post(`/marriage/applications/${id}/submit`);
    return data.data ?? data;
  },

  cancel: async (id: string): Promise<MarriageApplication> => {
    const { data } = await apiClient.post(`/marriage/applications/${id}/cancel`);
    return data.data ?? data;
  },

  getById: async (id: string): Promise<MarriageApplication> => {
    const { data } = await apiClient.get(`/marriage/applications/${id}`);
    return data.data ?? data;
  },

  getByNumber: async (number: string): Promise<MarriageApplication | null> => {
    try {
      const { data } = await apiClient.get(`/marriage/applications/by-number/${number}`);
      return data.data ?? data;
    } catch {
      return null;
    }
  },

  checkPaymentStatus: async (
    id: string,
  ): Promise<{ paymentStatus: string; gatewayStatus: string; responseCode: string; message: string }> => {
    const { data } = await apiClient.get(`/marriage/applications/${id}/payment/check`);
    return data.data ?? data;
  },

  // DEV ONLY — backend marks the payment as paid without the MoMo gateway.
  // The backend hard-blocks this in production (returns 403).
  devCompletePayment: async (id: string): Promise<MarriageApplication> => {
    const { data } = await apiClient.post(`/marriage/applications/${id}/payment/dev-complete`);
    return data.data ?? data;
  },

  initiateUserMomoPayment: async (
    id: string,
    mobilePhone: string,
  ): Promise<{
    application: MarriageApplication;
    transaction: { id: string; status: string; providerRef: string | null };
    gatewayRef: string | null;
    responseCode: string;
    message: string;
  }> => {
    const { data } = await apiClient.post(`/marriage/applications/${id}/payment/initiate-momo`, { mobilePhone });
    return data.data ?? data;
  },

  saveDocument: async (id: string, payload: SaveDocumentPayload): Promise<void> => {
    await apiClient.post(`/marriage/applications/${id}/documents`, payload);
  },

  listMine: async (): Promise<MarriageApplication[]> => {
    const { data } = await apiClient.get('/marriage/applications');
    return data.data ?? data;
  },

  getFees: async (): Promise<MarriageFees> => {
    const { data } = await apiClient.get('/marriage/fees');
    return data.data ?? data;
  },

  publicVerify: async (applicationNumber: string): Promise<PublicVerification | null> => {
    try {
      const { data } = await apiClient.get(`/marriage/public/verify/${applicationNumber}`);
      return data.data ?? data;
    } catch {
      return null;
    }
  },

  // ── Admin ──────────────────────────────────────────────────────────────────

  admin: {
    list: async (params?: {
      status?: string;
      paymentStatus?: string;
      venueType?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      sort?: 'date' | 'amount' | 'couple' | 'payment' | 'status';
      order?: 'ASC' | 'DESC';
      page?: number;
      limit?: number;
    }): Promise<AdminApplicationsResult> => {
      const { data } = await apiClient.get('/admin/marriage/applications', { params });
      return data.data ?? data;
    },

    getOne: async (id: string): Promise<MarriageApplication> => {
      const { data } = await apiClient.get(`/admin/marriage/applications/${id}`);
      return data.data ?? data;
    },

    updateStatus: async (id: string, payload: UpdateStatusPayload): Promise<MarriageApplication> => {
      const { data } = await apiClient.patch(`/admin/marriage/applications/${id}/status`, payload);
      return data.data ?? data;
    },

    schedule: async (id: string, payload: ScheduleCeremonyPayload): Promise<MarriageApplication> => {
      const { data } = await apiClient.post(`/admin/marriage/applications/${id}/schedule`, payload);
      return data.data ?? data;
    },

    confirmPayment: async (id: string): Promise<MarriageApplication> => {
      const { data } = await apiClient.post(`/admin/marriage/applications/${id}/payment/confirm`);
      return data.data ?? data;
    },

    initiateMomoPayment: async (
      id: string,
      mobilePhone: string,
    ): Promise<{ application: MarriageApplication; transaction: { id: string; status: string; providerRef: string | null }; gatewayResponse: unknown }> => {
      const { data } = await apiClient.post(`/admin/marriage/applications/${id}/payment/initiate-momo`, { mobilePhone });
      return data.data ?? data;
    },

    checkMomoStatus: async (
      id: string,
      txId: string,
    ): Promise<{ status: string; responseCode: string; message: string }> => {
      const { data } = await apiClient.get(`/admin/marriage/applications/${id}/payment/${txId}/status`);
      return data.data ?? data;
    },

    uploadWeddingPhoto: async (id: string, photoUrl: string): Promise<MarriageApplication> => {
      const { data } = await apiClient.post(`/admin/marriage/applications/${id}/wedding-photo`, { photoUrl });
      return data.data ?? data;
    },

    uploadSignedProvisional: async (
      id: string,
      doc: { fileKey: string; fileName: string; fileSize: number; mimeType: string },
    ): Promise<MarriageApplication> => {
      const { data } = await apiClient.post(`/admin/marriage/applications/${id}/signed-provisional`, doc);
      return data.data ?? data;
    },

    issueCertificate: async (id: string): Promise<MarriageApplication> => {
      const { data } = await apiClient.post(`/admin/marriage/applications/${id}/certificate`);
      return data.data ?? data;
    },

    verifyDocument: async (id: string, docId: string, verified: boolean): Promise<MarriageApplication> => {
      const { data } = await apiClient.patch(
        `/admin/marriage/applications/${id}/documents/${docId}/verify`,
        { verified },
      );
      return data.data ?? data;
    },

    getStats: async (): Promise<AdminStats> => {
      const { data } = await apiClient.get('/admin/marriage/stats');
      return data.data ?? data;
    },

    getParties: async (id: string): Promise<{ role: string; name: string | null; confirmedAt: string | null }[]> => {
      try {
        const { data } = await apiClient.get(`/marriage/applications/${id}/parties`);
        return data.data ?? [];
      } catch {
        return [];
      }
    },
  },
};
