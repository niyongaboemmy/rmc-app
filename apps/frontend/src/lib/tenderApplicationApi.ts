import { apiClient, API_BASE_URL, refreshAccessToken } from './api';
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
  /** Unguessable public code for OTP-gated status tracking (not the sequential number). */
  trackingCode: string;
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
  /** What the reviewer asked to be corrected; null/absent on legacy unscoped asks. */
  moreInfoFields: TenderMoreInfoField[] | null;
  moreInfoDocumentTypes: TenderDocumentType[] | null;
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

// ── More-info targets ─────────────────────────────────────────────────────────

/**
 * What a reviewer can ask a bidder to fix — mirrors TenderMoreInfoField in
 * apps/backend/src/tenders/more-info-targets.ts, which is where the groups are
 * mapped to columns and enforced. Groups, not raw fields: a reviewer says "the
 * address is wrong", not "district, sector, cell and village are wrong".
 */
export type TenderMoreInfoField =
  | 'company'
  | 'contact'
  | 'phone'
  | 'email'
  | 'address'
  | 'bid_amount'
  | 'cover_note';

/** Every group, in the order the admin picker lists them. */
export const TENDER_MORE_INFO_FIELDS: TenderMoreInfoField[] = [
  'company',
  'contact',
  'phone',
  'email',
  'address',
  'bid_amount',
  'cover_note',
];

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

/** What the backend's upload routes return — already the descriptor we persist. */
interface StoredDocument {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

function sendFileUpload(
  url: string,
  file: File,
  token: string | null,
  onProgress?: (pct: number) => void,
): Promise<StoredDocument> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    // Posted to the BACKEND, not straight to the file server: bids land under the
    // protected `tender-applications/` prefix, and the backend is what decides the
    // folder and the type/size rules — not whatever the browser cares to send.
    xhr.open('POST', url);
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

const toPayload = (
  docType: TenderDocumentType,
  stored: StoredDocument,
): TenderDocumentPayload => ({ docType, ...stored });

/**
 * Upload one bid document (PDF/JPG/PNG) as a signed-in bidder and return the
 * descriptor to attach to the application. Raw XHR bypasses the apiClient
 * response interceptor, so the 401-refresh-and-retry has to be done by hand here.
 */
export async function uploadBidDocument(
  file: File,
  docType: TenderDocumentType,
  onProgress?: (pct: number) => void,
): Promise<TenderDocumentPayload> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;
  const url = `${API_BASE_URL}/tenders/applications/documents`;

  try {
    return toPayload(docType, await sendFileUpload(url, file, token, onProgress));
  } catch (err) {
    if (err instanceof UploadHttpError && err.status === 401) {
      const fresh = await refreshAccessToken();
      if (fresh) return toPayload(docType, await sendFileUpload(url, file, fresh, onProgress));
    }
    throw err;
  }
}

/**
 * The same upload from a verified OTP tracking session — no login, so the
 * tracking token stands in for the access token and there is nothing to refresh:
 * a 401 here means the 15-minute session lapsed and the bidder must re-verify.
 */
