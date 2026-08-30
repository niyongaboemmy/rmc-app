import { parseIremboDate } from './irembo-pay.types';

/**
 * IremboPay sends an hours-only UTC offset (`+02`), which `new Date()` rejects.
 * Found against the live sandbox: the invoice was created on their side, then
 * our insert died with
 *   invalid input syntax for type timestamp with time zone: "0NaN-NaN-NaN..."
 * losing an invoice the payer could already pay. These pin the parser down.
 */
describe('parseIremboDate', () => {
  it('parses the hours-only offset IremboPay actually sends', () => {
    const parsed = parseIremboDate('2026-08-29T17:26:54.099+02');

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.toISOString()).toBe('2026-08-29T15:26:54.099Z');
  });

  it('parses a negative hours-only offset', () => {
    expect(parseIremboDate('2026-08-29T17:26:54.099-05')?.toISOString()).toBe(
      '2026-08-29T22:26:54.099Z',
    );
  });

  it('leaves a full offset alone', () => {
    expect(parseIremboDate('2026-08-29T17:26:54.099+02:00')?.toISOString()).toBe(
      '2026-08-29T15:26:54.099Z',
    );
  });

  it('leaves a Z timestamp alone', () => {
    expect(parseIremboDate('2026-08-29T15:26:54.099Z')?.toISOString()).toBe(
      '2026-08-29T15:26:54.099Z',
    );
  });

  it('passes a Date through', () => {
    const d = new Date('2026-08-29T15:26:54.099Z');
    expect(parseIremboDate(d)).toBe(d);
  });

  // The whole point: an unusable value must never reach a timestamptz column.
  it.each([undefined, null, '', 'not-a-date', '0NaN-NaN-NaN'])(
    'returns undefined for %j rather than an invalid Date',
    (value) => {
      expect(parseIremboDate(value as string)).toBeUndefined();
    },
  );

  it('returns undefined for an invalid Date object', () => {
    expect(parseIremboDate(new Date('nope'))).toBeUndefined();
  });
});
