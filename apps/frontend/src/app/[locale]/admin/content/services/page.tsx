'use client';

import { LayoutGrid } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { TriSectionEditor } from '@/components/admin/content/TriSectionEditor';
import type { TriFieldDef, TriFieldGroup } from '@/components/admin/content/TriFields';
import { ContentKeys, SERVICES_DEFAULT, type ServicesContent } from '@/lib/content-api';

/**
 * The words on the services landing — one card per service, plus the detail modal
 * some of them open.
 *
 * Keyed by service id, the same ids `lib/services/serviceCatalog` uses for the icon
 * and colours. This owns only the copy: which services exist, and how they look, is
 * the catalogue's business.
 *
 * The page HEADER is not here — it is `services-hero`, edited under Page Headers.
 *
 * Requirement and step lists are text-editable but fixed-length, for the index-merge
 * reason the content modules document: a removed entry would inherit the seeded one
 * sitting at its index and come back.
 */

/** Title-case a service id for the card heading, e.g. "good-conduct" → "Good conduct". */
function labelFor(id: string): string {
  const spaced = id.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function buildGroups(form: ServicesContent): TriFieldGroup[] {
  return Object.keys(form).map((id) => {
    const service = form[id];
    const fields: TriFieldDef[] = [
      { path: [id, 'title'], label: 'Name', rows: 1 },
      { path: [id, 'desc'], label: 'Card description', rows: 2 },
    ];

    if (service.modal) {
      fields.push({
        path: [id, 'modal', 'summary'],
        label: 'Modal — Summary',
        rows: 3,
      });
      service.modal.req.forEach((_, i) =>
        fields.push({
          path: [id, 'modal', 'req', i],
          label: `Modal — Requirement ${i + 1}`,
          rows: 1,
        }),
      );
      service.modal.step.forEach((_, i) =>
        fields.push({
          path: [id, 'modal', 'step', i],
          label: `Modal — Step ${i + 1}`,
          rows: 1,
        }),
      );
      if (service.modal.notes) {
        fields.push({
          path: [id, 'modal', 'notes'],
          label: 'Modal — Notes',
          rows: 2,
          hint: 'Shown under the steps, for anything that does not fit the list.',
        });
      }
    }

    return {
      title: labelFor(id),
      note: service.modal
        ? 'Card copy, plus the detail modal this service opens.'
        : 'Card copy. This service links straight to its own page rather than opening a modal.',
      fields,
    };
  });
}

export default function ServicesContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <TriSectionEditor<ServicesContent>
          sectionKey={ContentKeys.services}
          defaults={SERVICES_DEFAULT}
          groups={buildGroups}
          title="Services Page"
          blurb="The name, description and detail modal for each service on /services"
          icon={LayoutGrid}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
          publicPath="/services"
        />
      </ToastProvider>
    </ProtectedRoute>
  );
}
