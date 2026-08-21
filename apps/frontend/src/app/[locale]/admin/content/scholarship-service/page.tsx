'use client';

import { GraduationCap } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { ServiceBoardEditor } from '@/components/admin/content/ServiceBoardEditor';
import { ContentKeys, SCHOLARSHIP_SERVICE_DEFAULT } from '@/lib/content-api';

/**
 * Wording on the public scholarships board — including the FAQ and closing CTA that
 * the other two boards do not have. The programmes themselves are records, managed
 * under Scholarship → Programs.
 */
const DETAIL_FIELDS = [
  { path: ['detail', 'aboutTitle'], label: 'About heading', rows: 1 },
  { path: ['detail', 'eligibilityTitle'], label: 'Eligibility heading', rows: 1 },
  { path: ['detail', 'benefitsTitle'], label: 'Benefits heading', rows: 1 },
  { path: ['detail', 'documentsTitle'], label: 'Documents heading', rows: 1 },
  { path: ['detail', 'attachmentsTitle'], label: 'Attachments heading', rows: 1 },
  { path: ['detail', 'need', 'title'], label: 'What you will need — Heading', rows: 1 },
  { path: ['detail', 'need', 'subtitle'], label: 'What you will need — Note', rows: 2 },
  { path: ['detail', 'cta', 'title'], label: 'CTA — Heading', rows: 1 },
  { path: ['detail', 'cta', 'body'], label: 'CTA — Message', rows: 2 },
  { path: ['detail', 'notFound', 'title'], label: 'Not found — Heading', rows: 1 },
  { path: ['detail', 'notFound', 'body'], label: 'Not found — Message', rows: 2 },
  { path: ['detail', 'closedNotice'], label: 'Closed notice', rows: 2 },
  { path: ['detail', 'notOpenYet'], label: 'Not open yet notice', rows: 2 },
];

export default function ScholarshipServiceContentPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <ServiceBoardEditor
          sectionKey={ContentKeys.scholarshipService}
          defaults={SCHOLARSHIP_SERVICE_DEFAULT}
          title="Scholarships Page"
          blurb="Hero, board heading, how-to-apply steps, FAQ and closing CTA on /services/scholarship"
          icon={GraduationCap}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          detailFields={DETAIL_FIELDS}
          publicPath="/services/scholarship"
          recordsLabel="Scholarship Programs"
          recordsHref="/admin/scholarship/programs"
          recordsNote="The programmes listed on the board — eligibility, deadlines and awards"
        />
      </ToastProvider>
    </ProtectedRoute>
  );
}
