'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  hajjApi, HAJJ_CURRENCIES,
  type HajjCurrency, type HajjBankAccountItem, type HajjBankAccountPayload,
} from '@/lib/hajjApi';
import { FuneralModal } from '@/components/funeral/FuneralModal';
import { ConfirmDialog } from '@/components/funeral/ConfirmDialog';
import { Field } from '@/components/funeral/Field';
import {
  ArrowLeft, Building2, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Check, Loader2, EyeOff,
} from 'lucide-react';

/** Digits, spaces and dashes — mirrors the backend DTO. Letters are always a typo. */
const ACCOUNT_NUMBER = /^[0-9][0-9 -]*$/;

export default function HajjBankAccountsAdminPage() {
  return (
    <ProtectedRoute permissions={[Permission.HAJJ_VIEW]}>
      <ToastProvider>
        <Manager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function Manager() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.HAJJ_MANAGE);
  const { success, error } = useToast();

  const [items, setItems] = useState<HajjBankAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ open: boolean; item?: HajjBankAccountItem }>({ open: false });
  const [removing, setRemoving] = useState<HajjBankAccountItem | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    hajjApi.admin.listBankAccounts()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next); // optimistic
    try {
      setItems(await hajjApi.admin.reorderBankAccounts(next.map((a) => a.id)));
    } catch {
      error('Could not reorder. Reloading.');
      load();
    }
  };

  const save = async (input: HajjBankAccountPayload, id?: string) => {
    setBusy(true);
    try {
      if (id) await hajjApi.admin.updateBankAccount(id, input);
      else await hajjApi.admin.createBankAccount(input);
      setEditing({ open: false });
      success(id ? 'Bank account updated.' : 'Bank account added.');
      load();
    } catch (e) {
      error(errMsg(e, 'Could not save the bank account.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await hajjApi.admin.deleteBankAccount(removing.id);
      success('Bank account removed.');
      setRemoving(null);
      load();
    } catch (e) {
      error(errMsg(e, 'Could not remove the bank account.'));
      setRemoving(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/${locale}/admin/content`} className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-rmc-green">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Content
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Building2 className="h-5 w-5 text-rmc-green" strokeWidth={1.75} /> Hajj Bank Accounts
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            The accounts applicants pay the Hajj fees into, shown on the public Hajj page.
            Until you add one, the page shows no accounts at all — it never invents a number.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setEditing({ open: true })}
            className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark"
          >
            <Plus className="h-4 w-4" /> Add account
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16 text-gray-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-gray-300" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-semibold text-gray-700">No bank accounts yet</p>
          <p className="mt-1 text-[13px] text-gray-500">
            Applicants are asked to upload proof of payment, so they need somewhere to pay.
            Add the account(s) — one per currency you charge in.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {items.map((a, i) => (
            <li key={a.id} className={`flex items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-sm ring-1 ring-black/5 ${a.isActive ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-70'}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rmc-green/20 bg-rmc-green/10 text-rmc-green">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-gray-900">
                  {a.bankName}
                  <span className="inline-flex items-center rounded-full bg-rmc-gold/20 px-2 py-0.5 text-[11px] font-bold text-rmc-green-deep">
                    {a.currency}
                  </span>
                  {!a.isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500"><EyeOff className="h-3 w-3" /> Hidden</span>
                  )}
                </p>
                <p className="truncate text-[12px] text-gray-500">{a.accountName}</p>
                <p className="truncate font-mono text-[11px] tabular-nums text-gray-400">{a.accountNumber}</p>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button onClick={() => setEditing({ open: true, item: a })} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-rmc-green"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setRemoving(a)} aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {editing.open && (
        <BankAccountFormModal
          item={editing.item}
          busy={busy}
          onSave={save}
          onClose={() => setEditing({ open: false })}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Remove bank account"
          message={`Remove "${removing.bankName} — ${removing.accountNumber}" from the Hajj page? Hide it instead if you only want it off the page temporarily.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  );
}

function BankAccountFormModal({
  item, busy, onSave, onClose,
}: {
  item?: HajjBankAccountItem;
  busy: boolean;
  onSave: (input: HajjBankAccountPayload, id?: string) => void;
  onClose: () => void;
}) {
  const [bankName, setBankName] = useState(item?.bankName ?? '');
  const [accountName, setAccountName] = useState(item?.accountName ?? '');
  const [accountNumber, setAccountNumber] = useState(item?.accountNumber ?? '');
  const [currency, setCurrency] = useState<HajjCurrency>(item?.currency ?? 'RWF');
  const [swiftCode, setSwiftCode] = useState(item?.swiftCode ?? '');
  const [branch, setBranch] = useState(item?.branch ?? '');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [touched, setTouched] = useState(false);

  const numberValid = ACCOUNT_NUMBER.test(accountNumber.trim());
  const valid =
    bankName.trim().length > 0 &&
    accountName.trim().length > 0 &&
    numberValid;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    onSave(
      {
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        currency,
        // Blank means "no value", which must clear an existing one — hence null.
        swiftCode: swiftCode.trim() || null,
        branch: branch.trim() || null,
        isActive,
      },
      item?.id,
    );
  };

  return (
    <FuneralModal
      title={item ? 'Edit bank account' : 'Add bank account'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Bank"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          hint={touched && !bankName.trim() ? <span className="text-red-500">Bank name is required</span> : 'e.g. Bank of Kigali'}
        />

        <Field
          label="Account name"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          hint={touched && !accountName.trim() ? <span className="text-red-500">Account name is required</span> : 'The account holder — RMC, not the applicant.'}
        />

        {/* Account number + currency */}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <Field
              label="Account number"
              value={accountNumber}
              inputMode="numeric"
              onChange={(e) => setAccountNumber(e.target.value)}
              hint={
                touched && !numberValid
                  ? <span className="text-red-500">Digits, spaces or dashes only</span>
                  : 'Applicants copy this to send money. Check it twice.'
              }
            />
          </div>
          <label className="block w-28 shrink-0">
            <span className="mb-1.5 block text-[12px] font-semibold text-gray-600">Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as HajjCurrency)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
            >
              {HAJJ_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        <Field
          label="Branch (optional)"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          hint="Shown under the bank name."
        />

        <Field
          label="SWIFT / BIC (optional)"
          value={swiftCode}
          onChange={(e) => setSwiftCode(e.target.value)}
          hint="Needed to receive money from abroad. Leave blank for a local-only account."
        />

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-rmc-green" />
          Show on the public Hajj page
        </label>
      </div>
    </FuneralModal>
  );
}

function errMsg(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
  return msg?.error?.message ?? msg?.message ?? fallback;
}
