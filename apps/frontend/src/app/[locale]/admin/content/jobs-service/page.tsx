'use client';

import { Briefcase } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { ServiceBoardEditor } from '@/components/admin/content/ServiceBoardEditor';
import { ContentKeys, JOBS_SERVICE_DEFAULT } from '@/lib/content-api';

/**
 * Wording on the public jobs board. The postings themselves are records, managed
 * under Job Postings — this edits the page around them.
 */
const DETAIL_FIELDS = [
  { path: ['detail', 'eyebrow'], label: 'Eyebrow', rows: 1 },
  { path: ['detail', 'overviewTitle'], label: 'Overview heading', rows: 1 },
  { path: ['detail', 'aboutTitle'], label: 'About heading', rows: 1 },
  { path: ['detail', 'requirementsTitle'], label: 'Requirements heading', rows: 1 },
  { path: ['detail', 'responsibilitiesTitle'], label: 'Responsibilities heading', rows: 1 },
  { path: ['detail', 'cta', 'title'], label: 'CTA — Heading', rows: 1 },
  { path: ['detail', 'cta', 'subtitle'], label: 'CTA — Supporting line', rows: 2 },
  { path: ['detail', 'notFound'], label: 'Not found — Message', rows: 2 },
  { path: ['detail', 'closed', 'title'], label: 'Closed — Heading', rows: 1 },
  { path: ['detail', 'closed', 'body'], label: 'Closed — Message', rows: 2 },
];

export default function JobsServiceContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <ServiceBoardEditor
          sectionKey={ContentKeys.jobsService}
          defaults={JOBS_SERVICE_DEFAULT}
          title="Jobs Page"
          blurb="Hero, the heading above the board and the how-to-apply steps on /services/jobs"
          icon={Briefcase}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          detailFields={DETAIL_FIELDS}
          publicPath="/services/jobs"
          recordsLabel="Job Postings"
          recordsHref="/admin/jobs/manage"
          recordsNote="The openings listed on the board — descriptions, deadlines and status"
        />
      </ToastProvider>
    </ProtectedRoute>
  );
}
