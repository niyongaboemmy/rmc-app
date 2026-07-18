import * as crypto from 'crypto';

// Crockford base32 (no I, L, O, U — unambiguous when read aloud or typed).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Cryptographically-random, unguessable public tracking code:
 * RMC-JOB-<YYMM>-<8 base32 chars>. 32^8 ≈ 1.1e12 combinations, so it cannot be
 * enumerated. The date prefix is cosmetic only — the security comes from the
 * random suffix, generated with crypto.randomBytes (never Math.random).
 */
export function generateTrackingCode(now: Date = new Date()): string {
  const yymm = String(now.getFullYear()).slice(2) + String(now.getMonth() + 1).padStart(2, '0');
  const bytes = crypto.randomBytes(8);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b & 31]; // uniform: 256 is a multiple of 32
  return `RMC-JOB-${yymm}-${suffix}`;
}
