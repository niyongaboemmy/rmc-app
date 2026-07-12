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
import { REQUIREMENT_ICON_NAMES, requirementIcon } from '@/components/hajj/requirementIcons';
import { FuneralModal } from '@/components/funeral/FuneralModal';
import { ConfirmDialog } from '@/components/funeral/ConfirmDialog';
import { Field } from '@/components/funeral/Field';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  ArrowLeft, Compass, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Check, Loader2, EyeOff, Lock,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';
const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { key: 'en', label: 'English', dir: 'ltr' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr' },
  { key: 'ar', label: 'Arabic', dir: 'rtl' },
];

/** The registration form charges these two by key — losing them would unstate the fees. */
const FEE_KEYS: string[] = [HAJJ_FEE_KEYS.registration, HAJJ_FEE_KEYS.advance];
const isFeeKey = (key: string) => FEE_KEYS.includes(key);

export default function HajjRequirementsAdminPage() {
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
        {canManage && (
          <button
            onClick={() => setEditing({ open: true })}
            className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark"
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

function RequirementFormModal({
  item, busy, onSave, onClose,
}: {
  item?: HajjRequirementItem;
  busy: boolean;
  onSave: (input: HajjRequirementPayload, id?: string) => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<Lang>('en');
  const [key, setKey] = useState(item?.key ?? '');
  const [title, setTitle] = useState<Record<Lang, string>>({ en: item?.title.en ?? '', rw: item?.title.rw ?? '', ar: item?.title.ar ?? '' });
  const [desc, setDesc] = useState<Record<Lang, string>>({ en: item?.description.en ?? '', rw: item?.description.rw ?? '', ar: item?.description.ar ?? '' });
  const [amount, setAmount] = useState(item?.amount != null ? String(item.amount) : '');
  const [currency, setCurrency] = useState<HajjCurrency>(item?.currency ?? 'RWF');
  const [mandatory, setMandatory] = useState(item?.mandatory ?? true);
  const [icon, setIcon] = useState(item?.icon ?? '');
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [touched, setTouched] = useState(false);

  const dir = LANGS.find((l) => l.key === lang)?.dir ?? 'ltr';
  const keyValid = item ? true : /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(key);
  const amountValid = amount.trim() === '' || /^\d+$/.test(amount.trim());
  const valid = keyValid && amountValid && title.en.trim().length > 0;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const input: HajjRequirementPayload = {
      titleEn: title.en, titleRw: title.rw, titleAr: title.ar,
      descriptionEn: desc.en, descriptionRw: desc.rw, descriptionAr: desc.ar,
      // Blank means "no amount", which must clear an existing one — hence null, not undefined.
      amount: amount.trim() === '' ? null : Number(amount.trim()),
      currency,
      mandatory,
      icon: icon || undefined,
      isActive,
    };
    if (!item) input.key = key;
    onSave(input, item?.id);
  };

  const IconPreview = requirementIcon(icon);

  return (
    <FuneralModal
      title={item ? 'Edit requirement' : 'Add requirement'}
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
      <div className="space-y-4">
        {/* Key */}
        <Field
          label="Key (identifier)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={!!item}
          hint={
            item
              ? (isFeeKey(item.key)
                ? 'Fixed. The registration form reads this requirement’s amount by this key.'
                : 'The key is fixed once created.')
              : (touched && !keyValid
                ? <span className="text-red-500">Slug: letters, digits, _ or -</span>
                : 'e.g. vaccination, visaPhoto')
          }
        />

        {/* Language tabs */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {LANGS.map((l) => (
            <button key={l.key} type="button" onClick={() => setLang(l.key)} className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${lang === l.key ? 'bg-rmc-green text-white shadow-sm' : 'text-gray-500 hover:text-rmc-green'}`}>{l.label}</button>
          ))}
        </div>

        <Field
          label="Title"
          dir={dir}
          value={title[lang]}
          onChange={(e) => setTitle((p) => ({ ...p, [lang]: e.target.value }))}
          hint={touched && !title.en.trim() ? <span className="text-red-500">English title is required</span> : undefined}
        />
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-gray-600">Description</span>
          <textarea dir={dir} rows={2} value={desc[lang]} onChange={(e) => setDesc((p) => ({ ...p, [lang]: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30" />
        </label>

        {/* Amount + currency */}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <Field
              label="Amount"
              value={amount}
              inputMode="numeric"
              onChange={(e) => setAmount(e.target.value)}
              hint={
                touched && !amountValid
                  ? <span className="text-red-500">Digits only, or leave blank</span>
                  : (item && isFeeKey(item.key)
                    ? 'This is what the registration form asks the applicant to pay.'
                    : 'Leave blank for a requirement that costs nothing.')
              }
            />
          </div>
          <label className="block w-28 shrink-0">
            <span className="mb-1.5 block text-[12px] font-semibold text-gray-600">Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as HajjCurrency)}
              disabled={amount.trim() === ''}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            >
              {HAJJ_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Icon */}
        <div>
          <span className="mb-1.5 block text-[12px] font-semibold text-gray-600">Icon</span>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rmc-green/20 bg-rmc-green/10 text-rmc-green">
              <IconPreview className="h-4 w-4" />
            </span>
            <SearchableSelect
              value={icon}
              onChange={setIcon}
              options={[
                { value: '', label: 'No icon' },
                ...REQUIREMENT_ICON_NAMES.map((n) => ({ value: n, label: n })),
              ]}
              searchPlaceholder="Search icons…"
              className="flex-1"
              triggerClassName="rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* Flags */}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-rmc-green" />
          Required (unticked shows as “Recommended”)
        </label>
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
