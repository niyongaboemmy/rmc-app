import * as crypto from 'crypto';

// Crockford base32 (no I, L, O, U — unambiguous when read aloud or typed).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Cryptographically-random, unguessable public tracking code:
 * <PREFIX>-<YYMM>-<8 base32 chars>. 32^8 ≈ 1.1e12 combinations → not
 * enumerable. The date prefix is cosmetic; security comes from the random
 * suffix (crypto.randomBytes, never Math.random).
 *
 * @param prefix e.g. 'RMC-JOB', 'RMC-HAJ', 'RMC-MAR'
 */
export function generateTrackingCode(prefix: string, now: Date = new Date()): string {
  const yymm = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0');
  const bytes = crypto.randomBytes(8);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b & 31]; // uniform: 256 is a multiple of 32
  return `${prefix}-${yymm}-${suffix}`;
}
