import type { Response } from 'express';

/**
 * Stream a private document straight to the caller.
 *
 * Used by the routes that re-serve files stored under a protected file-server
 * prefix — the file server refuses those keys to a browser, so the backend
 * fetches them with its service token and hands the bytes over here.
 *
 * `inline` so images render in an <img> and PDFs in an <iframe> rather than
 * downloading; `no-store` so a shared or borrowed machine keeps no copy of
 * someone's tax clearance or death certificate in its disk cache.
 *
 * Routes using this must take `@Res()`, which also bypasses the global response
 * envelope interceptor — otherwise the bytes would be wrapped in JSON.
 */
export function sendInlineFile(
  res: Response,
  fileName: string,
  buffer: Buffer,
  mimeType: string,
): void {
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', buffer.length);
  // A quote in the filename would end the header value early and let the rest be
  // read as further directives.
  res.setHeader('Content-Disposition', `inline; filename="${fileName.replace(/"/g, '')}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(buffer);
}
