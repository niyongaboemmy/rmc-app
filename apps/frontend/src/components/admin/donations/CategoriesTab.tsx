'use client';

import { useState } from 'react';
import {
  Plus, Pencil, Trash2, ChevronDown, Layers, GripVertical, RotateCcw,
} from 'lucide-react';
import {
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, ConfirmModal,
} from '@/components/ui/Modal';
import { ImageUploadField } from '@/components/ui/ImageUploadField';
import {
  donationCategoriesApi as api,
  type AdminCategory, type AdminSubFund, type CategoryPayload, type SubFundPayload,
} from '@/lib/donationCategoriesApi';
import { ICON_NAMES, resolveIcon } from '@/components/donate/categoryIcons';
import { cn } from '@/lib/utils';

const LANGS = [
  { key: 'en', label: 'EN' },
  { key: 'rw', label: 'RW' },
  { key: 'ar', label: 'AR' },
] as const;
type LangKey = (typeof LANGS)[number]['key'];

const inputCls =
  'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-rmc-green/40 focus:ring-2 focus:ring-rmc-green/30';
const labelCls = 'mb-1.5 block text-xs font-medium text-gray-500';

export function CategoriesTab({
  categories,
  canManage,
  onChanged,
}: {
  categories: AdminCategory[];
  canManage: boolean;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [catModal, setCatModal] = useState<{ open: boolean; category: AdminCategory | null }>({ open: false, category: null });
  const [subModal, setSubModal] = useState<{ open: boolean; categoryId: string; subfund: AdminSubFund | null } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'category' | 'subfund'; id: string; name: string } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const doDelete = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      if (confirm.kind === 'category') await api.admin.deleteCategory(confirm.id);
      else await api.admin.deleteSubFund(confirm.id);
      setConfirm(null);
      onChanged();
    } finally {
      setConfirmBusy(false);
    }
  };

  // "Recently deleted" disclosure — archived categories, lazily loaded on expand.
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleted, setDeleted] = useState<AdminCategory[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadDeleted = async () => {
    setLoadingDeleted(true);
    try {
      setDeleted(await api.admin.listDeleted());
    } catch (err) {
      console.error('Failed to load deleted categories', err);
    } finally {
      setLoadingDeleted(false);
    }
  };

  const toggleDeleted = () => {
    const next = !showDeleted;
    setShowDeleted(next);
    if (next) loadDeleted();
  };

  const restore = async (id: string) => {
    setRestoringId(id);
    try {
      await api.admin.restoreCategory(id);
      await loadDeleted();
      onChanged();
    } catch (err) {
      console.error('Failed to restore category', err);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Categories &amp; sub-funds shown on the public donate page.
        </p>
        {canManage && (
          <button
            onClick={() => setCatModal({ open: true, category: null })}
            className="inline-flex items-center gap-2 rounded-xl bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
          >
            <Plus className="h-4 w-4" /> New category
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-sm">
          <Layers className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">No categories yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const Icon = resolveIcon(cat.icon);
            const open = expanded === cat.id;
            return (
              <div key={cat.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => setExpanded(open ? null : cat.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180 text-rmc-green')} />
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1', cat.tone === 'gold' ? 'bg-rmc-gold/10 text-[#8A6A0F] ring-rmc-gold/20' : 'bg-rmc-green-light text-rmc-green ring-rmc-green/10')}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-gray-900">{cat.titleEn || cat.key}</span>
                      <span className="block text-xs text-gray-400">
                        <code className="font-mono">{cat.key}</code> · {cat.subfunds.length} sub-fund{cat.subfunds.length === 1 ? '' : 's'}
                      </span>
                    </span>
                  </button>
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', cat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {cat.status}
                  </span>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCatModal({ open: true, category: cat })} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rmc-green/5 hover:text-rmc-green" aria-label="Edit category">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setConfirm({ kind: 'category', id: cat.id, name: cat.titleEn || cat.key })} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600" aria-label="Delete category">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {open && (
                  <div className="border-t border-gray-50 bg-gray-50/40 p-4">
                    <div className="space-y-2">
                      {cat.subfunds.length === 0 && <p className="text-xs text-gray-400">No sub-funds yet.</p>}
                      {[...cat.subfunds].sort((a, b) => a.sortOrder - b.sortOrder).map((sf) => (
                        <div key={sf.id} className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-3 py-2.5">
                          <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-medium text-gray-900">{sf.labelEn || sf.key}</span>
                            <span className="block text-[11px] text-gray-400">
                              <code className="font-mono">{sf.key}</code>
                              {sf.campaignSlug ? ` · campaign: ${sf.campaignSlug}` : ''}
                            </span>
                          </span>
                          <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', sf.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                            {sf.status}
                          </span>
                          {canManage && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setSubModal({ open: true, categoryId: cat.id, subfund: sf })} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rmc-green/5 hover:text-rmc-green" aria-label="Edit sub-fund">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setConfirm({ kind: 'subfund', id: sf.id, name: sf.labelEn || sf.key })} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600" aria-label="Delete sub-fund">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {canManage && (
                      <button
                        onClick={() => setSubModal({ open: true, categoryId: cat.id, subfund: null })}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add sub-fund
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canManage && (
        <div className="pt-1">
          <button
            onClick={toggleDeleted}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-rmc-green"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', showDeleted && 'rotate-180 text-rmc-green')} />
            Recently deleted
            {deleted.length > 0 && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">{deleted.length}</span>}
          </button>

          {showDeleted && (
            <div className="mt-3 space-y-2">
              {loadingDeleted ? (
                <p className="text-xs text-gray-400">…</p>
              ) : deleted.length === 0 ? (
                <p className="text-xs text-gray-400">No deleted categories.</p>
              ) : (
                deleted.map((cat) => {
                  const Icon = resolveIcon(cat.icon);
                  return (
                    <div key={cat.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-400 ring-1 ring-gray-100">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-700">{cat.titleEn || cat.key}</span>
                        <span className="block text-[11px] text-gray-400">
                          <code className="font-mono">{cat.key}</code> · {cat.subfunds.length} sub-fund{cat.subfunds.length === 1 ? '' : 's'}
                        </span>
                      </span>
                      <button
                        onClick={() => restore(cat.id)}
                        disabled={restoringId === cat.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rmc-green/30 px-3 py-1.5 text-xs font-semibold text-rmc-green transition-colors hover:bg-rmc-green/5 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {restoringId === cat.id ? 'Restoring…' : 'Restore'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {catModal.open && (
        <CategoryModal
          category={catModal.category}
          defaultSortOrder={categories.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1}
          onClose={() => setCatModal({ open: false, category: null })}
          onSaved={() => { setCatModal({ open: false, category: null }); onChanged(); }}
        />
      )}
      {subModal?.open && (
        <SubFundModal
          categoryId={subModal.categoryId}
          subfund={subModal.subfund}
          onClose={() => setSubModal(null)}
          onSaved={() => { setSubModal(null); onChanged(); }}
        />
      )}
      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doDelete}
        title={confirm?.kind === 'category' ? 'Delete category' : 'Delete sub-fund'}
        message={confirm ? `Delete “${confirm.name}”?${confirm.kind === 'category' ? ' Its sub-funds will be removed too.' : ''} This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        isLoading={confirmBusy}
      />
    </div>
  );
}

/* ── Trilingual language tabs ── */
function LangTabs({ lang, setLang }: { lang: LangKey; setLang: (l: LangKey) => void }) {
  return (
    <div className="mb-3 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {LANGS.map((l) => (
        <button
          key={l.key}
          type="button"
          onClick={() => setLang(l.key)}
          className={cn('rounded-md px-3 py-1 text-xs font-bold transition-colors', lang === l.key ? 'bg-rmc-green text-white shadow-sm' : 'text-gray-500 hover:text-rmc-green')}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

type Tri = { en: string; rw: string; ar: string };
const emptyTri = (): Tri => ({ en: '', rw: '', ar: '' });

/* ── Category create/edit ── */
function CategoryModal({ category, defaultSortOrder = 0, onClose, onSaved }: {
  category: AdminCategory | null; defaultSortOrder?: number; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!category;
  const [lang, setLang] = useState<LangKey>('en');
  const [key, setKey] = useState(category?.key ?? '');
  const [icon, setIcon] = useState(category?.icon ?? 'HandHeart');
  const [tone, setTone] = useState(category?.tone ?? 'green');
  const [image, setImage] = useState(category?.image ?? '');
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? defaultSortOrder));
  const [status, setStatus] = useState(category?.status ?? 'active');
  const [title, setTitle] = useState<Tri>(category ? { en: category.titleEn, rw: category.titleRw, ar: category.titleAr } : emptyTri());
  const [desc, setDesc] = useState<Tri>(category ? { en: category.descEn, rw: category.descRw, ar: category.descAr } : emptyTri());
  const [long, setLong] = useState<Tri>(category ? { en: category.longEn, rw: category.longRw, ar: category.longAr } : emptyTri());
  const [impact, setImpact] = useState<Tri>(category ? { en: category.impactEn, rw: category.impactRw, ar: category.impactAr } : emptyTri());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setTriLang = (setter: React.Dispatch<React.SetStateAction<Tri>>) => (v: string) =>
    setter((p) => ({ ...p, [lang]: v }));

  const Icon = resolveIcon(icon);

  const save = async () => {
    if (!key.trim()) { setError('A stable key is required.'); return; }
    setSaving(true);
    setError('');
    const payload: CategoryPayload = {
      key: key.trim(), icon, tone, image: image.trim(),
      title, desc, long, impact,
      sortOrder: Number(sortOrder) || 0,
      status: status as 'active' | 'inactive',
    };
    try {
      if (isEdit && category) await api.admin.updateCategory(category.id, payload);
      else await api.admin.createCategory(payload);
      onSaved();
    } catch {
      setError('Could not save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="2xl">
      <ModalHeader><ModalTitle>{isEdit ? 'Edit category' : 'New category'}</ModalTitle></ModalHeader>
      <ModalBody className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Key *</label>
            <input value={key} onChange={(e) => setKey(e.target.value)} className={cn(inputCls, 'font-mono')} placeholder="charity" disabled={isEdit} />
          </div>
          <div>
            <label className={labelCls}>Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className={inputCls}>
              <option value="green">Green</option>
              <option value="gold">Gold</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Order</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Icon</label>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green-light text-rmc-green ring-1 ring-rmc-green/10">
              <Icon className="h-5 w-5" />
            </span>
            <select value={icon} onChange={(e) => setIcon(e.target.value)} className={inputCls}>
              {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <ImageUploadField label="Banner image" value={image} onChange={setImage} />

        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
          <LangTabs lang={lang} setLang={setLang} />
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Title ({lang.toUpperCase()})</label>
              <input value={title[lang]} onChange={(e) => setTriLang(setTitle)(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Short description ({lang.toUpperCase()})</label>
              <input value={desc[lang]} onChange={(e) => setTriLang(setDesc)(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Long description ({lang.toUpperCase()})</label>
              <textarea value={long[lang]} onChange={(e) => setTriLang(setLong)(e.target.value)} rows={2} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Impact line ({lang.toUpperCase()})</label>
              <input value={impact[lang]} onChange={(e) => setTriLang(setImpact)(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={save} disabled={saving} className="rounded-xl bg-rmc-green px-5 py-2 text-sm font-semibold text-white hover:bg-rmc-green-dark disabled:opacity-50">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
        </button>
      </ModalFooter>
    </Modal>
  );
}

/* ── Sub-fund create/edit ── */
function SubFundModal({ categoryId, subfund, onClose, onSaved }: {
  categoryId: string; subfund: AdminSubFund | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!subfund;
  const [lang, setLang] = useState<LangKey>('en');
  const [key, setKey] = useState(subfund?.key ?? '');
  const [image, setImage] = useState(subfund?.image ?? '');
  const [campaignSlug, setCampaignSlug] = useState(subfund?.campaignSlug ?? '');
  const [sortOrder, setSortOrder] = useState(String(subfund?.sortOrder ?? 0));
  const [status, setStatus] = useState(subfund?.status ?? 'active');
  const [label, setLabel] = useState<Tri>(subfund ? { en: subfund.labelEn, rw: subfund.labelRw, ar: subfund.labelAr } : emptyTri());
  const [long, setLong] = useState<Tri>(subfund ? { en: subfund.longEn, rw: subfund.longRw, ar: subfund.longAr } : emptyTri());
  const [impact, setImpact] = useState<Tri>(subfund ? { en: subfund.impactEn, rw: subfund.impactRw, ar: subfund.impactAr } : emptyTri());
  const [examples, setExamples] = useState<Tri>(subfund
    ? { en: (subfund.examplesEn ?? []).join('\n'), rw: (subfund.examplesRw ?? []).join('\n'), ar: (subfund.examplesAr ?? []).join('\n') }
    : emptyTri());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setTriLang = (setter: React.Dispatch<React.SetStateAction<Tri>>) => (v: string) =>
    setter((p) => ({ ...p, [lang]: v }));

  const save = async () => {
    if (!key.trim()) { setError('A stable key is required.'); return; }
    setSaving(true);
    setError('');
    const toList = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
    const payload: SubFundPayload = {
      key: key.trim(),
      image: image.trim(),
      campaignSlug: campaignSlug.trim() || null,
      label, long, impact,
      examples: { en: toList(examples.en), rw: toList(examples.rw), ar: toList(examples.ar) },
      sortOrder: Number(sortOrder) || 0,
      status: status as 'active' | 'inactive',
    };
    try {
      if (isEdit && subfund) await api.admin.updateSubFund(subfund.id, payload);
      else await api.admin.createSubFund(categoryId, payload);
      onSaved();
    } catch {
      setError('Could not save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="2xl">
      <ModalHeader><ModalTitle>{isEdit ? 'Edit sub-fund' : 'New sub-fund'}</ModalTitle></ModalHeader>
      <ModalBody className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Key *</label>
            <input value={key} onChange={(e) => setKey(e.target.value)} className={cn(inputCls, 'font-mono')} placeholder="foodbank" disabled={isEdit} />
          </div>
          <div>
            <label className={labelCls}>Order</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Campaign slug</label>
            <input value={campaignSlug} onChange={(e) => setCampaignSlug(e.target.value)} className={cn(inputCls, 'font-mono')} placeholder="(optional)" />
          </div>
        </div>

        <ImageUploadField label="Image" value={image} onChange={setImage} />

        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
          <LangTabs lang={lang} setLang={setLang} />
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Label ({lang.toUpperCase()})</label>
              <input value={label[lang]} onChange={(e) => setTriLang(setLabel)(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Long description ({lang.toUpperCase()})</label>
              <textarea value={long[lang]} onChange={(e) => setTriLang(setLong)(e.target.value)} rows={2} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Impact line ({lang.toUpperCase()})</label>
              <input value={impact[lang]} onChange={(e) => setTriLang(setImpact)(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Examples ({lang.toUpperCase()}) — one per line</label>
              <textarea value={examples[lang]} onChange={(e) => setTriLang(setExamples)(e.target.value)} rows={3} className={inputCls} placeholder={'Tuition\nExam fees\nStipends'} />
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={save} disabled={saving} className="rounded-xl bg-rmc-green px-5 py-2 text-sm font-semibold text-white hover:bg-rmc-green-dark disabled:opacity-50">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
