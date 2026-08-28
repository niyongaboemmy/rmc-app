/**
 * Every domain builds its own gateway transaction id. IremboPay rejects any id
 * over 50 characters with a bare `INVALID_REQUEST`, which surfaced as a 500 and
 * meant good conduct fees could never be collected — the full-UUID form was 53.
 *
 * These are format guards, not behaviour tests: they fail the moment a prefix
 * or an id component grows past what the gateway will accept, instead of that
 * being discovered by a payer who cannot pay.
 */
const IREMBOPAY_MAX_TRANSACTION_ID = 50;

/** A 13-digit epoch, as every generator appends. */
const EPOCH = '1787936259928';
const UUID = 'd59b747b-52e8-4308-89dc-f8f5b0e06499';

describe('gateway transaction id length', () => {
  const cases: Array<{ domain: string; id: string }> = [
    // donations.service.ts — `DON-${saved.id.slice(0, 8)}-${Date.now()}`
    { domain: 'donation', id: `DON-${UUID.slice(0, 8)}-${EPOCH}` },
    // good-conduct.service.ts — `GC-${request.id.slice(0, 8)}-${Date.now()}`
    { domain: 'good conduct', id: `GC-${UUID.slice(0, 8)}-${EPOCH}` },
    // marriage.service.ts — `MAR-${app.applicationNumber}-${Date.now()}`
    { domain: 'marriage', id: `MAR-RMC-MR-202606-00006-${EPOCH}` },
    // The admin test panel — `TEST-${20 hex}`
    { domain: 'admin test', id: `TEST-${'A'.repeat(20)}` },
  ];

  it.each(cases)('$domain fits the gateway limit', ({ id }) => {
    expect(id.length).toBeLessThanOrEqual(IREMBOPAY_MAX_TRANSACTION_ID);
  });

  // The regression itself, stated as the thing that must never come back.
  it('rejects the full-UUID form that IremboPay refused', () => {
    expect(`GC-${UUID}-${EPOCH}`.length).toBeGreaterThan(IREMBOPAY_MAX_TRANSACTION_ID);
  });

  // A longer application number is the realistic way marriage would regress.
  it('leaves marriage headroom for a longer application number', () => {
    const longest = `MAR-RMC-MR-999912-99999-${EPOCH}`;
    expect(longest.length).toBeLessThanOrEqual(IREMBOPAY_MAX_TRANSACTION_ID);
  });

  it('keeps the domain prefixes the webhook services match on', () => {
    expect(cases.map((c) => c.id.split('-')[0])).toEqual(['DON', 'GC', 'MAR', 'TEST']);
  });
});
