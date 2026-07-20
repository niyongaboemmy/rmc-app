import { apiClient, FILE_SERVER_URL, refreshAccessToken } from './api';
import type { TenderI18n } from './tendersApi';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TenderApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'more_info_requested'
  | 'shortlisted'
  | 'awarded'
  | 'rejected'
  | 'withdrawn';

/** The three documents every bid must carry — mirrors the backend TenderDocumentType enum. */
export type TenderDocumentType = 'rdb_certificate' | 'tax_clearance' | 'proposal';

export const REQUIRED_DOCUMENTS: TenderDocumentType[] = [
  'rdb_certificate',
  'tax_clearance',
  'proposal',
];

export interface TenderApplicationDocument {
  id: string;
  docType: TenderDocumentType;
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  verified: boolean;
  uploadedAt: string;
}

/** Payload shape for a document being attached to a new/updated bid (pre-persistence — no id yet). */
export interface TenderDocumentPayload {
  docType: TenderDocumentType;
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface TenderStatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  notes: string | null;
  changedAt: string;
}

/** Slim tender summary the backend hydrates onto each application for display. */
export interface TenderSummary {
  id: string;
  title: string;
  titleI18n: TenderI18n | null;
  expiresAt: string | null;
}

export interface TenderApplication {
  id: string;
  applicationNumber: string;
  tenderId: string;
  applicantId: string;
  companyName: string;
  companyTin: string;
  contactName: string;
  email: string | null;
  phone: string;
  districtId: string | null;
  sectorId: string | null;
  cell: string | null;
  village: string | null;
  bidAmount: number | null;
  coverNote: string | null;
  status: TenderApplicationStatus;
  reviewNotes: string | null;
  rejectionReason: string | null;
  moreInfoRequested: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  documents: TenderApplicationDocument[];
  statusHistory: TenderStatusHistoryEntry[];
  tender: TenderSummary | null;
}

export interface CreateTenderApplicationPayload {
  tenderId: string;
  companyName: string;
  companyTin: string;
  contactName: string;
  email?: string;
  phone: string;
  districtId?: string;
  sectorId?: string;
  cell?: string;
  village?: string;
  bidAmount?: number;
  coverNote?: string;
  documents: TenderDocumentPayload[];
}

// ── Status helpers ────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<TenderApplicationStatus, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  more_info_requested: 'bg-orange-100 text-orange-700',
  shortlisted: 'bg-teal-100 text-teal-700',
  awarded: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-500',
};

/** Statuses the applicant can still edit — mirrors EDITABLE_STATUSES in tenders.service.ts. */
export const EDITABLE_STATUSES: TenderApplicationStatus[] = ['submitted', 'more_info_requested'];

// ── File upload ───────────────────────────────────────────────────────────────

export const MAX_DOCUMENT_MB = 10;
export const ACCEPTED_DOCUMENT_MIMES = ['application/pdf', 'image/jpeg', 'image/png'];

class UploadHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function sendFileUpload(
  file: File,
  token: string | null,
  onProgress?: (pct: number) => void,
): Promise<{ key: string; size: number; mimeType: string; originalName: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    // Bids land in their own folder, separate from the `tenders` folder that
    // holds the tender documents RMC itself publishes.
    xhr.open('POST', `${FILE_SERVER_URL}/api/v1/upload?folder=tender-applications`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText);
          resolve(body.data ?? body);
        } catch {
          reject(new UploadHttpError(xhr.status, 'Unexpected response from file server'));
        }
      } else {
        let detail = '';
        try {
          detail = JSON.parse(xhr.responseText)?.error?.message ?? '';
        } catch {
          /* noop */
        }
        reject(
          new UploadHttpError(
            xhr.status,
            `Upload failed — HTTP ${xhr.status}${detail ? ': ' + detail : ''}`,
          ),
        );
      }
    };

    xhr.onerror = () => reject(new UploadHttpError(0, 'Network error'));
    xhr.ontimeout = () => reject(new UploadHttpError(0, 'Upload timed out'));
    xhr.timeout = 120_000;

    xhr.send(form);
  });
}

/**
 * Upload one bid document (PDF/JPG/PNG) and return the descriptor to attach to
 * the application. Raw XHR bypasses the apiClient response interceptor, so the
 * 401-refresh-and-retry has to be done by hand here — same as uploadTenderFile.
 */
export async function uploadBidDocument(
  file: File,
  docType: TenderDocumentType,
  onProgress?: (pct: number) => void,
): Promise<TenderDocumentPayload> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;

  const toPayload = (result: { key: string }): TenderDocumentPayload => ({
    docType,
    fileKey: result.key,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  });

  try {
    return toPayload(await sendFileUpload(file, token, onProgress));
  } catch (err) {
    if (err instanceof UploadHttpError && err.status === 401) {
      const fresh = await refreshAccessToken();
      if (fresh) return toPayload(await sendFileUpload(file, fresh, onProgress));
    }
    throw err;
  }
}

// ── Applicant API ─────────────────────────────────────────────────────────────

export const tenderApplicationApi = {
  create: async (payload: CreateTenderApplicationPayload): Promise<TenderApplication> => {
    const { data } = await apiClient.post('/tenders/applications', payload);
    return data.data ?? data;
  },

  update: async (
    id: string,
    payload: Partial<CreateTenderApplicationPayload>,
  ): Promise<TenderApplication> => {
    const { data } = await apiClient.patch(`/tenders/applications/${id}`, payload);
    return data.data ?? data;
  },

  withdraw: async (id: string): Promise<TenderApplication> => {
    const { data } = await apiClient.post(`/tenders/applications/${id}/withdraw`);
    return data.data ?? data;
  },

  getById: async (id: string): Promise<TenderApplication> => {
    const { data } = await apiClient.get(`/tenders/applications/${id}`);
    return data.data ?? data;
  },

  listMine: async (): Promise<TenderApplication[]> => {
    const { data } = await apiClient.get('/tenders/applications');
    return data.data ?? data;
  },
};
