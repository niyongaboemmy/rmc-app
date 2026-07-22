'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SERVICES, ACCENTS, type ServiceDef } from '@/lib/services/serviceCatalog';
import { ServiceModal } from './ServiceModal';
import { useAuth } from '@/hooks/useAuth';
import { Permission } from '@/lib/permissions';
import { EditModeProvider, useEditMode } from '@/contexts/EditModeContext';
import { EditToolbar } from '@/components/cms/EditToolbar';
import { ContentKeys, SERVICES_DEFAULT } from '@/lib/content-api';

/**
 * The Services landing list — minimalist, scannable rows. A service with a
 * `modal` opens the concise ServiceModal (a real <button>, dialog semantics);
 * one without links to its full detail page. Content is server-rendered on first
 * paint (this is a client component but Next still SSRs it), so it stays
 * indexable while the modal interaction lives on the client.
 *
 * For a `content:edit` admin the page doubles as its own CMS: `EditModeProvider`
 * wraps the list so the per-service copy — row title/description, and the modal's
 * summary / requirements / steps / notes — becomes editable in place (persisted to
 * the `services` content section). Rows display from the store; the editing itself
 * happens inside each service's modal. Everyone else sees exactly the page they
 * always did.
 */
export function ServicesExplorer({ locale }: { locale: string }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(Permission.CONTENT_EDIT);

  return (
    <EditModeProvider
      sectionKey={ContentKeys.services}
      defaults={SERVICES_DEFAULT}
      canEdit={canEdit}
      canSave={canEdit}
    >
      <ExplorerList locale={locale} />
      <EditToolbar />
    </EditModeProvider>
  );
}

function ExplorerList({ locale }: { locale: string }) {
  const { getText } = useEditMode();
  const [open, setOpen] = useState<ServiceDef | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SERVICES.map((service) => {
          const accent = ACCENTS[service.accent];
          const title = getText(`${service.key}.title`, locale);
          const desc = getText(`${service.key}.desc`, locale);

          const inner = (
            <>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text}`}>
                <service.Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug text-gray-900">{title}</span>
                <span className="mt-0.5 block truncate text-sm text-gray-500">{desc}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gray-500 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
            </>
          );

          const cls = `group flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4 text-start transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${accent.hoverBorder}`;

          // Modal service → a real button (dialog semantics). Otherwise → a link
          // to the full detail page (current behaviour, until it gets a modal).
          return service.modal ? (
            <button
              key={service.key}
              type="button"
              onClick={() => setOpen(service)}
              aria-haspopup="dialog"
              className={cls}
            >
              {inner}
            </button>
          ) : (
            <Link key={service.key} href={`/${locale}${service.detailHref}`} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>

      {open && <ServiceModal service={open} locale={locale} onClose={() => setOpen(null)} />}
    </>
  );
}
