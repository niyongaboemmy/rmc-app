'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, Loader2, Pencil, RotateCcw, Save, X } from 'lucide-react';
import { useEditMode } from '@/contexts/EditModeContext';
import { cn } from '@/lib/utils';

/**
 * The floating control for in-place editing. Bottom-anchored, fixed, and only
 * rendered for users who may edit — everyone else never sees it.
 *
 * The flow is deliberately resolve-before-exit: while there are unsaved changes
 * the only ways out are Save or Discard, so an admin can't wander off leaving a
 * half-edited draft live in their own session. With nothing pending, a single
 * "Done" leaves edit mode.
 */
export function EditToolbar() {
  const t = useTranslations('cms');
  const { locale } = useParams<{ locale: string }>();
  const { editing, setEditing, canEdit, canSave, saving, dirty, save, discard } = useEditMode();

  // A brief "Saved" acknowledgement after a successful persist.
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!justSaved) return;
    const id = setTimeout(() => setJustSaved(false), 2200);
    return () => clearTimeout(id);
  }, [justSaved]);

  if (!canEdit) return null;

  const langLabel = t(`lang.${locale}`);

  const onSave = async () => {
    await save();
    setJustSaved(true);
  };

  return (
    <div className="fixed top-16 z-[10000] flex ltr:right-4 rtl:left-4 print:hidden">
      {!editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-rmc-green bg-white px-3 py-1.5 text-sm font-semibold text-rmc-green shadow-lg shadow-rmc-green/10 transition-colors hover:bg-rmc-green-light"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          {t('editPage')}
        </button>
      ) : (
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl">
          {canSave && (
            <span className="ms-1.5 hidden items-center gap-1.5 text-xs font-medium text-gray-500 sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-rmc-green" aria-hidden />
              {t('editingIn', { lang: langLabel })}
            </span>
          )}

          {justSaved && !dirty && (
            <span className="inline-flex items-center gap-1 px-1.5 text-xs font-semibold text-rmc-green">
              <Check className="h-3.5 w-3.5" aria-hidden />
              {t('saved')}
            </span>
          )}

          {dirty && (
            <button
              type="button"
              onClick={discard}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t('discard')}</span>
            </button>
          )}

          {dirty ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rmc-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rmc-green-dark disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              {t('save')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                'bg-gray-900 text-white hover:bg-black',
              )}
            >
              <X className="h-4 w-4" aria-hidden />
              {t('done')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
