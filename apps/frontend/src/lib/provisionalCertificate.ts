import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { fileUrl } from './api';
import type { MarriageApplication, MarriageDocument } from './marriageApi';

// ────────────────────────────────────────────────────────────────────────────
// Provisional Marriage Certificate generator.
//
// The design lives entirely in the supplied template PDF (an A4-landscape page
// whose artwork — borders, Arabic/English labels, dotted lines, seals — is a
// single flattened background image). We load that PDF as-is and overlay only
// the dynamic values + the groom/bride photos at measured coordinates, leaving
// every signature line blank so the parties can sign the printed copy.
//
// Coordinates were measured on a 100-DPI raster of the template (1170×827 px)
// and are converted to PDF points (842×595) via the scale factors below, so the
// numbers read the same as the pixels you'd measure on the rendered image.
// ────────────────────────────────────────────────────────────────────────────

const PROVISIONAL_TEMPLATE_URL = '/templates/provisional-marriage-certificate.pdf';
// The official template has an identical layout (no "PROVISIONAL" watermark, a
// real RMC stamp instead of the QR), so the same overlay coordinates apply.
export const OFFICIAL_TEMPLATE_URL = '/templates/official-marriage-certificate.pdf';

const PAGE_W = 842;
const PAGE_H = 595;
const REF_W = 1170; // template raster width  @100 DPI
const REF_H = 827; // template raster height @100 DPI
const SX = PAGE_W / REF_W;
const SY = PAGE_H / REF_H;

/** Raster-x (px, left origin) → PDF-x (pt). */
const X = (px: number) => px * SX;
/** Raster-y (px, top origin) → PDF-y (pt, bottom origin). */
const Y = (px: number) => PAGE_H - px * SY;

const INK = rgb(0.11, 0.12, 0.14);
const LIGHT = rgb(1, 1, 1);

// Detail-row baselines (px, top origin). Rows 1-3 align across the groom (left)
// and bride (right) columns; the 4th row differs per column (the bride's
// "Guardian" label is longer and sits slightly lower than the groom's).
const ROW = { fullName: 345, fatherName: 366, idNumber: 388 };
const GROOM_LAST_Y = 411; // Inkwano / Bride price
const BRIDE_LAST_Y = 413; // Uhagarariye Umugeni / Guardian
// Column value start-x and dotted-line end-x (px).
const GROOM_X = 306;
const GROOM_END = 575;
const BRIDE_X = 852;
const BRIDE_GUARDIAN_X = 884; // the "Guardian :" label runs further right
const BRIDE_END = 1078;

// Witness names — centred over the Witness (1)/(2) signature lines (≈y704),
// printed just above the line so the line itself stays free for signing.
const WITNESS1_X = 185;
const WITNESS2_X = 343;
const OFFICIANT_X = 518; // Officiant (Imam) column centre
const WITNESS_NAME_Y = 696;

// Relabel the groom row "Inkwano / Bride price" → "Inkwano / Dowry": cover the
// "Bride price :" text and redraw "Dowry :" in a serif close to the template.
const CREAM = rgb(0.99, 0.96, 0.86);
const LABEL_GREEN = rgb(0.11, 0.17, 0.06);

// Photo placeholder boxes (px, top-left origin) — measured from the template's
// grey "Photo" rectangles. Both are ~square (~103×92) and symmetric.
const GROOM_PHOTO_BOX = { x: 163, top: 194, w: 103, h: 92 };
const BRIDE_PHOTO_BOX = { x: 897, top: 194, w: 104, h: 92 };

const PROVINCE_LABELS: Record<string, string> = {
  kigali: 'Kigali City',
  north: 'Northern Province',
  south: 'Southern Province',
  east: 'Eastern Province',
  west: 'Western Province',
};

