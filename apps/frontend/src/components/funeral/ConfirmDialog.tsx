'use client';

import { AlertTriangle } from 'lucide-react';
import { FuneralModal } from './FuneralModal';

/** Small destructive-action confirmation built on FuneralModal. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <FuneralModal
      title={title}
      onClose={onCancel}
      closeLabel={cancelLabel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="pt-1.5 text-sm text-gray-600">{message}</p>
      </div>
    </FuneralModal>
  );
}
