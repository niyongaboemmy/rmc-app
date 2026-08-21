import { createHmac, timingSafeEqual } from 'crypto';

export interface SignatureVerification {
  valid: boolean;
  /** Why it failed — for the log line, never for the HTTP response. */
  reason?: string;
}

/** The header IremboPay signs its notifications with. */
export const IREMBOPAY_SIGNATURE_HEADER = 'irembopay-signature';

/**
 * Verifies an `irembopay-signature: t=<unix-ms>,s=<hex>` header.
 *
 *   s = HMAC_SHA256(secretKey, `${t}#${rawBody}`)
 *
 * `rawBody` must be the **exact bytes received**. Re-serialising the parsed
 * object cannot work: key order, whitespace and number formatting all differ
 * from the wire, and every signature would fail.
 *
 * Never throws. A malformed header is a `{valid:false}`, not an exception —
 * an uncaught throw here becomes a 500, and a 500 tells a prober something a
 * flat 200 does not.
 */
export function verifyIremboSignature(
  secretKey: string,
  rawBody: Buffer | string,
  header: string | undefined,
  toleranceSeconds = 300,
): SignatureVerification {
  if (!secretKey) return { valid: false, reason: 'no secret key configured' };
  if (!header) return { valid: false, reason: 'missing signature header' };

  const parsed = parseSignatureHeader(header);
  if (!parsed) return { valid: false, reason: 'malformed signature header' };

  const { timestamp, signature } = parsed;

  // `t` is milliseconds, not seconds — a seconds reading rejects everything.
  const skewMs = Math.abs(Date.now() - timestamp);
  if (skewMs > toleranceSeconds * 1000) {
    return { valid: false, reason: `timestamp outside the ${toleranceSeconds}s replay window` };
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
  const expected = createHmac('sha256', secretKey).update(`${timestamp}#${body}`).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  // timingSafeEqual throws on unequal lengths, and letting that throw would
  // leak "your guess was the wrong length" as a 500 instead of a 200.
  if (a.length !== b.length) return { valid: false, reason: 'signature length mismatch' };
  if (!timingSafeEqual(a, b)) return { valid: false, reason: 'signature mismatch' };

  return { valid: true };
}

/** Splits `t=…,s=…` on `,` then on the **first** `=` — a hex `s` never contains one, but a future field might. */
function parseSignatureHeader(header: string): { timestamp: number; signature: string } | null {
  let timestamp: number | undefined;
  let signature: string | undefined;

  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') timestamp = Number(value);
    if (key === 's') signature = value;
  }

  if (timestamp === undefined || !Number.isFinite(timestamp) || !signature) return null;
  return { timestamp, signature };
}

/** Builds a valid header. Used by tests and the manual curl recipe — never in the request path. */
export function buildIremboSignature(
  secretKey: string,
  rawBody: string,
  timestampMs: number = Date.now(),
): string {
  const signature = createHmac('sha256', secretKey)
    .update(`${timestampMs}#${rawBody}`)
    .digest('hex');
  return `t=${timestampMs},s=${signature}`;
}
