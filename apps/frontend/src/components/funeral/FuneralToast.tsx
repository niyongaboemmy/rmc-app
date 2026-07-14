'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';

/**
 * Transient success toast for the funeral admin surfaces. Rendered into <body>
 * so it's centred on the viewport (not trapped by an ancestor transform) and
 * sits above the modals. The parent owns the message + auto-dismiss timer.
 */
export function FuneralToast({ message }: { message: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || !message) return null;

  return createPortal(
    <div className="fixed bottom-6 left-1/2 z-[10000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-rmc-green-deep px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-fade-up">
      <CheckCircle2 className="h-4 w-4 text-rmc-gold-light" aria-hidden="true" /> {message}
    </div>,
    document.body,
  );
}
