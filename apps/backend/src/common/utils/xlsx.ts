import * as XLSX from 'xlsx';
import type { Response } from 'express';

/** A single exported row: column header → cell value. */
export type XlsxRow = Record<string, string | number>;

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Send a report as a dated .xlsx download, e.g. "donations-2026-07-12.xlsx".
 *
 * Routes using this must take `@Res()`, which also bypasses the global response
 * envelope interceptor — otherwise the bytes would be wrapped in JSON.
 */
export function sendXlsx(res: Response, buffer: Buffer, baseName: string): void {
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', XLSX_MIME);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Content-Disposition', `attachment; filename="${baseName}-${stamp}.xlsx"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(buffer);
}

/**
 * Build a one-sheet .xlsx report.
 *
 * `columns` is passed separately rather than inferred from the rows: an empty
 * result set would otherwise produce a headerless, blank file that gives no hint
 * of what was exported (and json_to_sheet([]) drops the header row entirely).
 */
export function toXlsxBuffer(
  sheetName: string,
  columns: string[],
  rows: XlsxRow[],
): Buffer {
  const sheet = rows.length
    ? XLSX.utils.json_to_sheet(rows, { header: columns })
    : XLSX.utils.aoa_to_sheet([columns]);

  sheet['!cols'] = columns.map((header) => ({ wch: Math.max(header.length + 2, 16) }));

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** YYYY-MM-DD HH:mm — sorts correctly as text in Excel, unlike a locale string. */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const iso = new Date(date).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/** YYYY-MM-DD, for date-only columns (dates of birth/death, burial dates). */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
}
