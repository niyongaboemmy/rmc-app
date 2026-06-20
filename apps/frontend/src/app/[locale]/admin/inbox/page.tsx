'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { useInboxUnread } from '@/contexts/InboxUnreadContext';
import {
  Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle, ModalDescription, ConfirmModal,
} from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  Mail, MailOpen, Archive, ArchiveRestore, Trash2, Search, Inbox as InboxIcon,
  CalendarDays, User, AtSign, RefreshCw,
} from 'lucide-react';
import {
  inboxApi,
  type ContactMessage,
  type ContactMessageStatus,
  type ContactCounts,
} from '@/lib/contactApi';

type StatusFilter = ContactMessageStatus | 'all';

const EMPTY_COUNTS: ContactCounts = { all: 0, unread: 0, read: 0, archived: 0 };

export default function AdminInboxPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTACT_MESSAGES_VIEW]}>
      <ToastProvider><Inbox /></ToastProvider>
    </ProtectedRoute>
  );
}

function Inbox() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const { setUnread } = useInboxUnread();
  const canManage = hasPermission(Permission.CONTACT_MESSAGES_MANAGE);

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [counts, setCounts] = useState<ContactCounts>(EMPTY_COUNTS);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [busy, setBusy] = useState(false);

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const loadCounts = useCallback(() => {
    inboxApi.counts().then((c) => {
      setCounts(c);
      setUnread(c.unread); // keep the sidebar badge in sync instantly
    }).catch(() => { /* leave as-is */ });
  }, [setUnread]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inboxApi.list({ status, search: search || undefined, page, limit: 20 });
      setMessages(res.items);
      setPages(res.pages);
      setTotal(res.total);
    } catch {
      error('Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [status, search, page, error]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  // Reset to page 1 whenever the filter or search changes.
  useEffect(() => { setPage(1); }, [status, search]);

  // Debounce the search input.
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const patchLocal = (id: string, next: ContactMessageStatus) => {
    setMessages((prev) =>
      status === 'all' ? prev.map((m) => (m.id === id ? { ...m, status: next } : m))
        : prev.filter((m) => m.id === id ? next === status : true),
    );
  };

  const openMessage = async (m: ContactMessage) => {
    setSelected(m);
    // Auto-mark unread → read on open (if the admin can manage).
    if (m.status === 'unread' && canManage) {
      try {
        await inboxApi.updateStatus(m.id, 'read');
        setSelected((s) => (s && s.id === m.id ? { ...s, status: 'read' } : s));
        patchLocal(m.id, 'read');
        loadCounts();
      } catch { /* non-fatal */ }
    }
  };

  const changeStatus = async (m: ContactMessage, next: ContactMessageStatus) => {
    setBusy(true);
    try {
      await inboxApi.updateStatus(m.id, next);
      patchLocal(m.id, next);
      setSelected((s) => (s && s.id === m.id ? { ...s, status: next } : s));
      loadCounts();
      success(next === 'archived' ? 'Message archived.' : next === 'unread' ? 'Marked as unread.' : 'Marked as read.');
    } catch {
      error('Could not update the message.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await inboxApi.remove(deleteTarget.id);
      setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      loadCounts();
      success('Message deleted.');
    } catch {
      error('Could not delete the message.');
    } finally {
      setBusy(false);
    }
  };

  const FILTERS: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'unread', label: 'Unread', count: counts.unread },
    { key: 'read', label: 'Read', count: counts.read },
    { key: 'archived', label: 'Archived', count: counts.archived },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rmc-green/10 flex items-center justify-center">
            <InboxIcon className="w-5 h-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
            <p className="text-xs text-gray-400">
              {total} message{total !== 1 ? 's' : ''}
              {counts.unread > 0 && <> · <span className="text-rmc-green font-semibold">{counts.unread} unread</span></>}
            </p>
          </div>
        </div>
        <button onClick={() => { load(); loadCounts(); }} className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filter chips + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === f.key ? 'bg-rmc-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
              <span className={`text-xs ${status === f.key ? 'text-white/80' : 'text-gray-400'}`}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search messages…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rmc-green focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600">
                <th className="px-4 py-3 font-semibold">From</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Received</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td colSpan={5} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-100 rounded" /></td>
                  </tr>
                ))
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-gray-400">
                    <InboxIcon className="w-9 h-9 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No messages{status !== 'all' ? ` in “${status}”` : ''}{search ? ' match your search' : ''}.</p>
                  </td>
                </tr>
              ) : (
                messages.map((m) => {
                  const unread = m.status === 'unread';
                  return (
                    <tr
                      key={m.id}
                      onClick={() => openMessage(m)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${unread ? 'bg-rmc-green/[0.025]' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className={`text-gray-900 ${unread ? 'font-bold' : 'font-medium'}`}>{m.name}</div>
                        <div className="text-xs text-gray-400">{m.email}</div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className={`truncate ${unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{m.subject}</div>
                        <div className="text-xs text-gray-400 truncate">{m.message}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{dateFmt.format(new Date(m.createdAt))}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <>
                              <button
                                title={unread ? 'Mark read' : 'Mark unread'}
                                onClick={() => changeStatus(m, unread ? 'read' : 'unread')}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-rmc-green hover:bg-rmc-green/10 transition-colors"
                              >
                                {unread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                              </button>
                              <button
                                title={m.status === 'archived' ? 'Unarchive' : 'Archive'}
                                onClick={() => changeStatus(m, m.status === 'archived' ? 'read' : 'archived')}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              >
                                {m.status === 'archived' ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                              </button>
                              <button
                                title="Delete"
                                onClick={() => setDeleteTarget(m)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">Page {page} of {pages} — {total} total</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">← Prev</button>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} size="lg">
        {selected && (
          <>
            <ModalHeader>
              <ModalTitle>{selected.subject}</ModalTitle>
              <ModalDescription>
                <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {selected.name}</span>
                  <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1.5 text-rmc-green hover:underline"><AtSign className="w-3.5 h-3.5" /> {selected.email}</a>
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {dateFmt.format(new Date(selected.createdAt))}</span>
                </span>
              </ModalDescription>
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
            </ModalBody>
            <ModalFooter>
              <a
                href={`mailto:${selected.email}?subject=${encodeURIComponent('Re: ' + selected.subject)}`}
                className="mr-auto inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-rmc-green border border-rmc-green/30 rounded-xl hover:bg-rmc-green/5 transition-colors"
              >
                <Mail className="w-4 h-4" /> Reply by email
              </a>
              {canManage && (
                <>
                  <button
                    onClick={() => changeStatus(selected, selected.status === 'archived' ? 'read' : 'archived')}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60 transition-colors"
                  >
                    {selected.status === 'archived' ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    {selected.status === 'archived' ? 'Unarchive' : 'Archive'}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(selected)}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-60 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </>
              )}
            </ModalFooter>
          </>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this message?"
        description="This permanently removes the message from the inbox."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        isLoading={busy}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: ContactMessageStatus }) {
  const map: Record<ContactMessageStatus, string> = {
    unread: 'bg-rmc-green/10 text-rmc-green border-rmc-green/20',
    read: 'bg-gray-100 text-gray-600 border-gray-200',
    archived: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
