import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { DonationCartProvider, useDonationCart, MIN_GIFT } from './DonationCartContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DonationCartProvider>{children}</DonationCartProvider>
);

const gift = { category: 'school', categoryTitle: 'School', fundKey: 'scholarship', label: 'Scholarship Fund', campaignSlug: null, amount: 5000 };

/**
 * The amount a donor types becomes the amount charged, so the guard lives in
 * the cart rather than in the input — every caller gets the same rule, and a
 * zero or negative line can never reach an invoice.
 */
describe('DonationCartContext.updateAmount', () => {
  beforeEach(() => localStorage.clear());

  it('changes the amount of the addressed line only', () => {
    const { result } = renderHook(() => useDonationCart(), { wrapper });

    act(() => { result.current.addItem(gift); result.current.addItem({ ...gift, label: 'Zakat' }); });
    const [first, second] = result.current.cart;
    act(() => result.current.updateAmount(first.id, 12000));

    expect(result.current.cart.find((i) => i.id === first.id)?.amount).toBe(12000);
    expect(result.current.cart.find((i) => i.id === second.id)?.amount).toBe(5000);
  });

  it('recomputes the total', () => {
    const { result } = renderHook(() => useDonationCart(), { wrapper });

    act(() => result.current.addItem(gift));
    act(() => result.current.updateAmount(result.current.cart[0].id, 7500));

    expect(result.current.total).toBe(7500);
  });

  it.each([0, -1, MIN_GIFT - 1, NaN, Infinity])('rejects %p, leaving the line untouched', (bad) => {
    const { result } = renderHook(() => useDonationCart(), { wrapper });

    act(() => result.current.addItem(gift));
    act(() => result.current.updateAmount(result.current.cart[0].id, bad as number));

    expect(result.current.cart[0].amount).toBe(5000);
  });

  it('accepts exactly the minimum', () => {
    const { result } = renderHook(() => useDonationCart(), { wrapper });

    act(() => result.current.addItem(gift));
    act(() => result.current.updateAmount(result.current.cart[0].id, MIN_GIFT));

    expect(result.current.cart[0].amount).toBe(MIN_GIFT);
  });

  // A fractional gift would be sent to IremboPay as-is and render oddly in the
  // ledger; rounding here keeps every stored line a whole currency unit.
  it('rounds a fractional amount', () => {
    const { result } = renderHook(() => useDonationCart(), { wrapper });

    act(() => result.current.addItem(gift));
    act(() => result.current.updateAmount(result.current.cart[0].id, 1500.6));

    expect(result.current.cart[0].amount).toBe(1501);
  });

  it('ignores an unknown line', () => {
    const { result } = renderHook(() => useDonationCart(), { wrapper });

    act(() => result.current.addItem(gift));
    act(() => result.current.updateAmount('nope', 9999));

    expect(result.current.cart[0].amount).toBe(5000);
  });
});

/**
 * Zakat al-Fitr has an RWF product only. An intention that cannot be paid in
 * the chosen currency would fail at checkout, so switching away drops it.
 */
describe('DonationCartContext.setCurrency — intention', () => {
  beforeEach(() => localStorage.clear());

  it('drops an RWF-only intention when switching to USD', () => {
    const { result } = renderHook(() => useDonationCart(), { wrapper });

    act(() => result.current.setNiyyah('zakat-al-fitr'));
    act(() => result.current.setCurrency('USD'));

    expect(result.current.niyyah).toBe('sadaqah');
  });

  it('keeps an intention payable in every currency', () => {
    const { result } = renderHook(() => useDonationCart(), { wrapper });

    act(() => result.current.setNiyyah('zakat'));
    act(() => result.current.setCurrency('EUR'));

    expect(result.current.niyyah).toBe('zakat');
  });
});
