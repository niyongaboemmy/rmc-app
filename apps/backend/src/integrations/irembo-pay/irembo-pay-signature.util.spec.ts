import { createHmac } from 'crypto';
import { buildIremboSignature, verifyIremboSignature } from './irembo-pay-signature.util';

const SECRET = 'sk_test_signature_key';
const BODY = JSON.stringify({
  success: true,
  data: { invoiceNumber: '880519183280', paymentStatus: 'PAID', amount: 5000 },
});

describe('verifyIremboSignature', () => {
  afterEach(() => jest.useRealTimers());

  it("verifies the doc's worked example shape at its own timestamp", () => {
    // t is fixed, so `now` is pinned to it rather than the signature to `now`.
    const t = 1653405045000;
    jest.useFakeTimers().setSystemTime(t);

    const s = createHmac('sha256', SECRET).update(`${t}#${BODY}`).digest('hex');

    expect(verifyIremboSignature(SECRET, BODY, `t=${t},s=${s}`)).toEqual({ valid: true });
  });

  it('accepts a freshly built signature', () => {
    const header = buildIremboSignature(SECRET, BODY);
    expect(verifyIremboSignature(SECRET, BODY, header).valid).toBe(true);
  });

  it('accepts a Buffer body identically to a string body', () => {
    const header = buildIremboSignature(SECRET, BODY);
    expect(verifyIremboSignature(SECRET, Buffer.from(BODY, 'utf8'), header).valid).toBe(true);
  });

  it('rejects a single flipped byte in the body', () => {
    const header = buildIremboSignature(SECRET, BODY);
    const tampered = BODY.replace('5000', '5001');

    const result = verifyIremboSignature(SECRET, tampered, header);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/mismatch/);
  });

  it('rejects a signature made with a different key', () => {
    const header = buildIremboSignature('sk_the_wrong_key', BODY);
    expect(verifyIremboSignature(SECRET, BODY, header).valid).toBe(false);
  });

  it('rejects a timestamp ten minutes old', () => {
    const header = buildIremboSignature(SECRET, BODY, Date.now() - 10 * 60 * 1000);

    const result = verifyIremboSignature(SECRET, BODY, header);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/replay window/);
  });

  it('rejects a timestamp ten minutes in the future', () => {
    const header = buildIremboSignature(SECRET, BODY, Date.now() + 10 * 60 * 1000);
    expect(verifyIremboSignature(SECRET, BODY, header).valid).toBe(false);
  });

  it('honours the configured tolerance rather than a fixed five minutes', () => {
    // 6 minutes old: outside the 300s default, inside a 600s override.
    const header = buildIremboSignature(SECRET, BODY, Date.now() - 6 * 60 * 1000);

    expect(verifyIremboSignature(SECRET, BODY, header, 300).valid).toBe(false);
    expect(verifyIremboSignature(SECRET, BODY, header, 600).valid).toBe(true);
  });

  it.each([
    ['undefined header', undefined],
    ['empty header', ''],
    ['no separators', 'garbage'],
    ['missing s', 't=1653405045000'],
    ['missing t', 's=deadbeef'],
    ['non-numeric t', 't=notanumber,s=deadbeef'],
    ['reversed order', 's=deadbeef,t=notanumber'],
  ])('returns {valid:false} without throwing for a %s', (_label, header) => {
    expect(() => verifyIremboSignature(SECRET, BODY, header)).not.toThrow();
    expect(verifyIremboSignature(SECRET, BODY, header).valid).toBe(false);
  });

  it('does not throw when the signature is a different length to the expected one', () => {
    const header = `t=${Date.now()},s=ab`;
    const result = verifyIremboSignature(SECRET, BODY, header);

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/length mismatch/);
  });

  it('refuses to validate anything when no secret key is configured', () => {
    const header = buildIremboSignature('', BODY);
    expect(verifyIremboSignature('', BODY, header).valid).toBe(false);
  });

  it('tolerates fields in either order and extra whitespace', () => {
    const t = Date.now();
    const s = createHmac('sha256', SECRET).update(`${t}#${BODY}`).digest('hex');

    expect(verifyIremboSignature(SECRET, BODY, ` s=${s} , t=${t} `).valid).toBe(true);
  });

  it('fails when the body is re-serialised with different key order', () => {
    const wire = '{"a":1,"b":2}';
    const header = buildIremboSignature(SECRET, wire);
    const reserialised = JSON.stringify({ b: 2, a: 1 });

    expect(verifyIremboSignature(SECRET, reserialised, header).valid).toBe(false);
    expect(verifyIremboSignature(SECRET, wire, header).valid).toBe(true);
  });
});
