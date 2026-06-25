'use client';

import { useState } from 'react';
import { Mail, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { ConfirmModal } from '@/components/ui/Modal';
import { subscribersApi } from '@/lib/subscribersApi';

/**
 * Self-contained "Notify subscribers" action. Emails a prebuilt subject + HTML
 * body to all active subscribers (reuses the broadcast engine). Renders nothing
 * for admins without SUBSCRIBERS_MANAGE. Shows its own confirm + inline result,
 * so it doesn't depend on a surrounding ToastProvider.
 */
export function NotifySubscribersButton({
  subject,
  html,
  disabled,
  className,
  compact,
}: {
  subject: string;
  html: string;
  disabled?: boolean;
  className?: string;
  /** Icon-only button, to sit in a row of icon actions (card toolbars). */
  compact?: boolean;
}) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!hasPermission(Permission.SUBSCRIBERS_MANAGE)) return null;

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const res = await subscribersApi.broadcast({ subject: subject.trim(), html });
      setOpen(false);
      setResult(`Notified ${res.sent} subscriber${res.sent === 1 ? '' : 's'}${res.failed ? ` (${res.failed} failed)` : ''}.`);
    } catch {
      setError('Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const done = result !== null;

  return (
    <span className={className}>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled || done || !subject.trim()}
          title={done ? result! : disabled ? 'Save/publish first' : 'Notify subscribers'}
          aria-label="Notify subscribers"
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
            done ? 'text-rmc-green' : 'text-gray-400 hover:text-rmc-green hover:bg-rmc-green/5'
          }`}
        >
          {done ? <Check className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
        </button>
      ) : done ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rmc-green">
          <Check className="w-3.5 h-3.5" /> {result}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled || !subject.trim()}
          title={disabled ? 'Save/publish first' : 'Email this to all subscribers'}
          className="inline-flex items-center gap-2 rounded-xl border border-rmc-green/30 px-3 py-2 text-sm font-semibold text-rmc-green transition-colors hover:bg-rmc-green/5 disabled:opacity-50"
        >
          <Mail className="w-4 h-4" /> Notify subscribers
        </button>
      )}

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={send}
        title="Notify subscribers"
        message={`Email "${subject.trim()}" to all active subscribers? This cannot be undone.`}
        confirmLabel={sending ? 'Sending…' : 'Send'}
        isLoading={sending}
      />
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
