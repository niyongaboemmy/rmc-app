import axios from 'axios';
import { API_BASE_URL, apiClient, refreshAccessToken } from './api';

/**
 * Dawah Learning — course catalogue and digital library.
 *
 * ── Book files: read this before "fixing" previewUrl/downloadUrl ─────────────
 *
 * Cover images use fileUrl(key). They live under an UNPROTECTED file-server
 * prefix, so an <img src> resolves them directly. Normal.
 *
 * Book PDFs DO NOT. They live under the file-server's PROTECTED `dawah-library/`
 * prefix, which refuses an anonymous request outright — so previewUrl() and
 * downloadUrl() point at the BACKEND, not the file server. That indirection is
 * the whole security design, not an oversight: the backend is the only place
 * that knows whether this reader may see this book (visibility: public vs
 * members) and whether they may keep it (allowDownload), and it resolves the
 * storage key server-side from the slug. The key is never sent to the browser.
 *
 * Rewriting these to fileUrl(book.fileKey) would look tidier and would fail
 * closed with a 401 — or, if the protected prefix were ever misconfigured, fail
 * OPEN and hand every members-only book to anyone with the URL. Don't.
 */

// ── Public read client ───────────────────────────────────────────────────────
// A separate instance that never attaches a bearer token, mirroring
// src/lib/public-api.ts. The catalogue is readable by anonymous visitors.
const publicHttp = axios.create({
  baseURL: API_BASE_URL,
});

