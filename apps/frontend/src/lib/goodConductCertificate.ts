import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';
import type { GoodConductCertificateData } from './goodConductApi';

// ────────────────────────────────────────────────────────────────────────────
// Good Conduct Certificate generator — fully drawn client-side with pdf-lib.
//
// There is no branded RMC artwork for this certificate yet (design team has
// not delivered one), so rather than overlay text on a placeholder template
// forever marked "PLACEHOLDER TEMPLATE — AWAITING FINAL RMC ARTWORK", the
// whole page — border, bilingual header, title, attestation body, labeled
// fields and QR footer — is composed programmatically here. This produces a
// real, presentable certificate today; if/when final artwork arrives, only
// the constants below (colors, margins) need to change to match it.
// ────────────────────────────────────────────────────────────────────────────

const PAGE_W = 595.28; // A4 portrait, points
const PAGE_H = 841.89;

const MARGIN = 48;
const INK = rgb(0.11, 0.12, 0.14);
const MUTED = rgb(0.42, 0.45, 0.5);
const ACCENT = rgb(0.02, 0.36, 0.24); // RMC deep green
const GOLD = rgb(0.72, 0.56, 0.15);
const RULE = rgb(0.82, 0.84, 0.82);

/** Raster-style top-origin y (pt) → PDF bottom-origin y (pt). */
const Y = (yFromTop: number) => PAGE_H - yFromTop;

