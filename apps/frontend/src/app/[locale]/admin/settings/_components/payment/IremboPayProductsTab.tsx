'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Check, Copy, Link2, Loader2, Package, Pencil, RefreshCw, X, Zap,
} from 'lucide-react';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import {
  paymentSettingsApi,
  ProviderProductRow,
  IremboPayStatus,
  ProviderEnvironment,
  ProviderCurrency,
  PROVIDER_CURRENCIES,
} from '@/lib/paymentSettingsApi';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const PROVIDER = 'irembopay';

function fmtAmount(n: number | null | undefined, currency = 'RWF') {
  if (n == null) return '—';
  return new Intl.NumberFormat('rw-RW').format(Number(n)) + ` ${currency}`;
}

function rowKey(row: ProviderProductRow) {
  return `${row.environment}:${row.currency}:${row.paymentTypeId}:${row.paymentTypeRateId ?? 'default'}`;
}

type CurrencyFilter = ProviderCurrency | 'ALL';

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
  // Null until the status says which merchant is live; the list then follows it.
  const [environment, setEnvironment] = useState<ProviderEnvironment | null>(null);
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('ALL');
  const initialised = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const iremboStatus = await paymentSettingsApi.getIremboPayStatus().catch(() => null);
      const env =
        environment ?? iremboStatus?.environment ?? (iremboStatus?.isTestMode === false ? 'production' : 'sandbox');
      if (!initialised.current) {
        initialised.current = true;
        setEnvironment(env);
      }
      setRows(await paymentSettingsApi.listProviderProducts(PROVIDER, env));
      setStatus(iremboStatus);
    } catch {
      showToast('Could not load the IremboPay product mapping', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, environment]);

  useEffect(() => {
    void load();
  }, [load]);

  const liveEnvironment: ProviderEnvironment | null = status
    ? status.environment ?? (status.isTestMode ? 'sandbox' : 'production')
    : null;
  const viewingLive = environment !== null && environment === liveEnvironment;
  const visibleRows = rows.filter((r) => currencyFilter === 'ALL' || r.currency === currencyFilter);

  const save = async (row: ProviderProductRow, productCode: string, account: string) => {
    await paymentSettingsApi.upsertProviderProduct(
      {
        paymentTypeId: row.paymentTypeId,
        paymentTypeRateId: row.paymentTypeRateId,
        productCode: productCode.trim(),
        paymentAccountIdentifier: account.trim() || null,
        currency: row.currency,
        environment: row.environment,
      },
      PROVIDER,
    );
    showToast('Product mapping saved', 'success');
    setEditing(null);
    await load();
  };

  // Only what the live merchant would refuse: inactive types cannot be charged.
  const unmappedCount = viewingLive
    ? rows.filter((r) => r.unmapped && r.paymentTypeActive).length
    : 0;

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

      {/*
        Running a payment lives on the Testing tab, not here. This tab had a
        near-duplicate of that panel, so there were two places to press "test"
        with no way to tell which one mattered. This tab is setup —
        credentials readout, callback URL, product mapping; Testing is where a
        charge is actually made and its history kept.
      */}
      {canManage && status?.configured && (
        <p className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <Zap className="h-4 w-4 shrink-0 text-gray-400" />
          Ready to take a payment. Run one from the{' '}
          <span className="font-semibold text-gray-900">Testing</span> tab, which also keeps a
          history of test transactions.
        </p>
      )}

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

        {/*
          Sandbox and production are separate merchants with separate product
          codes. Both sets are kept; the Test-mode toggle picks the live one.
        */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 border-b border-gray-200 text-xs">
          <Segmented
            label="Merchant"
            value={environment ?? 'sandbox'}
            options={[
              { value: 'sandbox', label: 'Sandbox' },
              { value: 'production', label: 'Production' },
            ]}
            onChange={(v) => {
              setEditing(null);
              setEnvironment(v as ProviderEnvironment);
            }}
          />
          <Segmented
            label="Currency"
            value={currencyFilter}
            options={[
              { value: 'ALL', label: 'All' },
              ...PROVIDER_CURRENCIES.map((c) => ({ value: c, label: c })),
            ]}
            onChange={(v) => setCurrencyFilter(v as CurrencyFilter)}
          />
          {environment && liveEnvironment && (
            <span className={cn('ml-auto', viewingLive ? 'text-rmc-green' : 'text-gray-500')}>
              {viewingLive
                ? 'These mappings are live.'
                : `Not live — the gateway is on ${liveEnvironment}. Edits here take effect when it switches.`}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="px-4 py-2.5 font-medium">Payment type</th>
                <th className="px-4 py-2.5 font-medium">Currency</th>
                <th className="px-4 py-2.5 font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Product code</th>
                <th className="px-4 py-2.5 font-medium">Payment account</th>
                <th className="px-4 py-2.5 font-medium w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleRows.map((row) => (
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
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
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

  /*
   * Built from the API base the app actually calls, not from the browser
   * origin. Rewriting the origin into an `api.` subdomain produced
   * `https://api.localhost:3001/...` in development — an invented host on the
   * *frontend* port — and an admin pasting that into the portal would have
   * silently configured a callback that can never be delivered.
   */
  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  const callbackUrl = apiBase
    ? `${apiBase}/webhooks/irembopay`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/webhooks/irembopay`;

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
        <Field label="RWF" value={status.paymentAccountIdentifier || '—'} />
        <Field label="USD" value={status.paymentAccountIdentifierUsd || '—'} />
        <Field label="EUR" value={status.paymentAccountIdentifierEur || '—'} />
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

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'px-2.5 py-1 rounded-md font-medium transition-colors',
              value === o.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
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
    <tr
      className={cn(
        'hover:bg-gray-50/50',
        row.unmapped && row.paymentTypeActive && 'bg-amber-50/40',
        !row.paymentTypeActive && 'opacity-60',
      )}
    >
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
          {row.unmapped && row.paymentTypeActive && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
              <AlertTriangle className="w-3 h-3" />
              unmapped
            </span>
          )}
          {!row.paymentTypeActive && !isRate && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
              inactive
            </span>
          )}
        </div>
      </td>

      <td className="px-4 py-2.5">
        <span className="text-xs font-semibold text-gray-600">{row.currency}</span>
      </td>

      <td className="px-4 py-2.5 text-gray-600">{fmtAmount(row.amount, row.currency)}</td>

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
            placeholder="PC-47fbbd81b8"
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
