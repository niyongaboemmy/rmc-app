'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import {
  hajjApi, HAJJ_FEE_KEYS, HAJJ_CURRENCIES,
  type HajjCurrency, type HajjRequirementItem, type HajjRequirementPayload,
} from '@/lib/hajjApi';
import { pick } from '@/lib/content-api';
import { requirementIcon } from '@/components/hajj/requirementIcons';
import { ConfirmDialog } from '@/components/funeral/ConfirmDialog';
import {
  RequirementFormModal, isFeeKey, requirementErrMsg as errMsg,
} from '@/components/hajj/RequirementFormModal';
import {
  ArrowLeft, Compass, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, EyeOff, Lock,
} from 'lucide-react';

export default function HajjRequirementsAdminPage() {
  return (
    <ProtectedRoute permissions={[Permission.HAJJ_VIEW]}>
      <ToastProvider>
        <HajjRequirementsManager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function HajjRequirementsManager({ embedded = false }: { embedded?: boolean } = {}) {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.HAJJ_MANAGE);
  const { success, error } = useToast();

  const [items, setItems] = useState<HajjRequirementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ open: boolean; item?: HajjRequirementItem }>({ open: false });
  const [removing, setRemoving] = useState<HajjRequirementItem | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    hajjApi.admin.listRequirements()
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
      setItems(await hajjApi.admin.reorderRequirements(next.map((r) => r.id)));
    } catch {
      error('Could not reorder. Reloading.');
      load();
    }
  };

  const save = async (input: HajjRequirementPayload, id?: string) => {
    setBusy(true);
    try {
      if (id) await hajjApi.admin.updateRequirement(id, input);
      else await hajjApi.admin.createRequirement(input);
      setEditing({ open: false });
      success(id ? 'Requirement updated.' : 'Requirement added.');
      load();
    } catch (e) {
      error(errMsg(e, 'Could not save the requirement.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await hajjApi.admin.deleteRequirement(removing.id);
      success('Requirement removed.');
      setRemoving(null);
      load();
    } catch (e) {
      error(errMsg(e, 'Could not remove the requirement.'));
      setRemoving(null);
    }
  };

  const money = new Intl.NumberFormat(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {!embedded && (
          <div>
            <Link href={`/${locale}/admin/content`} className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-rmc-green">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Content
            </Link>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Compass className="h-5 w-5 text-rmc-green" strokeWidth={1.75} /> Hajj Requirements
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              The checklist on the public Hajj page. The registration fee and initial payment amounts
              set here are also the amounts the registration form asks applicants to pay.
            </p>
          </div>
        )}
        {canManage && (
          <button
            onClick={() => setEditing({ open: true })}
            className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark"
          >
            <Plus className="h-4 w-4" /> Add requirement
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16 text-gray-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <ol className="space-y-2">
          {items.map((r, i) => {
            const Icon = requirementIcon(r.icon);
            return (
              <li key={r.id} className={`flex items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-sm ring-1 ring-black/5 ${r.isActive ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-70'}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rmc-green/20 bg-rmc-green/10 text-rmc-green">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-gray-900">
                    {pick(r.title, locale) || r.key}
                    {r.amount != null && (
                      <span className="inline-flex items-center rounded-full bg-rmc-gold/20 px-2 py-0.5 text-[11px] font-bold text-rmc-green-deep">
                        {money.format(r.amount)} {r.currency}
                      </span>
                    )}
                    {!r.mandatory && (
                      <span className="inline-flex items-center rounded-full bg-rmc-green-light px-2 py-0.5 text-[10px] font-bold text-rmc-green">Recommended</span>
                    )}
                    {!r.isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500"><EyeOff className="h-3 w-3" /> Hidden</span>
                    )}
                  </p>
                  <p className="flex items-center gap-1 truncate font-mono text-[11px] text-gray-400">
                    {isFeeKey(r.key) && <Lock className="h-3 w-3" aria-label="Used by the registration form" />}
                    {r.key}
                  </p>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button onClick={() => setEditing({ open: true, item: r })} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-rmc-green"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setRemoving(r)} aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {editing.open && (
        <RequirementFormModal
          item={editing.item}
          busy={busy}
          onSave={save}
          onClose={() => setEditing({ open: false })}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Remove requirement"
          message={
            isFeeKey(removing.key)
              ? `"${pick(removing.title, locale) || removing.key}" is one of the two payments the registration form charges. Removing it will leave that fee unstated on the form — hide it instead if you only want it off the landing page. Remove anyway?`
              : `Remove "${pick(removing.title, locale) || removing.key}" from the Hajj page?`
          }
          confirmLabel="Remove"
          cancelLabel="Cancel"
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
