import { ACCEPTED_METHODS, acceptedMethodsFor } from './acceptedMethods';

/** IremboPay pushes mobile money for RWF invoices only. */
describe('acceptedMethodsFor', () => {
  it('lists every channel for RWF', () => {
    expect(acceptedMethodsFor('RWF')).toEqual(ACCEPTED_METHODS);
    expect(acceptedMethodsFor()).toEqual(ACCEPTED_METHODS);
  });

  it.each(['USD', 'EUR', 'usd'])('lists cards only for %s', (currency) => {
    expect(acceptedMethodsFor(currency).map((m) => m.label)).toEqual(['Visa', 'Mastercard']);
  });
});
