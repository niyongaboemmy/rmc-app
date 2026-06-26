import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'rmc-sms-cfg-v1'; // static salt — key derivation only, not secret
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SALT, 32) as Buffer;
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns a hex string: <iv(24)><tag(32)><ciphertext>.
 */
export function encryptCredential(plaintext: string, secret: string): string {
  if (!plaintext) return '';
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('hex');
}

/**
 * Decrypt a value produced by encryptCredential.
 * Returns the original plaintext, or throws on tampered/wrong-key data.
 */
export function decryptCredential(hex: string, secret: string): string {
  if (!hex) return '';
  const buf = Buffer.from(hex, 'hex');
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(secret);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}
