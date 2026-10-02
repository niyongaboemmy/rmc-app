'use client';

import { Briefcase } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { ServiceBoardEditor } from '@/components/admin/content/ServiceBoardEditor';
import { ContentKeys, TENDER_SERVICE_DEFAULT } from '@/lib/content-api';

/**
 * Wording on the public tenders board. The tenders themselves are records, managed
 * under Content → Tenders — this edits the page around them.
 */
const DETAIL_FIELDS = [
  { path: ['detail', 'eyebrow'], label: 'Eyebrow', rows: 1 },
  { path: ['detail', 'heroTitle'], label: 'Hero heading', rows: 1 },
  { path: ['detail', 'descriptionTitle'], label: 'Description heading', rows: 1 },
  { path: ['detail', 'attachmentsTitle'], label: 'Attachments heading', rows: 1,
    hint: 'The file count is appended automatically — do not type it here.' },
  { path: ['detail', 'cta', 'title'], label: 'CTA — Heading', rows: 1 },
  { path: ['detail', 'cta', 'subtitle'], label: 'CTA — Supporting line', rows: 2 },
  { path: ['detail', 'cta', 'button'], label: 'CTA — Button', rows: 1 },
  { path: ['detail', 'notFound', 'heroTitle'], label: 'Not found — Hero heading', rows: 1 },
  { path: ['detail', 'notFound', 'title'], label: 'Not found — Heading', rows: 1 },
  { path: ['detail', 'notFound', 'body'], label: 'Not found — Message', rows: 2 },
  { path: ['detail', 'notFound', 'backLink'], label: 'Not found — Back link', rows: 1 },
  { path: ['detail', 'requirements', 'title'], label: 'Requirements — Heading', rows: 1 },
  { path: ['detail', 'requirements', 'subtitle'], label: 'Requirements — Note', rows: 2 },
];

export default function TenderServiceContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <ServiceBoardEditor
          sectionKey={ContentKeys.tenderService}
          defaults={TENDER_SERVICE_DEFAULT}
          title="Tenders Page"
          blurb="Hero, the heading above the board and the how-to-apply steps on /services/tender"
          icon={Briefcase}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          detailFields={DETAIL_FIELDS}
          publicPath="/services/tender"
          recordsLabel="Tenders"
          recordsHref="/admin/tenders/manage"
          recordsNote="The tenders listed on the board — deadlines, attachments and status"
        />
      </ToastProvider>
    </ProtectedRoute>
  );
}