/** Strip characters the standard Helvetica (WinAnsi) font cannot encode. */
function sanitize(text: string): string {
  return (text || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

/** Draw left-aligned text, shrinking the font until it fits `maxWidth`. */
function drawFitted(
  page: PDFPage,
  text: string,
  font: PDFFont,
  opts: { xPx: number; yPx: number; maxWidthPx: number; size?: number; color?: ReturnType<typeof rgb> },
) {
  const value = sanitize(text);
  if (!value) return;
  const maxWidth = X(opts.maxWidthPx);
  let size = opts.size ?? 10;
  while (size > 6 && font.widthOfTextAtSize(value, size) > maxWidth) size -= 0.5;
  page.drawText(value, {
    x: X(opts.xPx),
    y: Y(opts.yPx) + 2, // sit just above the dotted line
    size,
    font,
    color: opts.color ?? INK,
  });
}

/** Draw text centred on `centerXPx`, shrinking to fit `maxWidth`. */
function drawCentered(
  page: PDFPage,
  text: string,
  font: PDFFont,
  opts: { centerXPx: number; yPx: number; maxWidthPx: number; size?: number; color?: ReturnType<typeof rgb> },
) {
  const value = sanitize(text);
  if (!value) return;
  const maxWidth = X(opts.maxWidthPx);
  let size = opts.size ?? 10;
  while (size > 5 && font.widthOfTextAtSize(value, size) > maxWidth) size -= 0.5;
  const w = font.widthOfTextAtSize(value, size);
  page.drawText(value, {
    x: X(opts.centerXPx) - w / 2,
    y: Y(opts.yPx),
    size,
    font,
    color: opts.color ?? INK,
  });
}

type Box = { x: number; top: number; w: number; h: number };

/**
 * Draw a (width-cropped) photo at full box height, centred horizontally. The
 * image keeps its full height; if narrower than the box it shows centred with
 * side margins, never wider (it was cropped to ≤ the box aspect).
 */
function drawPhotoFitHeight(page: PDFPage, image: PDFImage, box: Box) {
  const boxX = X(box.x);
  const boxW = box.w * SX;
  const boxH = box.h * SY;
  const drawW = Math.min(boxW, boxH * (image.width / image.height));
  page.drawImage(image, {
    x: boxX + (boxW - drawW) / 2,
    y: Y(box.top) - boxH,
    width: drawW,
    height: boxH,
  });
}

/** Draw a photo "contained" (whole image, centred) inside a box — fallback. */
function drawPhotoContained(page: PDFPage, image: PDFImage, box: Box) {
  const boxX = X(box.x);
  const boxW = box.w * SX;
  const boxH = box.h * SY;
  const boxBottomY = Y(box.top) - boxH;
  const scale = Math.min(boxW / image.width, boxH / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  page.drawImage(image, {
    x: boxX + (boxW - drawW) / 2,
    y: boxBottomY + (boxH - drawH) / 2,
    width: drawW,
    height: drawH,
  });
}

/**
 * Crop an image to "full height, width only" for a box aspect ratio, returning
 * JPEG bytes. The full image height is always kept (the face is never cut top or
 * bottom); only the width is centre-cropped, and only when the image is wider
 * than the box. The returned image's aspect is ≤ the box aspect. Runs in the
 * browser via canvas; throws if canvas is unavailable (caller falls back to a
 * plain contained embed).
 */
async function rasterizeFitHeight(bytes: Uint8Array, boxAspect: number): Promise<Uint8Array> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    throw new Error('canvas unavailable');
  }
  const buf = new Uint8Array(bytes.byteLength);
  buf.set(bytes);
  const blob = new Blob([buf]);
  const bmp = await createImageBitmap(blob);

  const sh = bmp.height;                                       // keep full height
  const sw = Math.min(bmp.width, Math.round(bmp.height * boxAspect)); // crop width only
  const sx = Math.round((bmp.width - sw) / 2);

  const scale = 3; // supersample for crispness on the PDF
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(bmp, sx, 0, sw, sh, 0, 0, canvas.width, canvas.height);
  bmp.close?.();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const b64 = dataUrl.split(',')[1] ?? '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** First document matching any of the given types, in priority order. */
function pickDocument(app: MarriageApplication, types: string[]): MarriageDocument | undefined {
  for (const type of types) {
    const doc = app.documents?.find((d) => d.documentType === type);
    if (doc) return doc;
  }
  return undefined;
}

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; kind: 'png' | 'jpg' } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > 3 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { bytes, kind: 'png' };
    }
    return { bytes, kind: 'jpg' };
  } catch {
    return null;
  }
}

async function embedRaw(pdf: PDFDocument, data: { bytes: Uint8Array; kind: 'png' | 'jpg' }): Promise<PDFImage | null> {
  // Trust the magic bytes first, fall back to the other decoder on failure.
  try {
    return data.kind === 'png' ? await pdf.embedPng(data.bytes) : await pdf.embedJpg(data.bytes);
  } catch {
    try {
      return data.kind === 'png' ? await pdf.embedJpg(data.bytes) : await pdf.embedPng(data.bytes);
    } catch {
      return null;
    }
  }
}

/**
 * Embed a document's image, cover-cropped to fill `box`. Returns the image plus
 * whether it was successfully covered (so the caller fills the box) or had to
 * fall back to a raw embed (drawn contained).
 */
