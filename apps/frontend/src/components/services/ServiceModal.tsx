'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Search, ExternalLink, CheckCircle2, Plus, X } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { ACCENTS, type ServiceDef } from '@/lib/services/serviceCatalog';
import { EditableText } from '@/components/cms/EditableText';
import { useEditMode } from '@/contexts/EditModeContext';

/** A fresh, empty tri-lingual value for a newly-added requirement/step. */
const emptyTri = () => ({ en: '', rw: '', ar: '' });

/**
 * The concise per-service overview shown on the Services landing page: summary →
 * requirements → steps → notes → actions (+ a "full details" link). The words come
 * from the `services` content store (seeded from i18n), addressed by the same keys.
 *
 * In edit mode (`content:edit`) every field is editable in place, and the
 * requirement/step lists gain inline add (＋) and per-item remove (✕) controls —
 * the lists are stored as arrays, and their LENGTH now comes from the store, so a
 * catalog no longer fixes how many rows render. The row's card description (which
 * shows on the list, not here) is exposed as an edit-only field so it can be
 * edited too.
 */
export function ServiceModal({
  service,
  locale,
  onClose,
}: {
  service: ServiceDef;
  locale: string;
  onClose: () => void;
}) {
  const t = useTranslations('services');
  const { editing, canSave, getValue, setValue, removeAt } = useEditMode();
  const accent = ACCENTS[service.accent];
  const { modal, actions = [] } = service;
  if (!modal) return null;

  // May this user restructure the lists (add/remove items)? Same gate as editing copy.
  const managing = editing && canSave;

  const reqPath = `${service.key}.modal.req`;
  const stepPath = `${service.key}.modal.step`;
  const reqLen = ((getValue(reqPath) as unknown[]) ?? []).length;
  const stepLen = ((getValue(stepPath) as unknown[]) ?? []).length;

  const add = (path: string) => {
    const arr = (getValue(path) as unknown[]) ?? [];
    setValue(path, [...arr, emptyTri()]);
  };

  return (
    <Modal open onClose={onClose} size="xl" className="rounded-lg">
      {/* Header — icon chip + title + one-line summary */}
      <div className="flex items-start gap-3 border-b border-gray-100 px-6 pb-4 pt-6">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text}`}>
          <service.Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 pe-8">
          <EditableText
            as="h2"
            path={`${service.key}.title`}
            className="block text-lg font-bold leading-tight text-gray-900"
          />
          <EditableText
            as="p"
            path={`${service.key}.modal.summary`}
            multiline
            className="mt-1 block text-sm leading-relaxed text-gray-500"
          />
          {/* The list-row description — shown here ONLY in edit mode, since it
              appears on the /services list, not in the modal for normal readers. */}
          {managing && (
            <div className="mt-2">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                {t('explore.cardDescription')}
              </span>
              <EditableText
                as="p"
                path={`${service.key}.desc`}
                multiline
                className="block text-sm leading-relaxed text-gray-500"
              />
            </div>
          )}
        </div>
      </div>

      <ModalBody>
        <div className="space-y-6">
          {/* Requirements */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              {t('explore.requirements')}
            </h3>
            <ul className="space-y-2">
              {Array.from({ length: reqLen }, (_, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${accent.text}`} aria-hidden />
                  <EditableText as="span" multiline path={`${reqPath}.${i}`} className="block flex-1" />
                  {managing && (
                    <button
                      type="button"
                      onClick={() => removeAt(`${reqPath}.${i}`)}
                      aria-label={t('explore.removeItem')}
                      title={t('explore.removeItem')}
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {managing && (
              <button
                type="button"
                onClick={() => add(reqPath)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-rmc-green/50 hover:text-rmc-green"
              >
                <Plus className="h-3.5 w-3.5" /> {t('explore.addRequirement')}
              </button>
            )}
          </section>

          {/* Steps */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              {t('explore.steps')}
            </h3>
            <ol className="space-y-2">
              {Array.from({ length: stepLen }, (_, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${accent.soft} ${accent.text}`}>
                    {i + 1}
                  </span>
                  <EditableText as="span" multiline path={`${stepPath}.${i}`} className="block flex-1 pt-px" />
                  {managing && (
                    <button
                      type="button"
                      onClick={() => removeAt(`${stepPath}.${i}`)}
                      aria-label={t('explore.removeItem')}
                      title={t('explore.removeItem')}
                      className="grid h-5 w-5 shrink-0 place-items-center rounded text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ol>
            {managing && (
              <button
                type="button"
                onClick={() => add(stepPath)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-rmc-green/50 hover:text-rmc-green"
              >
                <Plus className="h-3.5 w-3.5" /> {t('explore.addStep')}
              </button>
            )}
          </section>

          {/* Notes */}
          {modal.notes && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                {t('explore.notes')}
              </h3>
              <EditableText
                as="p"
                path={`${service.key}.modal.notes`}
                multiline
                className="block rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm leading-relaxed text-gray-600"
              />
            </section>
          )}

          {/* Full details link */}
          <Link
            href={`/${locale}${service.detailHref}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            {t('explore.viewDetails')}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </ModalBody>

      {/* Actions — apply (primary) + status (secondary) */}
      {actions.length > 0 && (
        <ModalFooter>
          {actions.map((a) =>
            a.kind === 'apply' ? (
              <Link
                key={a.href}
                href={`/${locale}${a.href}`}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-colors ${accent.btn}`}
              >
                {t(a.labelKey)}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Link>
            ) : (
              <Link
                key={a.href}
                href={`/${locale}${a.href}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                {a.kind === 'status' && <Search className="h-4 w-4" aria-hidden />}
                {t(a.labelKey)}
              </Link>
            ),
          )}
        </ModalFooter>
      )}
    </Modal>
  );
}
