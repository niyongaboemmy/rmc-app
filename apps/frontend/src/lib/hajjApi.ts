import axios from 'axios';
import { apiClient, API_BASE_URL } from './api';
import { downloadXlsx } from './downloadXlsx';

export type HajjStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

/** Statuses an admin can move an application to. A decision is final. */
export const HAJJ_FINAL_STATUSES: HajjStatus[] = ['approved', 'rejected'];

export const HAJJ_STATUS_LABELS: Record<HajjStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Not Approved',
};

export const HAJJ_STATUS_COLORS: Record<HajjStatus, string> = {
  submitted: 'bg-gray-100 text-gray-700 ring-gray-200',
  under_review: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
};

export type HajjDocumentType = 'registration_fee' | 'advance_payment';

export const HAJJ_DOCUMENT_LABELS: Record<HajjDocumentType, string> = {
  registration_fee: 'Registration fee receipt',
  advance_payment: 'Advance payment receipt',
};

/** A real uploaded receipt. Resolve `fileKey` with fileUrl() to open it. */
export interface HajjDocument {
  id: string;
  documentType: HajjDocumentType;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  verified: boolean;
  verifiedAt: string | null;
  uploadedAt: string;
}

/** What POST /hajj/proofs returns once the receipt is stored. */
export interface UploadedProof {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface HajjApplication {
  id: string;
  applicationNumber: string;
  fullName: string;
  phone: string;
  email: string | null;
  district: string;
  sector: string;
  passportNumber: string;
  documents: HajjDocument[];
  status: HajjStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The PII-free shape the OTP-verified status lookup returns. */
export interface HajjApplicationPublic {
  trackingCode: string;
  fullName: string;
  district: string;
  sector: string;
  status: HajjStatus;
  rejectionReason: string | null;
  submittedAt: string;
  updatedAt: string;
}

export interface HajjStatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: HajjStatus;
  changedBy: string | null;
  notes: string | null;
  changedAt: string;
}

export interface HajjApplicationPayload {
  fullName: string;
  phone: string;
  email?: string;
  district: string;
  sector: string;
  passportNumber: string;
  /** Both receipts, already uploaded via hajjApi.uploadProof(). */
  documents: (UploadedProof & { documentType: HajjDocumentType })[];
}

export interface UpdateHajjStatusPayload {
  status: HajjStatus;
  notes?: string;
  /** Required by the backend when rejecting — it is sent to the applicant. */
  rejectionReason?: string;
}

/** Accepted receipt formats — kept in step with the backend's allow-list. */
export const HAJJ_PROOF_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';
export const HAJJ_PROOF_MAX_BYTES = 10 * 1024 * 1024;

/** Text carried in all three languages by a CMS-managed requirement. */
export interface HajjTri {
  en: string;
  rw: string;
  ar: string;
}

/** Currencies a Hajj fee can be quoted in. Mirrors the backend enum. */
export const HAJJ_CURRENCIES = ['RWF', 'USD'] as const;
export type HajjCurrency = (typeof HAJJ_CURRENCIES)[number];

/** A requirement card on the public Hajj page — admin-managed, ordered. */
export interface HajjRequirementItem {
  id: string;
  key: string;
  title: HajjTri;
  description: HajjTri;
  /** Null for a requirement that costs nothing (e.g. a valid passport). */
  amount: number | null;
  /** Currency of `amount`. Meaningless when `amount` is null. */
  currency: HajjCurrency;
  mandatory: boolean;
  sortOrder: number;
  isActive: boolean;
  icon?: string;
}

/** A bank account the Hajj fees are paid into — admin-managed, ordered. */
export interface HajjBankAccountItem {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: HajjCurrency;
  /** Only set for accounts that can receive money from abroad. */
  swiftCode?: string;
  branch?: string;
  sortOrder: number;
  isActive: boolean;
}

/** What the admin editor sends when creating/updating a bank account. */
export interface HajjBankAccountPayload {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  currency?: HajjCurrency;
  swiftCode?: string | null;
  branch?: string | null;
  isActive?: boolean;
}

/** What the admin editor sends when creating/updating a requirement. */
export interface HajjRequirementPayload {
  key?: string;
  titleEn?: string;
  titleRw?: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionRw?: string;
  descriptionAr?: string;
  amount?: number | null;
  currency?: HajjCurrency;
  mandatory?: boolean;
  isActive?: boolean;
  icon?: string;
}

/**
 * The two requirements the registration form reads its amounts from. Renaming
 * these keys in the CMS would silently detach the form from the fee it charges.
 */
export const HAJJ_FEE_KEYS = {
  registration: 'registrationFee',
  advance: 'advancePayment',
} as const;

export const hajjApi = {
  /**
   * Public — the requirements checklist (active only), newest CMS content. Also
   * the source of the two fee amounts the registration form shows.
   */
  getRequirements: async (): Promise<HajjRequirementItem[]> => {
    const { data } = await apiClient.get('/hajj/requirements');
    return data.data ?? data;
  },

  /**
   * Public — the bank accounts the fees are paid into (active only). Empty until
   * an admin enters the real ones; the page shows an honest empty state rather
   * than a placeholder account number.
   */
  getBankAccounts: async (): Promise<HajjBankAccountItem[]> => {
    const { data } = await apiClient.get('/hajj/bank-accounts');
    return data.data ?? data;
  },

  /**
   * Public — upload one payment receipt. Goes to the backend (not the file server
   * directly), which validates it and forwards it under a service token, so no
   * authentication is needed here.
   */
  uploadProof: async (file: File, onProgress?: (pct: number) => void): Promise<UploadedProof> => {
    const form = new FormData();
    form.append('file', file);
    // Raw axios, not apiClient: the shared instance forces
    // `Content-Type: application/json`, which strips the multipart boundary and
    // the server then sees no file at all.
    const { data } = await axios.post(`${API_BASE_URL}/hajj/proofs`, form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return data.data ?? data;
  },

  /** Public — submit an application. Returns the number the applicant must keep. */
  apply: async (
    payload: HajjApplicationPayload,
  ): Promise<{ id: string; applicationNumber: string; trackingCode: string; status: HajjStatus }> => {
    const { data } = await apiClient.post('/hajj/apply', payload);
    return data.data ?? data;
  },

  // Public status lookup is now OTP-gated — see the shared <TrackByOtp> component
  // (basePath '/hajj/applications/track'), which returns HajjApplicationPublic.

  admin: {
    list: async (params: {
      status?: HajjStatus | '';
      search?: string;
      page?: number;
      limit?: number;
    }): Promise<{ items: HajjApplication[]; total: number; page: number; limit: number }> => {
      const query: Record<string, string | number> = {};
      if (params.status) query.status = params.status;
      if (params.search?.trim()) query.search = params.search.trim();
      if (params.page) query.page = params.page;
      if (params.limit) query.limit = params.limit;
      const { data } = await apiClient.get('/admin/hajj/applications', { params: query });
      return data.data ?? data;
    },

    stats: async (): Promise<{ total: number; byStatus: Record<HajjStatus, number> }> => {
      const { data } = await apiClient.get('/admin/hajj/stats');
      return data.data ?? data;
    },

    /**
     * Download every application matching the filters as an .xlsx report — the whole
     * filtered set, not just the rows currently on screen.
     */
    exportXlsx: (params: { status?: HajjStatus | ''; search?: string }): Promise<void> =>
      downloadXlsx('/admin/hajj/applications/export', { ...params }, 'hajj-applications'),

    getOne: async (id: string): Promise<HajjApplication> => {
      const { data } = await apiClient.get(`/admin/hajj/applications/${id}`);
      return data.data ?? data;
    },

    history: async (id: string): Promise<HajjStatusHistoryEntry[]> => {
      const { data } = await apiClient.get(`/admin/hajj/applications/${id}/history`);
      return data.data ?? data;
    },

    /**
     * Fetch a receipt's bytes as an object URL.
     *
     * Receipts are NOT publicly readable — the file server refuses the key without a
     * token — so they come through this authenticated route. Revoke the returned URL
     * with URL.revokeObjectURL() when the view unmounts.
     */
    documentObjectUrl: async (docId: string): Promise<string> => {
      const { data } = await apiClient.get(`/admin/hajj/documents/${docId}/file`, {
        responseType: 'blob',
      });
      return URL.createObjectURL(data as Blob);
    },

    /** Tick a receipt off after opening it (or clear the tick). */
    verifyDocument: async (docId: string, verified: boolean): Promise<HajjDocument> => {
      const { data } = await apiClient.patch(`/admin/hajj/documents/${docId}/verify`, { verified });
      return data.data ?? data;
    },

    // ── Requirements CMS ────────────────────────────────────────────────────

    /** Every requirement, including deactivated ones (the public list omits those). */
    listRequirements: async (): Promise<HajjRequirementItem[]> => {
      const { data } = await apiClient.get('/admin/hajj/requirements');
      return data.data ?? data;
    },

    createRequirement: async (payload: HajjRequirementPayload): Promise<HajjRequirementItem> => {
      const { data } = await apiClient.post('/admin/hajj/requirements', payload);
      return data.data ?? data;
    },

    updateRequirement: async (
      id: string,
      payload: HajjRequirementPayload,
    ): Promise<HajjRequirementItem> => {
      const { data } = await apiClient.patch(`/admin/hajj/requirements/${id}`, payload);
      return data.data ?? data;
    },

    deleteRequirement: async (id: string): Promise<void> => {
      await apiClient.delete(`/admin/hajj/requirements/${id}`);
    },

    /** Persist a new display order; `ids` is the full list, in order. */
    reorderRequirements: async (ids: string[]): Promise<HajjRequirementItem[]> => {
      const { data } = await apiClient.patch('/admin/hajj/requirements/reorder', { ids });
      return data.data ?? data;
    },

    /** Every bank account, including deactivated ones (the public list omits those). */
    listBankAccounts: async (): Promise<HajjBankAccountItem[]> => {
      const { data } = await apiClient.get('/admin/hajj/bank-accounts');
      return data.data ?? data;
    },

    createBankAccount: async (payload: HajjBankAccountPayload): Promise<HajjBankAccountItem> => {
      const { data } = await apiClient.post('/admin/hajj/bank-accounts', payload);
      return data.data ?? data;
    },

    updateBankAccount: async (
      id: string,
      payload: HajjBankAccountPayload,
    ): Promise<HajjBankAccountItem> => {
      const { data } = await apiClient.patch(`/admin/hajj/bank-accounts/${id}`, payload);
      return data.data ?? data;
    },

    deleteBankAccount: async (id: string): Promise<void> => {
      await apiClient.delete(`/admin/hajj/bank-accounts/${id}`);
    },

    reorderBankAccounts: async (ids: string[]): Promise<HajjBankAccountItem[]> => {
      const { data } = await apiClient.patch('/admin/hajj/bank-accounts/reorder', { ids });
      return data.data ?? data;
    },

    /** Verify (under_review), approve, or reject. Notifies the applicant. */
    updateStatus: async (
      id: string,
      payload: UpdateHajjStatusPayload,
    ): Promise<HajjApplication> => {
      const { data } = await apiClient.patch(`/admin/hajj/applications/${id}/status`, payload);
      return data.data ?? data;
    },
  },
};
