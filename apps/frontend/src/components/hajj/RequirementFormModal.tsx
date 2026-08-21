'use client';

/**
 * The requirement editor — one form, two places.
 *
 * Hajj requirements carry an amount, a currency, a mandatory flag, an icon and a
 * stable key: fields that want a form, not click-to-type. So both the admin
 * screen (Content → Hajj Requirements) and in-place Edit Mode on the public Hajj
 * page open THIS modal rather than each growing its own copy to drift apart.
 *
 * Extracted verbatim from the admin page, which now imports it.
 */

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import {
  HAJJ_FEE_KEYS, HAJJ_CURRENCIES,
  type HajjCurrency, type HajjRequirementItem, type HajjRequirementPayload,
} from '@/lib/hajjApi';
import { REQUIREMENT_ICON_NAMES, requirementIcon } from '@/components/hajj/requirementIcons';
import { FuneralModal } from '@/components/funeral/FuneralModal';
import { Field } from '@/components/funeral/Field';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

type Lang = 'en' | 'rw' | 'ar';
const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { key: 'en', label: 'English', dir: 'ltr' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr' },
  { key: 'ar', label: 'Arabic', dir: 'rtl' },
];

/** The registration form charges these two by key — losing them would unstate the fees. */
const FEE_KEYS: string[] = [HAJJ_FEE_KEYS.registration, HAJJ_FEE_KEYS.advance];
export const isFeeKey = (key: string) => FEE_KEYS.includes(key);

/** Pull a human message out of an axios error, else the fallback. */
export function requirementErrMsg(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
  return msg?.error?.message ?? msg?.message ?? fallback;
}

export function RequirementFormModal({
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
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-rmc-green px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark disabled:opacity-60">
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
            <button key={l.key} type="button" onClick={() => setLang(l.key)} className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${lang === l.key ? 'bg-rmc-green text-white shadow-sm' : 'text-gray-500 hover:text-rmc-green'}`}>{l.label}</button>
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
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-rmc-green" />
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-transparent focus:ring-2 focus:ring-rmc-green disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
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
