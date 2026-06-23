import axios from 'axios';
import { apiClient } from './api';

/**
 * Contact-message API.
 *  - `submitContactMessage` is PUBLIC (no auth) — used by the Contact page form.
 *  - `inboxApi` is authenticated — used by the admin Inbox to read/manage messages.
 */

export type ContactMessageStatus = 'unread' | 'read' | 'archived';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessagesPage {
  items: ContactMessage[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ContactCounts {
  all: number;
  unread: number;
  read: number;
  archived: number;
}

export interface ContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Public (unauthenticated) client — mirrors the site-content public reader.
const publicHttp = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
});

/** Submit a message from the public Contact page. */
export async function submitContactMessage(input: ContactMessageInput): Promise<{ id: string }> {
  const res = await publicHttp.post<{ data: { id: string } }>('/contact-messages', input);
  return res.data.data ?? res.data;
}

export interface InboxListParams {
  status?: ContactMessageStatus | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

/** Authenticated admin inbox operations. */
export const inboxApi = {
  list: async (params: InboxListParams = {}): Promise<ContactMessagesPage> => {
    const res = await apiClient.get('/admin/contact-messages', { params });
    return res.data.data ?? res.data;
  },
  counts: async (): Promise<ContactCounts> => {
    const res = await apiClient.get('/admin/contact-messages/counts');
    return res.data.data ?? res.data;
  },
  updateStatus: async (id: string, status: ContactMessageStatus): Promise<ContactMessage> => {
    const res = await apiClient.patch(`/admin/contact-messages/${id}`, { status });
    return res.data.data ?? res.data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/contact-messages/${id}`);
  },
};
