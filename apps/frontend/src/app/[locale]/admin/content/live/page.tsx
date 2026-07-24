'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/permissions';
import { ToastProvider } from '@/components/ui/Toast';
import { AboutLiveEditor } from '@/components/admin/live-editor/AboutLiveEditor';

/**
 * Live Editor — currently scoped to the About page only.
 *
 * A Canva-style, in-context editor: the About page renders in its real layout
 * and every piece of text is click-to-edit in place. Save publishes immediately.
 */
export default function LiveContentEditorPage() {
  return (
    <ProtectedRoute permissions={[Permission.CONTENT_VIEW]}>
      <ToastProvider>
        <AboutLiveEditor />
      </ToastProvider>
    </ProtectedRoute>
  );
}