/** Strip characters the standard WinAnsi fonts cannot encode. */
function sanitize(text: string): string {
  return (text || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

function drawCentered(
  page: PDFPage,
  text: string,
  font: PDFFont,
  yFromTop: number,
  size: number,
  color = INK,
) {
  const value = sanitize(text);
  const width = font.widthOfTextAtSize(value, size);
  page.drawText(value, { x: (PAGE_W - width) / 2, y: Y(yFromTop), size, font, color });
}

const MOTIF_LABELS: Record<string, string> = {
  employment: 'Employment',
  visa: 'Visa Application',
  school: 'School Admission',
  other: 'Other',
};

function formatMotif(motif: string, motifDetail?: string | null): string {
  const label = MOTIF_LABELS[motif] ?? motif;
  return motif === 'other' && motifDetail ? `${label} - ${motifDetail}` : label;
}

interface FieldRow {
  label: string;
  value: string;
}

/** Draw a "Label ..................... Value" row with a dotted leader. */
function drawFieldRow(
  page: PDFPage,
  { label, value }: FieldRow,
  labelFont: PDFFont,
  valueFont: PDFFont,
  yFromTop: number,
) {
  const cleanValue = sanitize(value) || '-';
  const labelSize = 10.5;
  const valueSize = 11.5;
  const y = Y(yFromTop);

  page.drawText(label.toUpperCase(), { x: MARGIN, y, size: labelSize, font: labelFont, color: MUTED });

  const labelWidth = labelFont.widthOfTextAtSize(label.toUpperCase(), labelSize);
  const valueX = MARGIN + labelWidth + 14;
  const lineEnd = PAGE_W - MARGIN;

  let fontSize = valueSize;
  const maxValueWidth = lineEnd - valueX;
  while (fontSize > 7 && valueFont.widthOfTextAtSize(cleanValue, fontSize) > maxValueWidth) fontSize -= 0.5;

  page.drawText(cleanValue, { x: valueX, y, size: fontSize, font: valueFont, color: INK });
  page.drawLine({
    start: { x: MARGIN, y: y - 6 },
    end: { x: lineEnd, y: y - 6 },
    thickness: 0.5,
    color: RULE,
  });
}

/** Builds the Good Conduct certificate PDF bytes for the given data payload. */
export async function buildGoodConductCertificate(data: GoodConductCertificateData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // Decorative outer border (double rule, matches other RMC certificates).
  page.drawRectangle({
    x: 20, y: 20, width: PAGE_W - 40, height: PAGE_H - 40,
    borderColor: ACCENT, borderWidth: 2,
  });
  page.drawRectangle({
    x: 26, y: 26, width: PAGE_W - 52, height: PAGE_H - 52,
    borderColor: GOLD, borderWidth: 0.75,
  });

  // ── Header ────────────────────────────────────────────────────────────────
  drawCentered(page, 'RWANDA MUSLIM COMMUNITY', bold, 88, 15, ACCENT);
  drawCentered(page, "Umuryango w'Abayisilamu mu Rwanda", italic, 106, 10, MUTED);

  page.drawLine({ start: { x: MARGIN + 40, y: Y(122) }, end: { x: PAGE_W - MARGIN - 40, y: Y(122) }, thickness: 1, color: GOLD });

  drawCentered(page, 'GOOD CONDUCT CERTIFICATE', bold, 156, 22, INK);
  drawCentered(page, "Icyemezo cy'Imyitwarire Myiza", italic, 178, 12, MUTED);

  // ── Attestation paragraph ────────────────────────────────────────────────
  const paragraph =
    'This certificate attests that the person named below is known to this community and has, ' +
    "to the community's knowledge, maintained good conduct and standing among its members.";
  const paraFont = regular;
  const paraSize = 10.5;
  const paraMaxWidth = PAGE_W - MARGIN * 2 - 20;
  const words = paragraph.split(' ');
  let line = '';
  let paraY = 216;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (paraFont.widthOfTextAtSize(test, paraSize) > paraMaxWidth) {
      drawCentered(page, line, paraFont, paraY, paraSize, MUTED);
      line = word;
      paraY += 16;
    } else {
      line = test;
    }
  }
  if (line) drawCentered(page, line, paraFont, paraY, paraSize, MUTED);

  // ── Labeled fields ────────────────────────────────────────────────────────
  const fields: FieldRow[] = [
    { label: 'Full Name', value: data.fullNames },
    { label: "Father's Name", value: data.fatherName ?? '' },
    { label: "Mother's Name", value: data.motherName ?? '' },
    { label: 'Residence', value: data.residence },
    { label: 'Mosque', value: data.mosqueName ?? '' },
    { label: 'Imam', value: data.imamName ?? '' },
    { label: 'Reason for Request', value: formatMotif(data.motif, data.motifDetail) },
  ];

  let rowY = 280;
  for (const field of fields) {
    drawFieldRow(page, field, bold, regular, rowY);
    rowY += 34;
  }

  // ── Certificate number / issue date ──────────────────────────────────────
  const issuedLabel = new Date(data.certificateIssuedAt).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  page.drawText('CERTIFICATE NO.', { x: MARGIN, y: Y(rowY + 24), size: 9, font: bold, color: MUTED });
  page.drawText(sanitize(data.certificateNumber), { x: MARGIN, y: Y(rowY + 40), size: 13, font: bold, color: ACCENT });
  page.drawText('ISSUE DATE', { x: MARGIN, y: Y(rowY + 66), size: 9, font: bold, color: MUTED });
  page.drawText(issuedLabel, { x: MARGIN, y: Y(rowY + 82), size: 11, font: regular, color: INK });

  // ── QR verification block ────────────────────────────────────────────────
  const QR_SIZE = 108;
  const qrX = PAGE_W - MARGIN - QR_SIZE;
  const qrTopY = rowY + 20;

  const verifyUrl = data.verifyUrl ?? `${window.location.origin}/en/verify/good-conduct/${data.certificateNumber}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 220, margin: 1 });
  const qrBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), (c) => c.charCodeAt(0));
  const qrImage = await pdf.embedPng(qrBytes);
  page.drawImage(qrImage, { x: qrX, y: Y(qrTopY + QR_SIZE), width: QR_SIZE, height: QR_SIZE });

  const qrCaptionY = qrTopY + QR_SIZE + 16;
  const caption = 'Scan to verify';
  const capWidth = regular.widthOfTextAtSize(caption, 8.5);
  page.drawText(caption, { x: qrX + (QR_SIZE - capWidth) / 2, y: Y(qrCaptionY), size: 8.5, font: regular, color: MUTED });

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerYFromTop = PAGE_H - 56; // 56pt above the bottom border
  drawCentered(page, `Verify at rwandamuslim.org/verify/good-conduct/${data.certificateNumber}`, regular, footerYFromTop, 8, MUTED);

  return pdf.save();
}

/** Convenience: build the certificate and wrap it in an `application/pdf` Blob. */
export async function buildGoodConductCertificateBlob(data: GoodConductCertificateData): Promise<Blob> {
  const bytes = await buildGoodConductCertificate(data);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type: 'application/pdf' });
}

/** Suggested download filename for a Good Conduct certificate. */
export function goodConductCertificateFileName(data: Pick<GoodConductCertificateData, 'certificateNumber'>): string {
  return `Good-Conduct-Certificate-${data.certificateNumber}.pdf`;
}
