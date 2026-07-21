'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as LucideIcons from 'lucide-react';
import { Tags, Plus, Pencil, Trash2, RefreshCw, Search, type LucideIcon } from 'lucide-react';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { localized } from '@/components/dawah/localize';
import {
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, ConfirmModal,
} from '@/components/ui/Modal';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/Badge';
import { dawahApi, type DawahCategory, type CategoryPayload } from '@/lib/dawahApi';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-rmc-green';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';

/** Render a lucide icon by its name string (the value stored on a category). */
function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && (LucideIcons as unknown as Record<string, LucideIcon>)[name]) || LucideIcons.Tag;
  return <Icon className={className} />;
}

export default function AdminDawahCategoriesPage() {
  return (
    <ProtectedRoute permissions={[Permission.DAWAH_VIEW]}>
      <ToastProvider>
        <CategoriesAdmin />
      </ToastProvider>
    </ProtectedRoute>
  );
}

function CategoriesAdmin() {
  const t = useTranslations('admin.dawah');
  const { locale } = useParams<{ locale: string }>();
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const canManage = hasPermission(Permission.DAWAH_MANAGE);

  const [categories, setCategories] = useState<DawahCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<{ open: boolean; category: DawahCategory | null }>({ open: false, category: null });
  const [deleting, setDeleting] = useState<DawahCategory | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await dawahApi.admin.categories.list());
    } catch {
      setCategories([]);
      error(t('categories.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, error]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => categories.filter((c) =>
      !q || c.slug.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) || c.nameRw.toLowerCase().includes(q) || c.nameAr.toLowerCase().includes(q),
    ),
    [categories, q],
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await dawahApi.admin.categories.remove(deleting.id);
      success(t('categories.deleted'));
      setDeleting(null);
      fetchCategories();
    } catch {
      error(t('categories.deleteError'));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green/10">
            <Tags className="h-5 w-5 text-rmc-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight text-gray-900">{t('categories.title')}</h1>
            <p className="text-sm text-gray-500">{t('categories.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
          >
            <RefreshCw className="h-4 w-4" /> {t('categories.refresh')}
          </button>
          {canManage && (
            <button
              onClick={() => setModal({ open: true, category: null })}
              className="inline-flex items-center gap-2 rounded-lg bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark"
            >
              <Plus className="h-4 w-4" /> {t('categories.new')}
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t('readOnly')}
        </p>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('categories.title')}
          className="w-full rounded-lg border border-gray-300 py-2.5 ps-9 pe-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-rmc-green"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-rmc-green" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <Tags className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-500">{t('categories.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-start">
                  <th className="px-4 py-3.5 font-medium text-gray-600">{t('categories.col.icon')}</th>
                  <th className="px-4 py-3.5 font-medium text-gray-600">{t('categories.col.name')}</th>
                  <th className="hidden px-4 py-3.5 font-medium text-gray-600 sm:table-cell">{t('categories.col.slug')}</th>
                  <th className="hidden px-4 py-3.5 font-medium text-gray-600 md:table-cell">{t('categories.col.order')}</th>
                  <th className="px-4 py-3.5 font-medium text-gray-600">{t('categories.col.status')}</th>
                  {canManage && <th className="px-4 py-3.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-rmc-green/[0.03]">
                    <td className="px-4 py-3.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rmc-green/10 text-rmc-green">
                        <CategoryIcon name={c.icon} className="h-4 w-4" />
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900">{localized(c, 'name', locale)}</p>
                      {c.icon && <p className="text-xs text-gray-400">{c.icon}</p>}
                    </td>
                    <td className="hidden px-4 py-3.5 font-mono text-xs text-gray-500 sm:table-cell">{c.slug}</td>
                    <td className="hidden px-4 py-3.5 text-gray-600 md:table-cell">{c.sortOrder}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.isActive ? t('categories.active') : t('categories.inactive')} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModal({ open: true, category: c })}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rmc-green/5 hover:text-rmc-green"
                            aria-label={t('actions.edit')}
                            title={t('actions.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(c)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label={t('actions.delete')}
                            title={t('actions.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && canManage && (
        <CategoryModal
          category={modal.category}
          onClose={() => setModal({ open: false, category: null })}
          onSaved={() => { setModal({ open: false, category: null }); fetchCategories(); }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => (deleteBusy ? undefined : setDeleting(null))}
        onConfirm={confirmDelete}
        title={t('actions.delete')}
        message={t('categories.confirmDelete')}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        isLoading={deleteBusy}
      />
    </div>
  );
}

function CategoryModal({ category, onClose, onSaved }: {
  category: DawahCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('admin.dawah');
  const { success, error } = useToast();
  const isEdit = !!category;

  const [slug, setSlug] = useState(category?.slug ?? '');
  const [nameEn, setNameEn] = useState(category?.nameEn ?? '');
  const [nameRw, setNameRw] = useState(category?.nameRw ?? '');
  const [nameAr, setNameAr] = useState(category?.nameAr ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '');
  const [sortOrder, setSortOrder] = useState(category?.sortOrder != null ? String(category.sortOrder) : '');
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [nameErr, setNameErr] = useState('');

  const save = async () => {
    if (!nameEn.trim()) { setNameErr(t('categories.nameRequired')); return; }
    setSaving(true);
    try {
      if (isEdit && category) {
        // slug is immutable — a public filter link; the API ignores it, so omit.
        await dawahApi.admin.categories.update(category.id, {
          nameEn: nameEn.trim(),
          nameRw: nameRw.trim(),
          nameAr: nameAr.trim(),
          icon: icon.trim() || null,
          sortOrder: sortOrder.trim() ? Number(sortOrder) : undefined,
          isActive,
        });
      } else {
        const payload: CategoryPayload = {
          slug: slug.trim() || undefined,
          nameEn: nameEn.trim(),
          nameRw: nameRw.trim(),
          nameAr: nameAr.trim(),
          icon: icon.trim() || null,
          sortOrder: sortOrder.trim() ? Number(sortOrder) : undefined,
          isActive,
        };
        await dawahApi.admin.categories.create(payload);
      }
      success(isEdit ? t('categories.updated') : t('categories.created'));
      onSaved();
    } catch {
      error(t('categories.saveError'));
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>{isEdit ? t('categories.edit') : t('categories.new')}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{t('categories.fields.slug')}</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isEdit}
              placeholder="quran-studies"
              className={cn(inputClass, isEdit && 'cursor-not-allowed bg-gray-50 text-gray-400', 'font-mono')}
            />
            {isEdit && <p className="mt-1 text-[11px] text-gray-400">{t('categories.slugLocked')}</p>}
          </div>

          <div>
            <label className={labelClass}>
              {t('categories.fields.nameEn')} <span className="text-red-500">*</span>
            </label>
            <input value={nameEn} onChange={(e) => { setNameEn(e.target.value); setNameErr(''); }} className={inputClass} />
            {nameErr && <p className="mt-1 text-xs text-red-600">{nameErr}</p>}
          </div>
          <div>
            <label className={labelClass}>{t('categories.fields.nameRw')}</label>
            <input value={nameRw} onChange={(e) => setNameRw(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('categories.fields.nameAr')}</label>
            <input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('categories.fields.icon')}</label>
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green/10 text-rmc-green">
                  <CategoryIcon name={icon.trim() || null} className="h-4 w-4" />
                </span>
                <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="BookOpen" className={inputClass} />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">{t('categories.iconHint')}</p>
            </div>
            <div>
              <label className={labelClass}>{t('categories.fields.sortOrder')}</label>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputClass} />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-rmc-green"
            />
            <span className="text-sm text-gray-700">{t('categories.fields.active')}</span>
          </label>
        </div>
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
          {t('actions.cancel')}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-rmc-green px-5 py-2 text-sm font-semibold text-white hover:bg-rmc-green-dark disabled:opacity-50"
        >
          {saving ? t('categories.saving') : isEdit ? t('actions.save') : t('actions.create')}
        </button>
      </ModalFooter>
    </Modal>
  );
}
