import { apiClient } from './api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface Subscriber {
  id: string;
  email: string;
  isActive: boolean;
  locale: string;
  source: string | null;
  createdAt: string;
}

export interface SubscriberList {
  items: Subscriber[];
  total: number;
  active: number;
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
}

export interface FileBroadcastResult extends BroadcastResult {
  /** Non-empty rows that contained no email address (e.g. a header row). */
  invalidRows: number;
}

export const subscribersApi = {
  list: async (): Promise<SubscriberList> => {
    const { data } = await apiClient.get('/admin/subscribers');
    return data.data ?? data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/subscribers/${id}`);
  },
  broadcast: async (payload: { subject: string; html: string }): Promise<BroadcastResult> => {
    const { data } = await apiClient.post('/admin/subscribers/broadcast', payload);
    return data.data ?? data;
  },
  broadcastFile: async (
    file: File,
    payload: { subject: string; html: string },
  ): Promise<FileBroadcastResult> => {
    // Use fetch (not the JSON-defaulted axios client) so the browser sets the
    // multipart/form-data boundary itself — otherwise the upload arrives with a
    // JSON content-type and the server can't parse the file.
    const fd = new FormData();
    fd.append('file', file);
    fd.append('subject', payload.subject);
    fd.append('html', payload.html);
    const token = typeof window !== 'undefined' ? localStorage.getItem('rmc_access_token') : null;
    const res = await fetch(`${API_BASE_URL}/admin/subscribers/broadcast-file`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    if (!res.ok) {
      let message = `Upload failed (${res.status})`;
      try {
        const err = await res.json();
        message = err?.message || err?.error || message;
      } catch {
        /* ignore non-JSON error body */
      }
      throw new Error(message);
    }
    const data = await res.json();
    return data.data ?? data;
  },
  sendTest: async (to: string): Promise<{ configured: boolean }> => {
    const { data } = await apiClient.post('/admin/subscribers/test-email', { to });
    return data.data ?? data;
  },
};
