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
          publicPath="/services/tender"
          recordsLabel="Tenders"
          recordsHref="/admin/content/tenders"
          recordsNote="The tenders listed on the board — deadlines, attachments and status"
        />
      </ToastProvider>
    </ProtectedRoute>
  );
}
