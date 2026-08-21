import type { UploadRules } from '../integrations/storage/public-upload.service';

/**
 * Where bid attachments are stored, and what is allowed in.
 *
 * Shared by the two upload routes — the signed-in bidder's (TendersController)
 * and the OTP tracking session's (TendersPublicController) — so a file cannot
 * enter through one door under looser rules than the other.
 *
 * ⚠ `tender-applications` must stay listed in the file server's
 * PROTECTED_KEY_PREFIXES. A bid carries a company's registration, its RRA tax
 * clearance and its priced proposal; if the prefix falls off that list every one
 * of them becomes downloadable by raw URL, and a competitor who learns a key
 * reads a rival's pricing. The file server asserts the list at boot.
 */
export const BID_DOCUMENT_FOLDER = 'tender-applications';

export const BID_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/** A bid attachment is a PDF or a scan of one — narrower than the platform default. */
export const BID_DOCUMENT_RULES: UploadRules = {
  maxBytes: BID_DOCUMENT_MAX_BYTES,
  mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  typeErrorMessage: 'The document must be a PDF or an image (JPG, PNG).',
};