function unwrap<T>(promise: Promise<{ data: { data?: T } | T }>): Promise<T> {
  return promise.then((res) => {
    const body = res.data as { data?: T };
    return (body?.data ?? res.data) as T;
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseFormat = 'self_paced' | 'in_person' | 'hybrid';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type BookVisibility = 'public' | 'members';

/** Language a course is TAUGHT in / a book is WRITTEN in — not the UI locale. */
export type CourseLanguage = 'en' | 'rw' | 'ar' | 'multi';
export type BookLanguage = 'en' | 'rw' | 'ar' | 'other';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DawahCategory {
  id: string;
  slug: string;
  nameEn: string;
  nameRw: string;
  nameAr: string;
  /** lucide-react icon name, e.g. 'BookOpen'. */
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  /** Discussions only: whether answers here are held for scholar review. Absent on
   *  category lists that predate the column; treat missing as 'scholar_review'. */
  answerPolicy?: 'scholar_review' | 'open';
  createdAt: string;
  updatedAt: string;
}

export interface DawahCourseLesson {
  id: string;
  courseId: string;
  titleEn: string;
  titleRw: string;
  titleAr: string;
  summaryEn: string;
  summaryRw: string;
  summaryAr: string;
  bodyEn: string;
  bodyRw: string;
  bodyAr: string;
  /** Only 'text' is reachable today — the rest are the deferred media phase. */
  contentType: 'text' | 'video' | 'audio' | 'pdf' | 'link';
  mediaKey: string | null;
  mediaUrl: string | null;
  durationMinutes: number | null;
  sortOrder: number;
  isPreview: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DawahCourse {
  id: string;
  slug: string;
  categoryId: string | null;
  category?: DawahCategory | null;
  titleEn: string;
  titleRw: string;
  titleAr: string;
  summaryEn: string;
  summaryRw: string;
  summaryAr: string;
  /** Rich HTML — sanitise before rendering. */
  descriptionEn: string;
  descriptionRw: string;
  descriptionAr: string;
  level: CourseLevel;
  language: CourseLanguage;
  format: CourseFormat;
  /** File-server key, PUBLIC prefix — resolve with fileUrl(). */
  coverImageKey: string | null;
  instructorName: string | null;
  instructorTitle: string | null;
  instructorPhotoKey: string | null;
  durationMinutes: number | null;
  /** Denormalised; the backend maintains it. Read-only. */
  lessonCount: number;
  isFeatured: boolean;
  status: ContentStatus;
  sortOrder: number;
  publishedAt: string | null;
  /** Present on the detail route and the admin get; absent from listings. */
  lessons?: DawahCourseLesson[];
  createdAt: string;
  updatedAt: string;
}

/**
 * A book as the PUBLIC routes return it.
 *
 * There is no fileKey and no previewFileKey — the backend strips them. Use
 * `hasPreview` to know whether an excerpt exists, and previewUrl()/downloadUrl()
 * to read the bytes. The admin routes return DawahBookAdmin, which does carry
 * the keys.
 */
export interface DawahBook {
  id: string;
  slug: string;
  categoryId: string | null;
  category?: DawahCategory | null;
  titleEn: string;
  titleRw: string;
  titleAr: string;
  author: string;
  descriptionEn: string;
  descriptionRw: string;
  descriptionAr: string;
  language: BookLanguage;
  /** File-server key, PUBLIC prefix — resolve with fileUrl(). */
  coverImageKey: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pageCount: number | null;
  /** True when an excerpt exists — an anonymous reader previews THAT. */
  hasPreview: boolean;
  allowDownload: boolean;
  visibility: BookVisibility;
  viewCount: number;
  downloadCount: number;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The admin projection: same book, plus the protected storage keys. */
export interface DawahBookAdmin extends DawahBook {
  fileKey: string;
  previewFileKey: string | null;
  status: ContentStatus;
  sortOrder: number;
}

/** What the upload endpoint hands back, to be posted on to books.create(). */
export interface UploadedBookFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface CoursesQuery {
  /** Category SLUG or id — the backend resolves either. */
  category?: string;
  level?: CourseLevel;
  language?: CourseLanguage;
  search?: string;
  /** Admin listings only; the public routes ignore it and force 'published'. */
  status?: ContentStatus;
  page?: number;
  limit?: number;
}

export interface BooksQuery {
  category?: string;
  language?: BookLanguage;
  search?: string;
  status?: ContentStatus;
  page?: number;
  limit?: number;
}

export interface CategoryPayload {
  slug?: string;
  nameEn: string;
  nameRw?: string;
  nameAr?: string;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CoursePayload {
  slug?: string;
  categoryId?: string | null;
  titleEn: string;
  titleRw?: string;
  titleAr?: string;
  summaryEn: string;
  summaryRw?: string;
  summaryAr?: string;
  descriptionEn?: string;
  descriptionRw?: string;
  descriptionAr?: string;
  level?: CourseLevel;
  language?: CourseLanguage;
  format?: CourseFormat;
  coverImageKey?: string | null;
  instructorName?: string | null;
  instructorTitle?: string | null;
  instructorPhotoKey?: string | null;
  durationMinutes?: number | null;
  isFeatured?: boolean;
  status?: ContentStatus;
  sortOrder?: number;
}

export interface LessonPayload {
  titleEn: string;
  titleRw?: string;
  titleAr?: string;
  summaryEn?: string;
  summaryRw?: string;
  summaryAr?: string;
  bodyEn?: string;
  bodyRw?: string;
  bodyAr?: string;
  /** 'text' (rich body), 'video' (external URL), 'audio' (uploaded file). */
  contentType?: 'text' | 'video' | 'audio' | 'pdf' | 'link';
  /** Audio: a `dawah-media/…` key from uploadLessonMedia(). Null for other types. */
  mediaKey?: string | null;
  /** Video: a YouTube/Vimeo URL. Null for other types. */
  mediaUrl?: string | null;
  durationMinutes?: number | null;
  sortOrder?: number;
  isPreview?: boolean;
}

export interface BookPayload {
  slug?: string;
  categoryId?: string | null;
  titleEn: string;
  titleRw?: string;
  titleAr?: string;
  author?: string;
  descriptionEn?: string;
  descriptionRw?: string;
  descriptionAr?: string;
  language?: BookLanguage;
  coverImageKey?: string | null;
  /** From admin.books.upload() — required on create. */
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  pageCount?: number | null;
  previewFileKey?: string | null;
  visibility?: BookVisibility;
  allowDownload?: boolean;
  isFeatured?: boolean;
  status?: ContentStatus;
  sortOrder?: number;
}

// ── Book PDF upload with progress (raw XHR) ──────────────────────────────────
// The book file goes to the BACKEND upload route (not the file server): the
// backend moves it under the PROTECTED `dawah-library/` prefix and hands back
// the stored key. Raw XHR rather than apiClient so we get `xhr.upload` progress
// events — a 25 MB PDF on a slow link with no bar reads as a hang. Mirrors the
// pattern in src/lib/galleryApi.ts, including the once-only refresh-and-retry on
// a 401 (raw XHR bypasses apiClient's refresh interceptor).
class BookUploadError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function sendUpload(
  path: string,
  file: File,
  token: string | null,
  onProgress?: (pct: number) => void,
): Promise<UploadedBookFile> {
  return new Promise<UploadedBookFile>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/${path}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText);
          resolve((body.data ?? body) as UploadedBookFile);
        } catch {
          reject(new BookUploadError(xhr.status, 'Unexpected response from server'));
        }
      } else {
        let detail = '';
        try { detail = JSON.parse(xhr.responseText)?.error?.message ?? ''; } catch { /* noop */ }
        reject(new BookUploadError(xhr.status, detail || `Upload failed — HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new BookUploadError(0, 'Network error during upload'));
    xhr.ontimeout = () => reject(new BookUploadError(0, 'Upload timed out'));
    xhr.timeout = 180_000; // 3 min ceiling for a large file on a slow link
    xhr.send(form);
  });
}

async function uploadViaBackend(
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadedBookFile> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;
  try {
    return await sendUpload(path, file, token, onProgress);
  } catch (err) {
    // Raw XHR bypasses apiClient's refresh interceptor — refresh once and retry.
    if (err instanceof BookUploadError && err.status === 401) {
      const fresh = await refreshAccessToken();
      if (fresh) return sendUpload(path, file, fresh, onProgress);
    }
    throw err;
  }
}

/**
 * Upload a book PDF (PDF only, 25 MB — both enforced by the backend) with
 * progress, then pass the result into books.create()/update().
 */
export function uploadBookFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadedBookFile> {
  return uploadViaBackend('admin/dawah/books/upload', file, onProgress);
}

/**
 * Upload lesson audio (audio only, 90 MB — both enforced by the backend) with
 * progress, then pass `fileKey` into a lesson's `mediaKey`. Video is never
 * uploaded — it's an external URL in `mediaUrl`.
 */
export function uploadLessonMedia(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadedBookFile> {
  return uploadViaBackend('admin/dawah/media/upload', file, onProgress);
}

// ── API ──────────────────────────────────────────────────────────────────────

// ── Community Discussions ─────────────────────────────────────────────────
// Shapes frozen in docs/dawah-discussions-contract.md. They mirror the backend's
// toPublic() EXACTLY. Do not add a field here "for later": a type that promises
// something the API does not send is worse than a missing one, because the bug
// surfaces as `undefined` in a component instead of a compile error.

/** `en` | `rw` | `ar` — the language a member WROTE in, not a translation axis. */
export type PostLanguage = 'en' | 'rw' | 'ar';
export type QuestionStatus = 'published' | 'auto_hidden' | 'hidden' | 'locked' | 'deleted';
export type AnswerStatus = 'pending_review' | 'published' | 'auto_hidden' | 'hidden' | 'deleted';
export type DiscussionSort = 'active' | 'new' | 'unanswered';

/**
 * A post's author as the public sees them.
 *
 * `null` — not a flag — is how anonymity reaches the client. There is deliberately no
 * `authorId` and no `isAnonymous`: the id never crosses the wire, so no component can
 * leak it by accident, and `author === null` is the single source of truth.
 */
export interface PublicAuthor {
  name: string;
  /** Renders the scholar badge. Resolved from the live role, so it disappears on removal. */
  isScholar: boolean;
}

export interface DiscussionQuestion {
  id: string;
  slug: string;
  title: string;
  /** Rendered + sanitised SERVER-SIDE. The client renders no markdown, ever. */
  bodyHtml: string;
  /** Drives `dir` on THIS post — never the page locale. An Arabic question on the
   *  English page is still RTL. */
  language: PostLanguage;
  category: DawahCategory | null;
  author: PublicAuthor | null;
  status: QuestionStatus;
  /** Excludes answers still in review — "3 answers" with none visible is a bug. */
  answerCount: number;
  viewCount: number;
  verifiedAnswerId: string | null;
  lastActivityAt: string;
  createdAt: string;
}

export interface DiscussionAnswer {
  id: string;
  questionId: string;
  bodyHtml: string;
  language: PostLanguage;
  author: PublicAuthor | null;
  status: AnswerStatus;
  isVerified: boolean;
  /** WHO verified — a person, not a boolean. "Verified by RMC" with nobody behind it
   *  is an institution hiding behind itself. */
  verifiedBy: PublicAuthor | null;
  verifiedAt: string | null;
  voteScore: number;
  createdAt: string;
}

export interface DiscussionThread {
  question: DiscussionQuestion;
  answers: DiscussionAnswer[];
}

/** A member's new question. No `status`: the server always publishes it. */
export interface CreateQuestionPayload {
  title: string;
  body: string;            // markdown; rendered + sanitised server-side
  categoryId?: string;
  language: PostLanguage;
  isAnonymous?: boolean;
}

export interface CreateReportPayload {
  targetType: 'question' | 'answer';
  targetId: string;
  reason: string;
  note?: string;
}

/** Thrown on HTTP 429 so a caller can say "you're posting too quickly" rather than
 *  string-matching a generic error. */
export class ThrottledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThrottledError';
  }
}

export interface DiscussionReport {
  id: string;
  targetType: 'question' | 'answer';
  targetId: string;
  reason: string;
  note: string;
  reporter: string | null;
  createdAt: string;
}

export interface PendingAnswer {
  id: string;
  bodyHtml: string;
  author: string | null;
  createdAt: string;
  ageHours: number;
  question: { slug: string; title: string; language: PostLanguage } | null;
}

export interface DiscussionsQuery {
  category?: string;
  language?: PostLanguage;
  sort?: DiscussionSort;
  page?: number;
  limit?: number;
}

/** Re-throw a 429 as a typed ThrottledError, carrying the server's message; pass anything
 *  else through untouched. */
function asThrottled(err: unknown): unknown {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 429) {
    const msg = (err as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message;
    return new ThrottledError(msg || 'You are posting too quickly. Try again shortly.');
  }
  return err;
}

export const dawahApi = {
  /** Active categories, in display order. Shared by courses and the library. */
  categories: (): Promise<DawahCategory[]> =>
    unwrap(publicHttp.get('/dawah/categories')),

  /**
   * Community Discussions — read-only (Phase A).
   *
   * Posting arrives in Phase B together with its report queue; there is deliberately no
   * `create` here yet, so no component can be written against an endpoint that cannot
   * yet be moderated.
   */
  discussions: {
    list: (query: DiscussionsQuery = {}): Promise<Paginated<DiscussionQuestion>> =>
      unwrap(publicHttp.get('/dawah/discussions', { params: query })),

    /** One thread; answers arrive verified-first from the API. 404s anything not published. */
    bySlug: (slug: string): Promise<DiscussionThread> =>
      unwrap(publicHttp.get(`/dawah/discussions/${slug}`)),

    /** Ask a question. Authed (apiClient carries the token). Maps 429 → ThrottledError. */
    create: async (payload: CreateQuestionPayload): Promise<DiscussionQuestion> => {
      try {
        return await unwrap(apiClient.post('/dawah/discussions', payload));
      } catch (err) {
        throw asThrottled(err);
      }
    },

    /** Render markdown → sanitised HTML through the server's real pipeline, so the
     *  preview cannot diverge from the published post. */
    preview: (body: string): Promise<{ html: string }> =>
      unwrap(apiClient.post('/dawah/discussions/preview', { body })),

    report: async (payload: CreateReportPayload): Promise<{ reported: boolean }> => {
      try {
        return await unwrap(apiClient.post('/dawah/discussions/report', payload));
      } catch (err) {
        throw asThrottled(err);
      }
    },

    /** Answer a question. Server computes pending vs published from the category policy. */
    answer: async (slug: string, body: string, isAnonymous = false): Promise<DiscussionAnswer> => {
      try {
        return await unwrap(apiClient.post(`/dawah/discussions/${slug}/answers`, { body, isAnonymous }));
      } catch (err) {
        throw asThrottled(err);
      }
    },

    /** Vote on an answer: 1 up, -1 down, 0 clears. */
    vote: (answerId: string, value: 1 | -1 | 0): Promise<{ id: string; voteScore: number }> =>
      unwrap(apiClient.post(`/dawah/discussions/answers/${answerId}/vote`, { value })),
  },

  courses: {
    list: (query: CoursesQuery = {}): Promise<Paginated<DawahCourse>> =>
      unwrap(publicHttp.get('/dawah/courses', { params: query })),

    /** Max 6 — the landing page's course outline. */
    featured: (): Promise<DawahCourse[]> =>
      unwrap(publicHttp.get('/dawah/courses/featured')),

    /** The course plus its ordered lessons. 404s on an unpublished slug. */
    bySlug: (slug: string): Promise<DawahCourse> =>
      unwrap(publicHttp.get(`/dawah/courses/${slug}`)),
  },

  books: {
    list: (query: BooksQuery = {}): Promise<Paginated<DawahBook>> =>
      unwrap(publicHttp.get('/dawah/books', { params: query })),

    featured: (): Promise<DawahBook[]> =>
      unwrap(publicHttp.get('/dawah/books/featured')),

    /** Metadata only — never the storage keys. */
    bySlug: (slug: string): Promise<DawahBook> =>
      unwrap(publicHttp.get(`/dawah/books/${slug}`)),

    /**
     * BACKEND url, not a file-server one — see the note at the top of this file.
     *
     * Safe to drop straight into an <iframe src> for a `public` book. A
     * `members` book is a different matter: an iframe cannot send an
     * Authorization header, so the request arrives anonymous and the backend
     * answers 401. For those, fetch the bytes with previewBlobUrl() below,
     * which goes through apiClient and therefore carries the token.
     */
    previewUrl: (slug: string): string => `${API_BASE_URL}/dawah/books/${slug}/preview`,

    /** BACKEND url. 403 when allowDownload is false; 401 when members-only and anonymous. */
    downloadUrl: (slug: string): string => `${API_BASE_URL}/dawah/books/${slug}/download`,

    /**
     * Fetch the preview as an object URL, WITH the bearer token attached.
     *
     * This is what a members-only book needs: apiClient adds the Authorization
     * header, so the backend sees an authenticated reader and streams the file.
     * Same shape as components/drive/FilePreview.tsx, which already does
     * authenticated-blob → createObjectURL → <iframe>.
     *
     * The caller MUST URL.revokeObjectURL() the result on unmount, or the PDF
     * stays pinned in memory for the life of the tab.
     */
    previewBlobUrl: async (slug: string): Promise<string> => {
      const res = await apiClient.get(`/dawah/books/${slug}/preview`, {
        responseType: 'blob',
      });
      return URL.createObjectURL(res.data as Blob);
    },
  },

  admin: {
    discussions: {
      /** The moderation queue — open reports, oldest first. Gated on DISCUSSIONS_MODERATE. */
      reports: (): Promise<DiscussionReport[]> =>
        unwrap(apiClient.get('/admin/dawah/discussions/reports')),

      /** Hide / restore / lock a question. Always logged server-side. */
      moderate: (id: string, action: 'hide' | 'restore' | 'lock' | 'unlock', reason = ''):
        Promise<{ id: string; status: string }> =>
        unwrap(apiClient.post(`/admin/dawah/discussions/${id}/${action}`, { reason })),

      /** The scholar review queue — pending answers, oldest first. */
      pending: (): Promise<PendingAnswer[]> =>
        unwrap(apiClient.get('/admin/dawah/discussions/pending')),

      /** Release: publish, NO badge ("not harmful"). */
      release: (answerId: string): Promise<{ id: string; verified: boolean }> =>
        unwrap(apiClient.post(`/admin/dawah/discussions/answers/${answerId}/release`, {})),

      /** Verify: publish + badge + pin ("RMC says this is correct"). */
      verify: (answerId: string): Promise<{ id: string; verified: boolean }> =>
        unwrap(apiClient.post(`/admin/dawah/discussions/answers/${answerId}/verify`, {})),
    },

    categories: {
      list: (): Promise<DawahCategory[]> =>
        unwrap(apiClient.get('/admin/dawah/categories')),

      create: (payload: CategoryPayload): Promise<DawahCategory> =>
        unwrap(apiClient.post('/admin/dawah/categories', payload)),

      /** `slug` is immutable — it is a public URL filter. Omit it. */
      update: (id: string, payload: Partial<Omit<CategoryPayload, 'slug'>>): Promise<DawahCategory> =>
        unwrap(apiClient.patch(`/admin/dawah/categories/${id}`, payload)),

      remove: async (id: string): Promise<void> => {
        await apiClient.delete(`/admin/dawah/categories/${id}`);
      },
    },

    courses: {
      /** Every status. Pass `status` to filter. */
      list: (query: CoursesQuery = {}): Promise<Paginated<DawahCourse>> =>
        unwrap(apiClient.get('/admin/dawah/courses', { params: query })),

      get: (id: string): Promise<DawahCourse> =>
        unwrap(apiClient.get(`/admin/dawah/courses/${id}`)),

      create: (payload: CoursePayload): Promise<DawahCourse> =>
        unwrap(apiClient.post('/admin/dawah/courses', payload)),

      /** A slug change is silently IGNORED once the course is published. */
      update: (id: string, payload: Partial<CoursePayload>): Promise<DawahCourse> =>
        unwrap(apiClient.patch(`/admin/dawah/courses/${id}`, payload)),

      remove: async (id: string): Promise<void> => {
        await apiClient.delete(`/admin/dawah/courses/${id}`);
      },

      setStatus: (id: string, status: ContentStatus): Promise<DawahCourse> =>
        unwrap(apiClient.patch(`/admin/dawah/courses/${id}/status`, { status })),
    },

    lessons: {
      add: (courseId: string, payload: LessonPayload): Promise<DawahCourseLesson> =>
        unwrap(apiClient.post(`/admin/dawah/courses/${courseId}/lessons`, payload)),

      update: (id: string, payload: Partial<LessonPayload>): Promise<DawahCourseLesson> =>
        unwrap(apiClient.patch(`/admin/dawah/lessons/${id}`, payload)),

      /** Hard delete — lessons have no soft-delete. */
      remove: async (id: string): Promise<void> => {
        await apiClient.delete(`/admin/dawah/lessons/${id}`);
      },

      /**
       * `ids` must be the COMPLETE lesson set of the course, in the new order.
       * The backend rejects a partial or duplicated list rather than reordering
       * what it can — so send every id, not just the ones that moved.
       */
      reorder: (courseId: string, ids: string[]): Promise<DawahCourseLesson[]> =>
        unwrap(apiClient.post(`/admin/dawah/courses/${courseId}/lessons/reorder`, { ids })),
    },

    books: {
      list: (query: BooksQuery = {}): Promise<Paginated<DawahBookAdmin>> =>
        unwrap(apiClient.get('/admin/dawah/books', { params: query })),

      get: (id: string): Promise<DawahBookAdmin> =>
        unwrap(apiClient.get(`/admin/dawah/books/${id}`)),

      create: (payload: BookPayload): Promise<DawahBookAdmin> =>
        unwrap(apiClient.post('/admin/dawah/books', payload)),

      update: (id: string, payload: Partial<BookPayload>): Promise<DawahBookAdmin> =>
        unwrap(apiClient.patch(`/admin/dawah/books/${id}`, payload)),

      remove: async (id: string): Promise<void> => {
        await apiClient.delete(`/admin/dawah/books/${id}`);
      },

      /**
       * Upload a book PDF, then pass the result into create()/update().
       *
       * PDF only, 25 MB max — both enforced by the backend. The file lands under
       * the protected prefix, so from here on it is only readable through the
       * backend's own routes.
       */
      upload: async (file: File): Promise<UploadedBookFile> => {
        const form = new FormData();
        form.append('file', file);
        const { data } = await apiClient.post('/admin/dawah/books/upload', form);
        return data.data ?? data;
      },

      /** Same upload, but with progress events — for the admin book form. */
      uploadWithProgress: uploadBookFile,

      /** Authenticated inline stream — lets an admin proof a DRAFT book. */
      fileUrl: (id: string): string => `${API_BASE_URL}/admin/dawah/books/${id}/file`,

      /**
       * Fetch that inline stream as an object URL WITH the bearer token, for the
       * admin proof overlay: an <iframe> can't send the Authorization header the
       * `:id/file` route requires, so we fetch through apiClient and hand the
       * iframe a blob URL. Revoke it on unmount (a 25 MB PDF stays pinned in
       * memory otherwise). Same shape as books.previewBlobUrl().
       */
      fileBlobUrl: async (id: string): Promise<string> => {
        const res = await apiClient.get(`/admin/dawah/books/${id}/file`, {
          responseType: 'blob',
        });
        return URL.createObjectURL(res.data as Blob);
      },
    },
  },
};
