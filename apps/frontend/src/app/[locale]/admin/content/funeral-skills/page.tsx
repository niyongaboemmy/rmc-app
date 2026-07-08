'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { funeralApi, type SkillInput } from '@/lib/funeralApi';
import { pickStep } from '@/components/funeral/stepLabels';
import { FuneralModal } from '@/components/funeral/FuneralModal';
import { ConfirmDialog } from '@/components/funeral/ConfirmDialog';
import { Field } from '@/components/funeral/Field';
import type { FuneralSkillConfig } from '@/components/funeral/types';
import {
  ArrowLeft, HandHelping, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Check, Loader2, EyeOff,
} from 'lucide-react';

type Lang = 'en' | 'rw' | 'ar';
const LANGS: { key: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { key: 'en', label: 'English', dir: 'ltr' },
  { key: 'rw', label: 'Kinyarwanda', dir: 'ltr' },
  { key: 'ar', label: 'Arabic', dir: 'rtl' },
];

export default function FuneralSkillsAdminPage() {
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

  const [skills, setSkills] = useState<FuneralSkillConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ open: boolean; skill?: FuneralSkillConfig }>({ open: false });
  const [removing, setRemoving] = useState<FuneralSkillConfig | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    funeralApi.adminListSkills().then(setSkills).catch(() => setSkills([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= skills.length) return;
    const next = [...skills];
    [next[index], next[target]] = [next[target], next[index]];
    setSkills(next);
    try { setSkills(await funeralApi.reorderSkills(next.map((s) => s.id))); }
    catch { error('Could not reorder. Reloading.'); load(); }
  };

  const save = async (input: SkillInput, id?: string) => {
    setBusy(true);
    try {
      if (id) await funeralApi.updateSkill(id, input);
      else await funeralApi.createSkill(input);
      setEditing({ open: false });
      success(id ? 'Skill updated.' : 'Skill added.');
      load();
    } catch (e) {
      error(errMsg(e, 'Could not save the skill.'));
    } finally { setBusy(false); }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await funeralApi.deleteSkill(removing.id);
      success('Skill removed.');
      setRemoving(null);
      load();
    } catch (e) {
      error(errMsg(e, 'Could not remove the skill.'));
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
            <HandHelping className="h-5 w-5 text-rmc-green" strokeWidth={1.75} /> Attendant Skills
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Skills an attendant can have and be assigned to. Used by the volunteer forms, assignment, and cards.
          </p>
        </div>
        {canManage && (
          <button onClick={() => setEditing({ open: true })} className="inline-flex items-center gap-2 rounded-full bg-rmc-green px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark">
            <Plus className="h-4 w-4" /> Add skill
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16 text-gray-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <ol className="space-y-2">
          {skills.map((s, i) => (
            <li key={s.id} className={`flex items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-sm ring-1 ring-black/5 ${s.isActive ? 'border-gray-100' : 'border-dashed border-gray-200 opacity-70'}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rmc-green/10 text-[12px] font-bold text-rmc-green">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-[14px] font-semibold text-gray-900">
                  {pickStep(s.label, locale) || s.key}
                  {!s.isActive && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500"><EyeOff className="h-3 w-3" /> Inactive</span>}
                </p>
                <p className="truncate font-mono text-[11px] text-gray-400">{s.key}</p>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === skills.length - 1} aria-label="Move down" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button onClick={() => setEditing({ open: true, skill: s })} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-rmc-green"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setRemoving(s)} aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {editing.open && (
        <SkillFormModal skill={editing.skill} langs={LANGS} busy={busy} onSave={save} onClose={() => setEditing({ open: false })} />
      )}
      {removing && (
        <ConfirmDialog
          title="Remove skill"
          message={`Remove "${pickStep(removing.label, locale) || removing.key}"? Volunteers who have this skill will block deletion — deactivate it instead if needed.`}
          confirmLabel="Remove"
          cancelLabel="Cancel"
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  );
}

function SkillFormModal({
  skill, langs, busy, onSave, onClose,
}: {
  skill?: FuneralSkillConfig;
  langs: { key: Lang; label: string; dir: 'ltr' | 'rtl' }[];
  busy: boolean;
  onSave: (input: SkillInput, id?: string) => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<Lang>('en');
  const [key, setKey] = useState(skill?.key ?? '');
  const [label, setLabel] = useState<Record<Lang, string>>({ en: skill?.label.en ?? '', rw: skill?.label.rw ?? '', ar: skill?.label.ar ?? '' });
  const [isActive, setIsActive] = useState(skill?.isActive ?? true);
  const [touched, setTouched] = useState(false);

  const dir = langs.find((l) => l.key === lang)?.dir ?? 'ltr';
  const keyValid = skill ? true : /^[a-z0-9][a-z0-9_-]*$/.test(key);
  const valid = keyValid && label.en.trim().length > 0;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const input: SkillInput = { labelEn: label.en, labelRw: label.rw, labelAr: label.ar, isActive };
    if (!skill) input.key = key;
    onSave(input, skill?.id);
  };

  return (
    <FuneralModal
      title={skill ? 'Edit skill' : 'Add skill'}
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
        <Field
          label="Key (identifier)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={!!skill}
          hint={skill ? 'The key is fixed once created.' : (touched && !keyValid ? <span className="text-red-500">Lowercase slug: a-z, 0-9, _ or -</span> : 'e.g. embalming, recitation')}
        />
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {langs.map((l) => (
            <button key={l.key} type="button" onClick={() => setLang(l.key)} className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${lang === l.key ? 'bg-rmc-green text-white shadow-sm' : 'text-gray-500 hover:text-rmc-green'}`}>{l.label}</button>
          ))}
        </div>
        <Field
          label="Label"
          dir={dir}
          value={label[lang]}
          onChange={(e) => setLabel((p) => ({ ...p, [lang]: e.target.value }))}
          hint={touched && !label.en.trim() ? <span className="text-red-500">English label is required</span> : undefined}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-rmc-green" />
          Active (selectable on attendants)
        </label>
      </div>
    </FuneralModal>
  );
}

function errMsg(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data;
  return msg?.error?.message ?? msg?.message ?? fallback;
}
