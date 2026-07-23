'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Search, ExternalLink, CheckCircle2, Plus, X } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { ACCENTS, type ServiceDef } from '@/lib/services/serviceCatalog';
import { InlineText } from '@/components/edit-mode/InlineText';
import { useEditableContent } from '@/lib/edit-mode/useEditableContent';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { ContentKeys, SERVICES_DEFAULT, pick, type ServicesContent, type Locale } from '@/lib/content-api';

/** A fresh, empty tri-lingual value for a newly-added requirement/step. */
const emptyTri = () => ({ en: '', rw: '', ar: '' });

/**
 * The concise per-service overview shown on the Services landing page: summary →
 * requirements → steps → notes → actions (+ a "full details" link). The words come
 * from the `services` content section (seeded from i18n), keyed by service.
 *
 * In the site-wide Edit Mode (`content:edit`) every field is editable in place via
 * InlineText, and the requirement/step lists gain inline add (＋) / remove (✕) —
 * their length comes from the stored arrays, so the catalog no longer fixes how
 * many rows render. `setField` mutates the shared preview-store draft; `bumpSeed`
 * re-seeds the index-keyed InlineText nodes after a structural change so shifted
 * items don't show stale text. The row's card description (shown on the list, not
 * here) is exposed as an edit-only field.
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
  const lang = locale as Locale;
  const { content, editing, setField } = useEditableContent<ServicesContent>(ContentKeys.services, SERVICES_DEFAULT);
  const { bumpSeed } = useEditMode();
  const accent = ACCENTS[service.accent];
  const { modal, actions = [] } = service;
  if (!modal) return null;

  const managing = editing;
  const copy = content[service.key];
  const req = copy?.modal?.req ?? [];
  const step = copy?.modal?.step ?? [];

  const addItem = (kind: 'req' | 'step') => {
    setField((d) => { d[service.key].modal![kind].push(emptyTri()); });
  };
  const removeItem = (kind: 'req' | 'step', i: number) => {
    setField((d) => { d[service.key].modal![kind].splice(i, 1); });
    bumpSeed();
  };

  return (
    <Modal open onClose={onClose} size="xl" className="rounded-lg">
      {/* Header — icon chip + title + one-line summary */}
      <div className="flex items-start gap-3 border-b border-gray-100 px-6 pb-4 pt-6">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text}`}>
          <service.Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 pe-8">
          <InlineText
            as="h2"
            lang={locale}
            value={pick(copy?.title, locale)}
            onCommit={(v) => setField((d) => { d[service.key].title[lang] = v; })}
            className="block text-lg font-bold leading-tight text-gray-900"
          />
          <InlineText
            as="p"
            lang={locale}
            value={pick(copy?.modal?.summary, locale)}
            onCommit={(v) => setField((d) => { d[service.key].modal!.summary[lang] = v; })}
            className="mt-1 block text-sm leading-relaxed text-gray-500"
          />
          {/* The list-row description — shown here ONLY in edit mode, since it
              appears on the /services list, not in the modal for normal readers. */}
          {managing && (
            <div className="mt-2">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                {t('explore.cardDescription')}
              </span>
              <InlineText
                as="p"
                lang={locale}
                value={pick(copy?.desc, locale)}
                onCommit={(v) => setField((d) => { d[service.key].desc[lang] = v; })}
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
              {req.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${accent.text}`} aria-hidden />
                  <InlineText
                    as="span"
                    lang={locale}
                    value={pick(item, locale)}
                    onCommit={(v) => setField((d) => { d[service.key].modal!.req[i][lang] = v; })}
                    className="block flex-1"
                  />
                  {managing && (
                    <button
                      type="button"
                      onClick={() => removeItem('req', i)}
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
                onClick={() => addItem('req')}
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
              {step.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${accent.soft} ${accent.text}`}>
                    {i + 1}
                  </span>
                  <InlineText
                    as="span"
                    lang={locale}
                    value={pick(item, locale)}
                    onCommit={(v) => setField((d) => { d[service.key].modal!.step[i][lang] = v; })}
                    className="block flex-1 pt-px"
                  />
                  {managing && (
                    <button
                      type="button"
                      onClick={() => removeItem('step', i)}
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
                onClick={() => addItem('step')}
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
              <InlineText
                as="p"
                lang={locale}
                value={pick(copy?.modal?.notes, locale)}
                onCommit={(v) => setField((d) => { (d[service.key].modal!.notes ??= emptyTri())[lang] = v; })}
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
