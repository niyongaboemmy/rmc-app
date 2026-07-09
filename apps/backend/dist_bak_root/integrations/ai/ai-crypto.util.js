"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
const crypto_1 = require("crypto");
const ALGORITHM = 'aes-256-gcm';
const SALT = 'rmc-ai-cfg-v1';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
function deriveKey(secret) {
    return (0, crypto_1.scryptSync)(secret, SALT, 32);
}
function encryptSecret(plaintext, secret) {
    if (!plaintext)
        return '';
    const key = deriveKey(secret);
    const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('hex');
}
function decryptSecret(hex, secret) {
    if (!hex)
        return '';
    const buf = Buffer.from(hex, 'hex');
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const key = deriveKey(secret);
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final('utf8');
}
//# sourceMappingURL=ai-crypto.util.js.map