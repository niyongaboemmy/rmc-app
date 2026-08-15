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
          publicPath="/services/jobs"
          recordsLabel="Job Postings"
          recordsHref="/admin/job-postings"
          recordsNote="The openings listed on the board — descriptions, deadlines and status"
        />
      </ToastProvider>
    </ProtectedRoute>
  );
}
