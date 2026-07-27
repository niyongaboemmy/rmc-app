'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import {
  REQUIRED_DOCUMENTS,
  TENDER_MORE_INFO_FIELDS,
  type TenderDocumentType,
  type TenderMoreInfoField,
} from '@/lib/tenderApplicationApi';

export const DOC_LABELS: Record<TenderDocumentType, string> = {
  rdb_certificate: 'Company Registration (RDB)',
  tax_clearance: 'RRA Tax Clearance',
  proposal: 'Technical & Financial Proposal',
};

/** Admin-facing names for the field groups the bidder can be asked to correct. */
export const FIELD_LABELS: Record<TenderMoreInfoField, string> = {
  company: 'Company name & TIN',
  contact: 'Contact person',
  phone: 'Phone number',
  email: 'Email address',
  address: 'Address (district, sector, cell, village)',
  bid_amount: 'Bid amount',
  cover_note: 'Cover note',
};

export interface MoreInfoPayload {
  notes: string;
  moreInfoFields: TenderMoreInfoField[];
  moreInfoDocumentTypes: TenderDocumentType[];
}

/**
 * Names exactly what the bidder must fix. Whatever is ticked here is what their
 * bid page will let them change — everything else stays locked, so an ask for a
 * corrected TIN can't become an opportunity to revise the price.
 *
 * This form IS the confirmation for the action: it takes a written note and at
 * least one deliberate tick, which no stray click (or stray drop on the board)
 * produces. Shared by the bid detail page and the Kanban board.
 */
export function RequestMoreInfoModal({
  open,
  sending,
  subtitle,
  onClose,
  onSend,
}: {
  open: boolean;
  sending: boolean;
  /** Optional line naming the bid — the board needs it, the detail page doesn't. */
  subtitle?: string;
  onClose: () => void;
  onSend: (payload: MoreInfoPayload) => void;
}) {
  const [note, setNote] = useState('');
  const [fields, setFields] = useState<TenderMoreInfoField[]>([]);
  const [docs, setDocs] = useState<TenderDocumentType[]>([]);

  // Reset on each open so a cancelled request doesn't seed the next one.
  useEffect(() => {
    if (open) {
      setNote('');
      setFields([]);
      setDocs([]);
    }
  }, [open]);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  // The backend refuses an empty scope — an ask the bidder cannot act on would
  // park the bid in more_info_requested with no way out.
  const canSend = note.trim().length > 0 && fields.length + docs.length > 0;

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>Request more information</ModalTitle>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </ModalHeader>
      <ModalBody>
        <div className="space-y-5">
          <Textarea
            label="What does the bidder need to do?"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            hint="Sent to the bidder by SMS and email, and shown on their bid page."
          />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Details they may correct
            </p>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {TENDER_MORE_INFO_FIELDS.map((field) => (
                <Checkbox
                  key={field}
                  id={`mi-field-${field}`}
                  label={FIELD_LABELS[field]}
                  checked={fields.includes(field)}
                  onChange={() => setFields((prev) => toggle(prev, field))}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Documents they may replace
            </p>
            <div className="mt-2.5 space-y-2">
              {REQUIRED_DOCUMENTS.map((docType) => (
                <Checkbox
                  key={docType}
                  id={`mi-doc-${docType}`}
                  label={DOC_LABELS[docType]}
                  checked={docs.includes(docType)}
                  onChange={() => setDocs((prev) => toggle(prev, docType))}
                />
              ))}
            </div>
          </div>

          {!canSend && (
            <p className="text-xs text-gray-400">
              Write a note and tick at least one thing the bidder should fix.
            </p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button
          isLoading={sending}
          disabled={!canSend}
          onClick={() =>
            onSend({ notes: note.trim(), moreInfoFields: fields, moreInfoDocumentTypes: docs })
          }
        >
          Send request
        </Button>
      </ModalFooter>
    </Modal>
  );
}