export async function uploadBidDocumentByTracking(
  trackingToken: string,
  file: File,
  docType: TenderDocumentType,
  onProgress?: (pct: number) => void,
): Promise<TenderDocumentPayload> {
  const stored = await sendFileUpload(
    `${API_BASE_URL}/tenders/applications/track/documents`,
    file,
    trackingToken,
    onProgress,
  );
  return toPayload(docType, stored);
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

// ── Tracking-session API (OTP-verified, no login) ─────────────────────────────

/**
 * What verify-otp hands back — the small status summary, before the bid page
 * re-reads the whole bid with the token. The tenders rail only uses it to know
 * the verification succeeded, so nothing here needs rendering.
 */
export interface TenderTrackInfo {
  applicationNumber: string;
  companyName: string;
  tenderTitle: string | null;
  tenderTitleI18n: TenderI18n | null;
  status: TenderApplicationStatus;
  moreInfoRequested: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  updatedAt: string;
}

/**
 * A bid attachment as the tracking session sees it.
 *
 * `fileKey` opens nothing by itself — `tender-applications/` is protected on the
 * file server, so viewing goes through the session-scoped route by document id.
 * It is here because an update replaces the document set wholesale, so the edit
 * form has to echo back the files the bidder did not replace.
 */
export interface TrackedBidDocument {
  id: string;
  docType: TenderDocumentType;
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

/** The bidder's own bid, as returned to a verified tracking session. */
export interface TrackedBid {
  applicationNumber: string;
  trackingCode: string;
  status: TenderApplicationStatus;
  /** Decided by the backend (editable stage AND tender still open) — never re-derived here. */
  editable: boolean;
  /** Also the backend's call. Unlike `editable`, a closed tender can still be withdrawn from. */
  withdrawable: boolean;
  tenderId: string;
  tenderTitle: string | null;
  tenderTitleI18n: TenderI18n | null;
  tenderSlug: string | null;
  tenderDeadline: string | null;
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
  moreInfoRequested: string | null;
  /** What the reviewer named — drives the "here's what to fix" checklist. */
  moreInfoFields: TenderMoreInfoField[];
  moreInfoDocumentTypes: TenderDocumentType[];
  /**
   * What that actually unlocks, resolved by the backend through the same scope
   * the update enforces. Empty when the bid isn't editable at all. The form
   * disables anything outside these, so it can never offer an edit that the
   * endpoint would reject.
   */
  editableFields: TenderMoreInfoField[];
  editableDocuments: TenderDocumentType[];
  rejectionReason: string | null;
  submittedAt: string;
  updatedAt: string;
  documents: TrackedBidDocument[];
}

export type UpdateTrackedBidPayload = Partial<Omit<CreateTenderApplicationPayload, 'tenderId'>>;

const bearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export const trackedBidApi = {
  /** The full bid behind a verified tracking token. */
  get: async (token: string): Promise<TrackedBid> => {
    const { data } = await apiClient.get('/tenders/applications/track/bid', bearer(token));
    return data.data ?? data;
  },

  /**
   * Save an edit. The backend re-checks that the bid is still editable, so a page
   * left open while a reviewer started work will be refused rather than racing it.
   */
  update: async (token: string, payload: UpdateTrackedBidPayload): Promise<TrackedBid> => {
    const { data } = await apiClient.patch(
      '/tenders/applications/track/bid',
      payload,
      bearer(token),
    );
    return data.data ?? data;
  },

  /** Pull the bid out of consideration. Terminal — confirm before calling. */
  withdraw: async (token: string): Promise<TrackedBid> => {
    const { data } = await apiClient.post(
      '/tenders/applications/track/withdraw',
      {},
      bearer(token),
    );
    return data.data ?? data;
  },
};

/**
 * Open a protected bid attachment in a new tab.
 *
 * Bid documents are no longer reachable by URL — both routes that serve them
 * authenticate by `Authorization` header, which a plain <a href> or window.open
 * cannot send. So the bytes are fetched with the header, turned into a blob URL
 * and handed to a tab. Putting the token in the query string instead would work,
 * but it would also write a live credential into browser history, the referrer
 * and every proxy log on the way.
 *
 * The tab is opened BEFORE the await: a window.open that happens after an async
 * gap is not attributable to the click and gets blocked as a popup.
 */
async function openProtectedDocument(url: string, config: object): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const { data } = await apiClient.get(url, { ...config, responseType: 'blob' });
    const blobUrl = URL.createObjectURL(data as Blob);
    if (tab) tab.location.href = blobUrl;
    else window.location.href = blobUrl;
    // The tab holds its own reference to the bytes once loaded; this only frees
    // ours. Immediate revocation would race the navigation above.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}

/** Open one of the tracking session's own attachments. */
export function openTrackedBidDocument(token: string, documentId: string): Promise<void> {
  return openProtectedDocument(
    `/tenders/applications/track/documents/${documentId}`,
    bearer(token),
  );
}

/** Open a bid attachment as an admin — gated on TENDER_VIEW by the backend. */
export function openAdminBidDocument(applicationId: string, documentId: string): Promise<void> {
  return openProtectedDocument(
    `/admin/tenders/applications/${applicationId}/documents/${documentId}/file`,
    {},
  );
}

/** Open an attachment on one of the signed-in bidder's own bids. */
export function openOwnBidDocument(applicationId: string, documentId: string): Promise<void> {
  return openProtectedDocument(
    `/tenders/applications/${applicationId}/documents/${documentId}/file`,
    {},
  );
}