async function embedPhoto(
  pdf: PDFDocument,
  doc: MarriageDocument | undefined,
  box: Box,
): Promise<{ image: PDFImage; covered: boolean } | null> {
  if (!doc) return null;
  const data = await fetchImageBytes(fileUrl(doc.fileKey));
  if (!data) return null;
  try {
    const jpeg = await rasterizeFitHeight(data.bytes, box.w / box.h);
    const image = await pdf.embedJpg(jpeg);
    return { image, covered: true };
  } catch {
    const image = await embedRaw(pdf, data);
    return image ? { image, covered: false } : null;
  }
}

function formatPlaceOfMarriage(app: MarriageApplication): string {
  const parts: string[] = [];
  if (app.venueAddress) parts.push(app.venueAddress);
  else if (app.venueType === 'mosque') parts.push('Mosque');
  if (app.district) parts.push(app.district);
  if (app.province) parts.push(PROVINCE_LABELS[app.province] ?? app.province);
  return parts.filter(Boolean).join(', ');
}

function formatMahr(app: MarriageApplication): string {
  // If a bride price amount was provided, show only the amount. Otherwise fall
  // back to the description (description-only is allowed).
  if (app.mahrAmount != null && !Number.isNaN(Number(app.mahrAmount)) && Number(app.mahrAmount) > 0) {
    return `${Number(app.mahrAmount).toLocaleString()} ${app.mahrCurrency || 'RWF'}`;
  }
  return app.mahrDescription ?? '';
}

// Official Rwanda district codes (NISR ordering, 01–30). The certificate number
// uses the district code in place of the "MR" application-type segment, i.e.
// RMC-MR-YYYYMM-NNNNN  →  RMC-<districtCode>-YYYYMM-NNNNN.
const DISTRICT_CODES: Record<string, string> = {
  // Kigali City
  nyarugenge: '01', gasabo: '02', kicukiro: '03',
  // Southern Province
  nyanza: '04', gisagara: '05', nyaruguru: '06', huye: '07', nyamagabe: '08', ruhango: '09', muhanga: '10', kamonyi: '11',
  // Western Province
  karongi: '12', rutsiro: '13', rubavu: '14', nyabihu: '15', ngororero: '16', rusizi: '17', nyamasheke: '18',
  // Northern Province
  rulindo: '19', gakenke: '20', musanze: '21', burera: '22', gicumbi: '23',
  // Eastern Province
  rwamagana: '24', nyagatare: '25', gatsibo: '26', kayonza: '27', kirehe: '28', ngoma: '29', bugesera: '30',
};

/**
 * Certificate number with the application-type segment ("MR") replaced by the
 * district code, e.g. "RMC-MR-202606-00001" → "RMC-01-202606-00001". Falls back
 * to the original number if the district isn't recognised.
 */
export function formatCertificateNumber(app: MarriageApplication): string {
  const code = app.district ? DISTRICT_CODES[app.district.trim().toLowerCase()] : undefined;
  if (!code) return app.applicationNumber;
  const parts = app.applicationNumber.split('-');
  if (parts.length >= 2) parts[1] = code; // replace the type segment
  return parts.join('-');
}

/**
 * Shared engine: overlay the couple's details and photos onto a certificate
 * template (provisional or official — both share the same layout). Signature
 * lines are left blank.
 */
