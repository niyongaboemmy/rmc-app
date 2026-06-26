'use client';

import { useState } from 'react';
import {
  Send, AlertCircle, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { settingsApi, TestSmsResult, SmsRecipientDetail } from '@/lib/settingsApi';
import { Button } from '@/components/ui/Button';
import { PhoneInput, toE164 } from '@/components/ui/PhoneInput';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const DLR_STATUS: Record<string, { label: string; color: string }> = {
  P: { label: 'Processing',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  D: { label: 'Delivered',   color: 'text-green-700 bg-green-50 border-green-200' },
  Q: { label: 'Queued',      color: 'text-blue-600  bg-blue-50  border-blue-200'  },
  S: { label: 'Sent',        color: 'text-teal-600  bg-teal-50  border-teal-200'  },
  E: { label: 'Errored',     color: 'text-red-600   bg-red-50   border-red-200'   },
  U: { label: 'Undelivered', color: 'text-red-600   bg-red-50   border-red-200'   },
};

interface Props {
  gatewayActive: boolean;
}

export function SmsTestingTab({ gatewayActive }: Props) {
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('This is a test SMS from RMC Admin Panel.');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestSmsResult | null>(null);

  const handleSend = async () => {
    if (!phone.trim()) { toast.error('Phone number is required.'); return; }
    if (!message.trim()) { toast.error('Message is required.'); return; }

    setSending(true);
    setResult(null);
    try {
      const res = await settingsApi.testSms(toE164(phone.trim()), message.trim());
      setResult(res);
      if (res.success) {
        toast.success('Test SMS sent successfully!');
      } else {
        toast.error(res.error ?? 'SMS failed to send.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Failed to send test SMS.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* Left — Input form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Send className="w-4 h-4 text-rmc-green" />
          <h2 className="text-sm font-semibold text-gray-900">Send Test SMS</h2>
          {!gatewayActive && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" /> Gateway inactive — logs to console
            </span>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          <PhoneInput
            label="Recipient Phone Number"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={160}
              placeholder="Enter test message..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rmc-green/30 focus:border-rmc-green resize-none transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/160</p>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={handleSend}
              isLoading={sending}
              leftIcon={sending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />
              }
            >
              {sending ? 'Sending…' : 'Send Test SMS'}
            </Button>
          </div>
        </div>
      </div>

      {/* Right — Result panel */}
      <div>
        {result ? (
          <TestSmsResultPanel result={result} />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 flex flex-col items-center justify-center text-center text-gray-400 gap-3">
            <Send className="w-8 h-8 opacity-30" />
            <p className="text-sm">Result will appear here after sending</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Result Panel ─────────────────────────────────────────────────────────────

function TestSmsResultPanel({ result }: { result: TestSmsResult }) {
  return (
    <div className={cn(
      'rounded-xl border overflow-hidden shadow-sm',
      result.success ? 'border-green-200' : 'border-red-200',
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-3 text-sm font-semibold',
        result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
      )}>
        {result.success
          ? <><CheckCircle2 className="w-4 h-4" /> SMS Sent Successfully</>
          : <><XCircle className="w-4 h-4" /> SMS Failed</>
        }
        <span className="ml-auto text-xs font-normal opacity-70 capitalize">{result.provider}</span>
      </div>

      {result.error && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-100 text-xs text-red-600">
          {result.error}
        </div>
      )}

      {result.summary && (
        <>
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 bg-gray-50">
            <SummaryStat label="Messages" value={String(result.summary.totalMessages)} />
            <SummaryStat label="Cost" value={`${Number(result.summary.cost).toFixed(2)} RWF`} />
            <SummaryStat label="Balance" value={`${Number(result.summary.balance).toLocaleString()} RWF`} />
          </div>
          {result.summary.sentAt && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-400 text-right">
              Sent at {new Date(result.summary.sentAt).toLocaleString()}
            </div>
          )}
        </>
      )}

      {result.details.length > 0 && (
        <div className="divide-y divide-gray-100 border-t border-gray-100 bg-white">
          {result.details.map((d: SmsRecipientDetail, i: number) => {
            const s = DLR_STATUS[d.status] ?? { label: d.status, color: 'text-gray-600 bg-gray-50 border-gray-200' };
            return (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-xs">
                <div>
                  <p className="font-mono text-gray-800">{d.recipient}</p>
                  {d.messageId > 0 && <p className="text-gray-400 mt-0.5">ID: {d.messageId}</p>}
                </div>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold', s.color)}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {result.provider === 'console' && (
        <div className="px-4 py-3 border-t border-amber-100 bg-amber-50 text-xs text-amber-700 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Gateway is inactive — SMS was logged to the server console, not actually sent.</span>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center py-3 px-4">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 mt-0.5">{value}</span>
    </div>
  );
}
