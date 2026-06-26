import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * AES-256-GCM encryption for AI provider API keys at rest.
 * Mirrors the SMS credential crypto helper; the encryption key is derived from
 * APP_ENCRYPTION_KEY (see AiSettingsService.encryptionKey()).
 */
const ALGORITHM = 'aes-256-gcm';
const SALT = 'rmc-ai-cfg-v1';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SALT, 32) as Buffer;
}

export function encryptSecret(plaintext: string, secret: string): string {
  if (!plaintext) return '';
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('hex');
}

export function decryptSecret(hex: string, secret: string): string {
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
