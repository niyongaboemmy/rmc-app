'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Check, Copy, ExternalLink, Link2, Loader2, Package,
  Pencil, RefreshCw, Smartphone, X, Zap,
} from 'lucide-react';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import {
  paymentSettingsApi,
  ProviderProductRow,
  IremboPayStatus,
  IremboPayTestResult,
} from '@/lib/paymentSettingsApi';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const PROVIDER = 'irembopay';

function fmtAmount(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('rw-RW').format(Number(n)) + ' RWF';
}

function rowKey(row: ProviderProductRow) {
  return `${row.paymentTypeId}:${row.paymentTypeRateId ?? 'default'}`;
}

/**
 * Admin → Settings → Payments → IremboPay.
 *
 * Two jobs: map every payment type to an IremboPay product code, and prove the
 * credentials work without leaving the page. Unmapped types are flagged up
 * front — an unmapped type fails at charge time, and the admin should find that
 * out here rather than from a payer.
 */
export function IremboPayProductsTab() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission(Permission.PAYMENT_SETTINGS_MANAGE);

  const [rows, setRows] = useState<ProviderProductRow[]>([]);
  const [status, setStatus] = useState<IremboPayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productRows, iremboStatus] = await Promise.all([
        paymentSettingsApi.listProviderProducts(PROVIDER),
        paymentSettingsApi.getIremboPayStatus().catch(() => null),
      ]);
      setRows(productRows);
      setStatus(iremboStatus);
    } catch {
      showToast('Could not load the IremboPay product mapping', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (row: ProviderProductRow, productCode: string, account: string) => {
    await paymentSettingsApi.upsertProviderProduct(
      {
        paymentTypeId: row.paymentTypeId,
        paymentTypeRateId: row.paymentTypeRateId,
        productCode: productCode.trim(),
        paymentAccountIdentifier: account.trim() || null,
      },
      PROVIDER,
    );
    showToast('Product mapping saved', 'success');
    setEditing(null);
    await load();
  };

  const unmappedCount = rows.filter((r) => r.unmapped).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading IremboPay configuration…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ConfigurationBanner status={status} unmappedCount={unmappedCount} />

      {canManage && status?.configured && <TestPanel onDone={load} />}

      {/* ── Product mapping table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Product mapping</h3>
            <span className="text-xs text-gray-500">
              Each payment type needs an IremboPay product code from the portal
            </span>
          </div>
          <button
            onClick={() => void load()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="px-4 py-2.5 font-medium">Payment type</th>
                <th className="px-4 py-2.5 font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Product code</th>
                <th className="px-4 py-2.5 font-medium">Payment account</th>
                <th className="px-4 py-2.5 font-medium w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <ProductRow
                  key={rowKey(row)}
                  row={row}
                  editing={editing === rowKey(row)}
                  canManage={canManage}
                  onEdit={() => setEditing(rowKey(row))}
                  onCancel={() => setEditing(null)}
                  onSave={(code, account) => save(row, code, account)}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    No payment types exist yet — add them under Service Areas first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Configuration banner ──────────────────────────────────────────────────────

function ConfigurationBanner({
  status,
  unmappedCount,
}: {
  status: IremboPayStatus | null;
  unmappedCount: number;
}) {
  const { showToast } = useToast();

  if (!status?.configured) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900">IremboPay is not configured yet</p>
          <p className="text-amber-800 mt-0.5">
            Add the secret key, public key and payment account under{' '}
            <strong>Credentials → IremboPay</strong>. Nothing on this page will work until then.
          </p>
        </div>
      </div>
    );
  }

  const callbackUrl = `${typeof window !== 'undefined' ? window.location.origin.replace(/^https?:\/\/(www\.)?/, 'https://api.') : ''}/api/v1/webhooks/irembopay`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 rounded-xl border border-gray-200 bg-white text-sm">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
            status.isTestMode
              ? 'bg-amber-100 text-amber-700'
              : 'bg-rmc-green-light text-rmc-green',
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              status.isTestMode ? 'bg-amber-500' : 'bg-rmc-green',
            )}
          />
          {status.isTestMode ? 'Sandbox' : 'Production'}
        </span>

        <Field label="API" value={status.apiBaseUrl} />
        <Field label="Version" value={`v${status.apiVersion}`} />
        <Field label="Account" value={status.paymentAccountIdentifier} />
        <Field label="Invoice expiry" value={`${status.invoiceExpiryMinutes} min`} />
        <Field label="Language" value={status.defaultLanguage} />
      </div>

      <div className="flex items-start gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50 text-sm">
        <Link2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-blue-900">Callback URL — set this in the IremboPay portal</p>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs text-blue-800 bg-white/70 px-2 py-1 rounded truncate">
              {callbackUrl}
            </code>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(callbackUrl);
                showToast('Callback URL copied', 'success');
              }}
              className="text-blue-600 hover:text-blue-800 shrink-0"
              aria-label="Copy callback URL"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {unmappedCount > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-900">
            <strong>{unmappedCount}</strong>{' '}
            {unmappedCount === 1 ? 'entry has' : 'entries have'} no product code. A payment for{' '}
            {unmappedCount === 1 ? 'it' : 'them'} will be refused until one is mapped.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-gray-600">
      <span className="text-gray-400 text-xs uppercase tracking-wide mr-1.5">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </span>
  );
}

// ── Test panel ────────────────────────────────────────────────────────────────

function TestPanel({ onDone }: { onDone: () => void }) {
  const { showToast } = useToast();
  const [phone, setPhone] = useState('0781234567');
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState<'invoice' | 'push' | null>(null);
  const [result, setResult] = useState<IremboPayTestResult | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  // Watch the admin SSE stream so a MoMo approval flips the status here without
  // a refresh — the webhook, not the widget, is what confirms a payment.
  useEffect(() => {
    return () => sourceRef.current?.close();
  }, []);

  const listen = (transactionId: string) => {
    sourceRef.current?.close();
    try {
      const source = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'}/admin/payment-settings/events`,
        { withCredentials: true },
      );
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.requestTransactionId !== transactionId) return;
          setLiveStatus(data.status);
          if (data.status !== 'PENDING') {
            source.close();
            onDone();
          }
        } catch {
          /* a malformed frame is not worth breaking the panel over */
        }
      };
      source.onerror = () => source.close();
      sourceRef.current = source;
    } catch {
      /* SSE unavailable — the result card still shows the invoice */
    }
  };

  const run = async (mode: 'invoice' | 'push') => {
    setBusy(mode);
    setResult(null);
    setLiveStatus(null);
    try {
      const payload = { amount: Number(amount) || 100, mobilePhone: phone };
      const res =
        mode === 'push'
          ? await paymentSettingsApi.testIremboPayPush({ ...payload, paymentProvider: 'MTN' })
          : await paymentSettingsApi.testIremboPayInvoice(payload);

      setResult(res);
      setLiveStatus(res.status);
      if (mode === 'push') listen(res.transactionId);
      showToast(res.message || `Invoice ${res.invoiceNumber} created`, 'success');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'The test failed';
      showToast(message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Test connection</h3>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Amount (RWF)</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rmc-green/20 focus:border-rmc-green outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">MoMo number</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-rmc-green/20 focus:border-rmc-green outline-none"
          />
        </label>

        <button
          onClick={() => void run('invoice')}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === 'invoice' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Package className="w-4 h-4" />
          )}
          Create test invoice
        </button>

        <button
          onClick={() => void run('push')}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-rmc-green text-white hover:bg-rmc-green/90 disabled:opacity-50"
        >
          {busy === 'push' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Smartphone className="w-4 h-4" />
          )}
          Test MoMo push
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Field label="Invoice" value={result.invoiceNumber} />
            <span className="text-gray-600">
              <span className="text-gray-400 text-xs uppercase tracking-wide mr-1.5">Status</span>
              <span
                className={cn(
                  'font-medium',
                  liveStatus === 'SUCCESSFUL'
                    ? 'text-rmc-green'
                    : liveStatus === 'FAILED'
                      ? 'text-red-600'
                      : 'text-amber-600',
                )}
              >
                {liveStatus ?? result.status}
                {liveStatus === 'PENDING' && (
                  <Loader2 className="w-3 h-3 animate-spin inline ml-1.5" />
                )}
              </span>
            </span>
          </div>

          {result.message && <p className="text-gray-600">{result.message}</p>}

          {result.paymentLinkUrl && (
            <a
              href={result.paymentLinkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-rmc-green hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open the payment link
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── One mapping row ───────────────────────────────────────────────────────────

interface ProductRowProps {
  row: ProviderProductRow;
  editing: boolean;
  canManage: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (productCode: string, account: string) => Promise<void>;
}

function ProductRow({ row, editing, canManage, onEdit, onCancel, onSave }: ProductRowProps) {
  const [code, setCode] = useState(row.productCode ?? '');
  const [account, setAccount] = useState(row.paymentAccountIdentifier ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCode(row.productCode ?? '');
    setAccount(row.paymentAccountIdentifier ?? '');
  }, [row.productCode, row.paymentAccountIdentifier, editing]);

  const commit = async () => {
    if (!code.trim()) return;
    setSaving(true);
    try {
      await onSave(code, account);
    } finally {
      setSaving(false);
    }
  };

  const isRate = row.paymentTypeRateId !== null;

  return (
    <tr className={cn('hover:bg-gray-50/50', row.unmapped && 'bg-amber-50/40')}>
      <td className="px-4 py-2.5">
        <div className={cn('flex items-center gap-2', isRate && 'pl-5')}>
          {isRate && <span className="text-gray-300">└</span>}
          <div>
            <span className="font-medium text-gray-900">
              {isRate ? row.rateName : row.paymentTypeName}
            </span>
            <span className="ml-2 text-xs text-gray-400">
              {isRate ? (row.rateCode ?? 'rate') : row.paymentTypeKey}
            </span>
          </div>
          {row.unmapped && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
              <AlertTriangle className="w-3 h-3" />
              unmapped
            </span>
          )}
        </div>
      </td>

      <td className="px-4 py-2.5 text-gray-600">{fmtAmount(row.amount)}</td>

      <td className="px-4 py-2.5">
        {editing ? (
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commit();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="PI-3e5fe23f2d"
            className="w-44 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-rmc-green/20 focus:border-rmc-green outline-none"
          />
        ) : row.productCode ? (
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
            {row.productCode}
          </code>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      <td className="px-4 py-2.5">
        {editing ? (
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commit();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="inherits default"
            className="w-36 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-rmc-green/20 focus:border-rmc-green outline-none"
          />
        ) : (
          <span className="text-gray-600 text-xs">
            {row.paymentAccountIdentifier ?? (
              <span className="text-gray-300">inherits default</span>
            )}
          </span>
        )}
      </td>

      <td className="px-4 py-2.5 text-right">
        {!canManage ? null : editing ? (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => void commit()}
              disabled={saving || !code.trim()}
              className="p-1 text-rmc-green hover:bg-rmc-green-light rounded disabled:opacity-40"
              aria-label="Save"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            aria-label="Edit mapping"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

export default IremboPayProductsTab;
