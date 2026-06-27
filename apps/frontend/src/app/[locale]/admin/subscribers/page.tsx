'use client';

import { useCallback, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/Modal';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { subscribersApi, type Subscriber } from '@/lib/subscribersApi';
import { Mail, Users, Send, Trash2, RefreshCw, FileSpreadsheet, Upload, X } from 'lucide-react';

export default function SubscribersPage() {
  return (
    <ProtectedRoute permissions={[Permission.SUBSCRIBERS_VIEW]}>
      <ToastProvider><SubscribersManager /></ToastProvider>
    </ProtectedRoute>
  );
}

function SubscribersManager() {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const canManage = hasPermission(Permission.SUBSCRIBERS_MANAGE);

  const [items, setItems] = useState<Subscriber[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirmFile, setConfirmFile] = useState(false);
  const [sendingFile, setSendingFile] = useState(false);

  const doTest = async () => {
    setTesting(true);
    try {
      const res = await subscribersApi.sendTest(testTo.trim());
      success(res.configured ? `Test email sent to ${testTo.trim()}.` : 'SMTP not configured — email was logged to the server console only.');
    } catch {
      error('Test email failed — check SMTP settings / server logs.');
    } finally {
      setTesting(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await subscribersApi.list();
      setItems(res.items);
      setActive(res.active);
    } catch {
      error('Could not load subscribers.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { load(); }, [load]);

  const bodyHasText = body.replace(/<[^>]*>/g, '').trim().length > 0;

  const doSend = async () => {
    setSending(true);
    try {
      const res = await subscribersApi.broadcast({ subject: subject.trim(), html: body });
      setConfirmSend(false);
      success(`Sent to ${res.sent} subscriber${res.sent === 1 ? '' : 's'}${res.failed ? ` · ${res.failed} failed` : ''}.`);
      setSubject('');
      setBody('');
    } catch {
      error('Could not send the broadcast.');
    } finally {
      setSending(false);
    }
  };

  const doSendFile = async () => {
    if (!file) return;
    setSendingFile(true);
    try {
      const res = await subscribersApi.broadcastFile(file, { subject: subject.trim(), html: body });
      setConfirmFile(false);
      success(
        `Sent to ${res.sent} of ${res.total} email${res.total === 1 ? '' : 's'}` +
          `${res.failed ? ` · ${res.failed} failed` : ''}` +
          `${res.invalidRows ? ` · ${res.invalidRows} row(s) skipped` : ''}.`,
      );
      setFile(null);
      setSubject('');
      setBody('');
    } catch (e) {
      error(e instanceof Error ? e.message : 'Could not send the bulk mail. Check the file and try again.');
    } finally {
      setSendingFile(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await subscribersApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch {
      error('Could not remove subscriber.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rmc-green-light flex items-center justify-center">
          <Mail className="w-5 h-5 text-rmc-green" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Subscribers</h1>
          <p className="text-xs text-gray-400">Manage newsletter subscribers and send updates</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users className="w-4 h-4" />} label="Total" value={items.length} />
        <StatCard icon={<Mail className="w-4 h-4" />} label="Active" value={active} />
        <StatCard icon={<Trash2 className="w-4 h-4" />} label="Unsubscribed" value={items.length - active} />
      </div>

      {/* Send a test email (verify SMTP) */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <h2 className="text-sm font-bold text-gray-700">Test email delivery</h2>
              <p className="text-xs text-gray-400">Send a one-off email to confirm SMTP is configured correctly.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="you@example.com"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30"
              />
              <button
                onClick={doTest}
                disabled={!testTo.includes('@') || testing}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose broadcast */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">Send a newsletter</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. New programs are live"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message</label>
            <RichTextEditor value={body} onChange={setBody} />
          </div>
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-gray-400">Will be emailed to {active} active subscriber{active === 1 ? '' : 's'}</span>
            <button
              onClick={() => setConfirmSend(true)}
              disabled={!subject.trim() || !bodyHasText || active === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-rmc-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-rmc-green-dark disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" /> Send broadcast
            </button>
          </div>

          {/* Bulk mail from an uploaded list */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-4 h-4 text-rmc-green" />
              <h3 className="text-sm font-bold text-gray-700">Or send to an uploaded list</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Upload an Excel/CSV file containing email addresses — the same subject &amp; message above
              will be sent to every email found (any column; header rows are ignored).
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-rmc-green/40 hover:bg-gray-50 cursor-pointer">
                <Upload className="w-4 h-4" />
                {file ? 'Change file' : 'Choose Excel / CSV'}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {file && (
                <span className="inline-flex items-center gap-2 text-xs text-gray-600 min-w-0">
                  <span className="truncate max-w-[200px] font-medium">{file.name}</span>
                  <button onClick={() => setFile(null)} aria-label="Remove file" className="text-gray-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              <button
                onClick={() => setConfirmFile(true)}
                disabled={!subject.trim() || !bodyHasText || !file}
                className="sm:ms-auto inline-flex items-center gap-2 rounded-xl border border-rmc-green px-5 py-2.5 text-sm font-semibold text-rmc-green hover:bg-rmc-green-light disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" /> Send to file list
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-700">All subscribers ({items.length})</h2>
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-rmc-green">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No subscribers yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-900 truncate">{s.email}</span>
                  <span className="block text-[11px] text-gray-400">
                    {new Date(s.createdAt).toLocaleDateString()} {s.source ? `· ${s.source}` : ''}
                  </span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.isActive ? 'active' : 'unsubscribed'}
                </span>
                {canManage && (
                  <button onClick={() => setDeleteTarget(s)} aria-label="Remove subscriber" className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmSend}
        onClose={() => setConfirmSend(false)}
        onConfirm={doSend}
        title="Send broadcast?"
        message={`This will email "${subject.trim()}" to ${active} active subscriber${active === 1 ? '' : 's'}. This cannot be undone.`}
        confirmLabel="Send now"
        isLoading={sending}
      />
      <ConfirmModal
        open={confirmFile}
        onClose={() => setConfirmFile(false)}
        onConfirm={doSendFile}
        title="Send to uploaded list?"
        message={`This will email "${subject.trim()}" to every address found in "${file?.name ?? ''}". This cannot be undone.`}
        confirmLabel="Send now"
        isLoading={sendingFile}
      />
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Remove subscriber"
        message={deleteTarget ? `Remove ${deleteTarget.email}? They will stop receiving updates.` : ''}
        confirmLabel="Remove"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 text-gray-400 mb-1.5">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}
