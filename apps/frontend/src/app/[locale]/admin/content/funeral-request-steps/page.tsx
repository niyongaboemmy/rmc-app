'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { funeralApi, type StepInput } from '@/lib/funeralApi';
import { pickStep } from '@/components/funeral/stepLabels';
import { STEP_ICON_NAMES, stepIcon } from '@/components/funeral/stepIcons';
import { FuneralModal } from '@/components/funeral/FuneralModal';
import { ConfirmDialog } from '@/components/funeral/ConfirmDialog';
import { Field } from '@/components/funeral/Field';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { FuneralStepConfig } from '@/components/funeral/types';
import {
  ArrowLeft, Moon, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Check, Loader2, EyeOff,
} from 'lucide-react';

const COLORS = ['#64748b', '#6366f1', '#0ea5e9', '#06b6d4', '#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#0d3d24', '#16a34a'];
type Lang = 'en' | 'rw' | 'ar';
const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { key: 'en', label: 'English', dir: 'ltr' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr' },
  { key: 'ar', label: 'Arabic', dir: 'rtl' },
];

export default function FuneralStepsAdminPage() {
  return (
    <ProtectedRoute permissions={[Permission.FUNERAL_VIEW]}>
      <ToastProvider>
        <Manager />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function Manager() {
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.FUNERAL_MANAGE);
  const { success, error } = useToast();

  const [steps, setSteps] = useState<FuneralStepConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ open: boolean; step?: FuneralStepConfig }>({ open: false });
  const [removing, setRemoving] = useState<FuneralStepConfig | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    funeralApi.adminListSteps()
      .then(setSteps)
      .catch(() => setSteps([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next); // optimistic
    try {
      setSteps(await funeralApi.reorderSteps(next.map((s) => s.id)));
    } catch {
      error('Could not reorder. Reloading.');
      load();
    }
  };

  const save = async (input: StepInput, id?: string) => {
    setBusy(true);
    try {
      if (id) await funeralApi.updateStep(id, input);
      else await funeralApi.createStep(input);
      setEditing({ open: false });
      success(id ? 'Step updated.' : 'Step added.');
      load();
    } catch (e) {
      error(errMsg(e, 'Could not save the step.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await funeralApi.deleteStep(removing.id);
      success('Step removed.');
      setRemoving(null);
      load();
    } catch (e) {
      error(errMsg(e, 'Could not remove the step.'));
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
            <Moon className="h-5 w-5 text-rmc-green" strokeWidth={1.75} /> Funeral Request Steps
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            The ordered active steps define the request lifecycle shown on the public status timeline.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setEditing({ open: true })}
            className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark"
          >
            <Plus className="h-4 w-4" /> Add step
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16 text-gray-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <ol className="space-y-2">
          {steps.map((s, i) => {
            const Icon = stepIcon(s.icon);
            return (
              <li key={s.id} className={`flex items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-sm ring-1 ring-black/5 ${s.isActive ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-70'}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: s.color ?? '#6b7280' }}>
                  {Icon ? <Icon className="h-4 w-4" /> : <span className="text-[12px] font-bold">{i + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-[14px] font-semibold text-gray-900">
                    {pickStep(s.title, locale) || s.key}
                    {!s.isActive && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500"><EyeOff className="h-3 w-3" /> Inactive</span>}
                  </p>
                  <p className="truncate font-mono text-[11px] text-gray-400">{s.key}</p>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Move down" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button onClick={() => setEditing({ open: true, step: s })} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-rmc-green"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setRemoving(s)} aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {editing.open && (
        <StepFormModal
          step={editing.step}
          langs={LANGS}
          busy={busy}
          onSave={save}
          onClose={() => setEditing({ open: false })}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Remove step"
          message={`Remove "${pickStep(removing.title, locale) || removing.key}"? Requests currently on this step will block deletion — deactivate it instead if needed.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  );
}

function StepFormModal({
  step, langs, busy, onSave, onClose,
}: {
  step?: FuneralStepConfig;
  langs: { key: Lang; label: string; dir: 'ltr' | 'rtl' }[];
  busy: boolean;
  onSave: (input: StepInput, id?: string) => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<Lang>('en');
  const [key, setKey] = useState(step?.key ?? '');
  const [title, setTitle] = useState<Record<Lang, string>>({ en: step?.title.en ?? '', rw: step?.title.rw ?? '', ar: step?.title.ar ?? '' });
  const [desc, setDesc] = useState<Record<Lang, string>>({ en: step?.description.en ?? '', rw: step?.description.rw ?? '', ar: step?.description.ar ?? '' });
  const [color, setColor] = useState(step?.color ?? COLORS[0]);
  const [icon, setIcon] = useState(step?.icon ?? '');
  const [isActive, setIsActive] = useState(step?.isActive ?? true);
  const [touched, setTouched] = useState(false);

  const dir = langs.find((l) => l.key === lang)?.dir ?? 'ltr';
  const keyValid = step ? true : /^[a-z0-9][a-z0-9_-]*$/.test(key);
  const valid = keyValid && title.en.trim().length > 0;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const input: StepInput = {
      titleEn: title.en, titleRw: title.rw, titleAr: title.ar,
      descriptionEn: desc.en, descriptionRw: desc.rw, descriptionAr: desc.ar,
      color, icon: icon || undefined, isActive,
    };
    if (!step) input.key = key;
    onSave(input, step?.id);
  };

  const IconPreview = stepIcon(icon);

  return (
    <FuneralModal
      title={step ? 'Edit step' : 'Add step'}
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
          disabled={!!step}
          hint={step ? 'The key is fixed once created.' : (touched && !keyValid ? <span className="text-red-500">Lowercase slug: a-z, 0-9, _ or -</span> : 'e.g. embalming, viewing')}
        />

        {/* Language tabs */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {langs.map((l) => (
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

        {/* Colour */}
        <div>
          <span className="mb-1.5 block text-[12px] font-semibold text-gray-600">Accent colour</span>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c}
                className={`h-7 w-7 rounded-full ring-2 ring-offset-2 transition ${color === c ? 'ring-gray-900' : 'ring-transparent'}`} style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-gray-200 bg-white" aria-label="Custom colour" />
          </div>
        </div>

        {/* Icon */}
        <div>
          <span className="mb-1.5 block text-[12px] font-semibold text-gray-600">Icon</span>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: color }}>
              {IconPreview ? <IconPreview className="h-4 w-4" /> : <span className="text-[11px] font-bold">1</span>}
            </span>
            <SearchableSelect
              value={icon}
              onChange={setIcon}
              options={[
                { value: '', label: 'No icon (number)' },
                ...STEP_ICON_NAMES.map((n) => ({ value: n, label: n })),
              ]}
              searchPlaceholder="Search icons…"
              className="flex-1"
              triggerClassName="rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* Active */}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-rmc-green" />
          Active (shown in the lifecycle)
        </label>
      </div>
    </FuneralModal>
  );
}

function errMsg(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
  return msg?.error?.message ?? msg?.message ?? fallback;
}
