import type { MarriageApplication } from './marriageApi';
import { buildCertificatePdf, OFFICIAL_TEMPLATE_URL } from './provisionalCertificate';

// The official certificate reuses the provisional overlay engine — same field
// coordinates and photos — on the official template (no "PROVISIONAL" watermark,
// real RMC stamp). It's the final record, produced once the certificate is
// issued by the RMC after the signed provisional has been reviewed.

/** Build the official certificate as PDF bytes. */
export function buildOfficialCertificate(app: MarriageApplication): Promise<Uint8Array> {
  // The official (legal) certificate uses only the dedicated groom/bride
  // portraits — never the couple portrait or National ID scans.
  return buildCertificatePdf(app, OFFICIAL_TEMPLATE_URL, {
    groomPhotoTypes: ['groom_photo'],
    bridePhotoTypes: ['bride_photo'],
  });
}

/** Build the official certificate wrapped in an `application/pdf` Blob. */
export async function buildOfficialCertificateBlob(app: MarriageApplication): Promise<Blob> {
  const bytes = await buildOfficialCertificate(app);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type: 'application/pdf' });
}

/** Suggested download filename for an application's official certificate. */
export function officialCertificateFileName(app: MarriageApplication): string {
  return `Official-Marriage-Certificate-${app.applicationNumber}.pdf`;
}

/** Whether the official certificate is available (issued / application closed). */
export function canDownloadOfficial(
  app: Pick<MarriageApplication, 'status' | 'certificateIssuedAt'>,
): boolean {
  return app.status === 'closed' && !!app.certificateIssuedAt;
}
