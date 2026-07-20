'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Search, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { ACCENTS, type ServiceDef } from '@/lib/services/serviceCatalog';

/**
 * The concise per-service overview shown on the Services landing page. Renders
 * generically from the catalog: summary → requirements → steps → notes → actions
 * (+ a "full details" link). All content is i18n under `services.{key}.modal.*`,
 * with shared labels under `services.explore.*`.
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
  const accent = ACCENTS[service.accent];
  const { modal, actions = [] } = service;
  if (!modal) return null;

  const reqs = Array.from({ length: modal.requirements }, (_, i) =>
    t(`${service.key}.modal.req.${i + 1}`),
  );
  const steps = Array.from({ length: modal.steps }, (_, i) =>
    t(`${service.key}.modal.step.${i + 1}`),
  );

  return (
    <Modal open onClose={onClose} size="lg" className="rounded-lg">
      {/* Header — icon chip + title + one-line summary */}
      <div className="flex items-start gap-3 border-b border-gray-100 px-6 pb-4 pt-6">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text}`}>
          <service.Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 pe-8">
          <h2 className="text-lg font-bold leading-tight text-gray-900">{t(`${service.key}.title`)}</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">{t(`${service.key}.modal.summary`)}</p>
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
              {reqs.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${accent.text}`} aria-hidden />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Steps */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              {t('explore.steps')}
            </h3>
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${accent.soft} ${accent.text}`}>
                    {i + 1}
                  </span>
                  <span className="pt-px">{s}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Notes */}
          {modal.notes && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                {t('explore.notes')}
              </h3>
              <p className="rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm leading-relaxed text-gray-600">
                {t(`${service.key}.modal.notes`)}
              </p>
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