export async function buildCertificatePdf(
  app: MarriageApplication,
  templateUrl: string,
  opts: { groomPhotoTypes?: string[]; bridePhotoTypes?: string[] } = {},
): Promise<Uint8Array> {
  const templateBytes = await fetch(templateUrl).then((r) => {
    if (!r.ok) throw new Error('Could not load the certificate template.');
    return r.arrayBuffer();
  });

  const pdf = await PDFDocument.load(templateBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const page = pdf.getPages()[0];

  const groomMaxW = GROOM_END - GROOM_X;
  const brideMaxW = BRIDE_END - BRIDE_X;

  // Relabel "Bride price" → "Dowry" (cover the baked label, redraw in serif).
  page.drawRectangle({
    x: X(178),
    y: Y(418),
    width: X(268) - X(178),
    height: (418 - 403) * SY,
    color: CREAM,
  });
  page.drawText('Dowry :', { x: X(180), y: Y(415), size: 9, font: serif, color: LABEL_GREEN });

  // ── Groom column (left) ───────────────────────────────────────────────────
  drawFitted(page, app.groomName, font, { xPx: GROOM_X, yPx: ROW.fullName, maxWidthPx: groomMaxW });
  drawFitted(page, app.groomFatherName ?? '', font, { xPx: GROOM_X, yPx: ROW.fatherName, maxWidthPx: groomMaxW });
  drawFitted(page, app.groomNid, font, { xPx: GROOM_X, yPx: ROW.idNumber, maxWidthPx: groomMaxW });
  drawFitted(page, formatMahr(app), font, { xPx: GROOM_X, yPx: GROOM_LAST_Y, maxWidthPx: groomMaxW });

  // ── Bride column (right) ──────────────────────────────────────────────────
  drawFitted(page, app.brideName, font, { xPx: BRIDE_X, yPx: ROW.fullName, maxWidthPx: brideMaxW });
  drawFitted(page, app.brideFatherName ?? '', font, { xPx: BRIDE_X, yPx: ROW.fatherName, maxWidthPx: brideMaxW });
  drawFitted(page, app.brideNid, font, { xPx: BRIDE_X, yPx: ROW.idNumber, maxWidthPx: brideMaxW });
  drawFitted(page, app.waliName ?? '', font, {
    xPx: BRIDE_GUARDIAN_X,
    yPx: BRIDE_LAST_Y,
    maxWidthPx: BRIDE_END - BRIDE_GUARDIAN_X,
  });

  // ── Place of marriage ─────────────────────────────────────────────────────
  drawFitted(page, formatPlaceOfMarriage(app), font, { xPx: 800, yPx: 600, maxWidthPx: 1085 - 800 });

  // ── Certificate number (footer) ───────────────────────────────────────────
  // The footer band already prints "RMC … - … - NY", so drop the leading "RMC-"
  // and centre the number in the dotted blank between "RMC" and "NY" (white on
  // the dark-green band), kept narrow so it never overlaps those labels.
  // The template prints "RMC" (ends ≈x236) and "NY" (starts ≈x332); centre the
  // number in the blank between them (≈x283) and keep it within that gap. The
  // number uses the district code in place of "MR".
  drawCentered(page, formatCertificateNumber(app).replace(/^RMC[-\s]?/i, ''), font, {
    centerXPx: 283,
    yPx: 792,
    maxWidthPx: 84,
    size: 7.5,
    color: LIGHT,
  });

  // ── Photos ────────────────────────────────────────────────────────────────
  // National ID scans are never used as a photo fallback (privacy): the boxes
  // only ever show dedicated portraits, else they stay blank.
  const groomTypes = opts.groomPhotoTypes ?? ['groom_photo', 'portrait'];
  const brideTypes = opts.bridePhotoTypes ?? ['bride_photo'];
  const [groomImg, brideImg] = await Promise.all([
    embedPhoto(pdf, pickDocument(app, groomTypes), GROOM_PHOTO_BOX),
    embedPhoto(pdf, pickDocument(app, brideTypes), BRIDE_PHOTO_BOX),
  ]);
  const place = (photo: typeof groomImg, box: Box) => {
    if (!photo) return;
    if (photo.covered) drawPhotoFitHeight(page, photo.image, box);
    else drawPhotoContained(page, photo.image, box);
  };
  place(groomImg, GROOM_PHOTO_BOX);
  place(brideImg, BRIDE_PHOTO_BOX);

  // ── Witnesses + officiant (names above their signature lines) ─────────────
  if (app.witness1Name) {
    drawCentered(page, app.witness1Name, font, { centerXPx: WITNESS1_X, yPx: WITNESS_NAME_Y, maxWidthPx: 105, size: 9 });
  }
  if (app.witness2Name) {
    drawCentered(page, app.witness2Name, font, { centerXPx: WITNESS2_X, yPx: WITNESS_NAME_Y, maxWidthPx: 110, size: 9 });
  }
  if (app.requestedOfficiant) {
    drawCentered(page, app.requestedOfficiant, font, { centerXPx: OFFICIANT_X, yPx: WITNESS_NAME_Y, maxWidthPx: 110, size: 9 });
  }

  return pdf.save();
}

/** Build the provisional certificate (template with the "PROVISIONAL" watermark). */
export function buildProvisionalCertificate(app: MarriageApplication): Promise<Uint8Array> {
  return buildCertificatePdf(app, PROVISIONAL_TEMPLATE_URL);
}

/** Convenience: build the certificate and wrap it in a `application/pdf` Blob. */
export async function buildProvisionalCertificateBlob(app: MarriageApplication): Promise<Blob> {
  const bytes = await buildProvisionalCertificate(app);
  // Copy into a fresh ArrayBuffer-backed view so the Blob constructor accepts it
  // regardless of the underlying buffer type returned by pdf-lib.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type: 'application/pdf' });
}

/** Suggested download filename for an application's provisional certificate. */
export function provisionalCertificateFileName(app: MarriageApplication): string {
  return `Provisional-Marriage-Certificate-${app.applicationNumber}.pdf`;
}

/** Whether the provisional certificate is available (payment completed). */
export function canDownloadProvisional(app: Pick<MarriageApplication, 'paymentStatus'>): boolean {
  return app.paymentStatus === 'paid';
}
