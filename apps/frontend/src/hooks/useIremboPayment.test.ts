import { act, renderHook, waitFor } from '@testing-library/react';
import { useIremboPayment, IremboInvoiceHandle } from './useIremboPayment';

const INVOICE: IremboInvoiceHandle = {
  transactionId: 'DON-abc12345-1',
  invoiceNumber: '880519183280',
  publicKey: 'pk_test',
  widgetScriptUrl: 'https://dashboard.sandbox.irembopay.com/assets/payment/inline.js',
  paymentLinkUrl: 'https://pay.sandbox.irembopay.com/880519183280',
};

type WidgetCallback = (err?: unknown, resp?: unknown) => void;

/**
 * Stands in for IremboPay's inline.js: the real script appends a global on load,
 * so the fake resolves the injected <script> and installs the same shape.
 */
function installWidget(): { initiate: jest.Mock; fire: (err?: unknown) => void } {
  let captured: WidgetCallback | undefined;

  const initiate = jest.fn((opts: { callback: WidgetCallback }) => {
    captured = opts.callback;
  });

  (window as unknown as { IremboPay?: unknown }).IremboPay = {
    initiate,
    locale: { EN: 'en-locale', RW: 'rw-locale', FR: 'fr-locale' },
    closeModal: jest.fn(),
  };

  // Resolve any script tag the hook injects, so loadScript() settles.
  const observer = new MutationObserver(() => {
    document.querySelectorAll('script').forEach((s) => s.dispatchEvent(new Event('load')));
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return { initiate, fire: (err?: unknown) => captured?.(err) };
}

describe('useIremboPayment', () => {
  afterEach(() => {
    delete (window as unknown as { IremboPay?: unknown }).IremboPay;
    document.querySelectorAll('script').forEach((s) => s.remove());
    jest.restoreAllMocks();
  });

  it('refuses to open without widget credentials and says to use the link', async () => {
    const checkStatus = jest.fn();
    const { result } = renderHook(() => useIremboPayment({ checkStatus }));

    await act(async () => {
      await result.current.pay({ ...INVOICE, publicKey: undefined });
    });

    expect(result.current.phase).toBe('failed');
    expect(result.current.error).toMatch(/payment link/i);
    expect(checkStatus).not.toHaveBeenCalled();
  });

  it('opens the widget with the invoice and the locale constant', async () => {
    const widget = installWidget();
    const checkStatus = jest.fn().mockResolvedValue('PENDING');
    const { result } = renderHook(() => useIremboPayment({ checkStatus, locale: 'RW' }));

    await act(async () => {
      await result.current.pay(INVOICE);
    });

    expect(widget.initiate).toHaveBeenCalledWith(
      expect.objectContaining({
        publicKey: 'pk_test',
        invoiceNumber: '880519183280',
        locale: 'rw-locale',
      }),
    );
    expect(result.current.phase).toBe('awaiting-payer');
  });

  /**
   * The rule the whole hook exists to enforce: the callback runs on the payer's
   * machine, so a "success" from it only starts backend confirmation. Marking a
   * payment complete on the widget's word would let anyone with a console mark
   * their own order paid.
   */
  it('never confirms on the widget callback alone — only the backend can', async () => {
    const widget = installWidget();
    const checkStatus = jest.fn().mockResolvedValue('PENDING');
    const onConfirmed = jest.fn();
    const { result } = renderHook(() =>
      useIremboPayment({ checkStatus, onConfirmed, pollIntervalMs: 5, pollTimeoutMs: 60 }),
    );

    await act(async () => {
      await result.current.pay(INVOICE);
    });
    await act(async () => {
      widget.fire(undefined); // widget reports success
    });

    await waitFor(() => expect(checkStatus).toHaveBeenCalled());
    expect(result.current.phase).not.toBe('confirmed');
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('confirms once the backend reports SUCCESSFUL', async () => {
    const widget = installWidget();
    const checkStatus = jest.fn().mockResolvedValue('SUCCESSFUL');
    const onConfirmed = jest.fn();
    const { result } = renderHook(() =>
      useIremboPayment({ checkStatus, onConfirmed, pollIntervalMs: 5 }),
    );

    await act(async () => {
      await result.current.pay(INVOICE);
    });
    await act(async () => {
      widget.fire(undefined);
    });

    await waitFor(() => expect(result.current.phase).toBe('confirmed'));
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it('reports a backend FAILED as a failure', async () => {
    const widget = installWidget();
    const checkStatus = jest.fn().mockResolvedValue('FAILED');
    const onFailed = jest.fn();
    const { result } = renderHook(() =>
      useIremboPayment({ checkStatus, onFailed, pollIntervalMs: 5 }),
    );

    await act(async () => {
      await result.current.pay(INVOICE);
    });
    await act(async () => {
      widget.fire(undefined);
    });

    await waitFor(() => expect(result.current.phase).toBe('failed'));
    expect(onFailed).toHaveBeenCalled();
  });

  /**
   * `BAD_INVOICES_PAID` arrives through the *error* channel but means the money
   * already landed. Telling that payer it failed invites a second payment.
   */
  it('treats an already-paid error as success and confirms with the backend', async () => {
    const widget = installWidget();
    const checkStatus = jest.fn().mockResolvedValue('SUCCESSFUL');
    const { result } = renderHook(() => useIremboPayment({ checkStatus, pollIntervalMs: 5 }));

    await act(async () => {
      await result.current.pay(INVOICE);
    });
    await act(async () => {
      widget.fire({ errors: [{ code: 'BAD_INVOICES_PAID' }] });
    });

    await waitFor(() => expect(result.current.phase).toBe('confirmed'));
    expect(checkStatus).toHaveBeenCalledWith('DON-abc12345-1');
  });

  it.each([
    ['INVALID_KEY', /misconfigured/i],
    ['BAD_INVOICES_PAYMENT_EXPIRED', /expired/i],
    ['BAD_INVOICES_IN_BATCH', /group/i],
  ])('turns the %s code into a readable message', async (code, expected) => {
    const widget = installWidget();
    const { result } = renderHook(() =>
      useIremboPayment({ checkStatus: jest.fn().mockResolvedValue('PENDING') }),
    );

    await act(async () => {
      await result.current.pay(INVOICE);
    });
    await act(async () => {
      widget.fire({ errors: [{ code }] });
    });

    expect(result.current.error).toMatch(expected);
    // The invoice stays payable — a widget error is not a verdict on the money.
    expect(result.current.phase).toBe('awaiting-payer');
  });

  it('keeps polling through a transient status-check failure', async () => {
    const widget = installWidget();
    const checkStatus = jest
      .fn()
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValue('SUCCESSFUL');
    const { result } = renderHook(() => useIremboPayment({ checkStatus, pollIntervalMs: 5 }));

    await act(async () => {
      await result.current.pay(INVOICE);
    });
    await act(async () => {
      widget.fire(undefined);
    });

    await waitFor(() => expect(result.current.phase).toBe('confirmed'));
    expect(checkStatus.mock.calls.length).toBeGreaterThan(1);
  });

  /**
   * Timing out is not failing: the invoice is still payable and reconciliation
   * will settle it. Saying "failed" is a lie the payer would act on.
   */
  it('falls back to awaiting-payer when confirmation never arrives', async () => {
    const widget = installWidget();
    const checkStatus = jest.fn().mockResolvedValue('PENDING');
    const { result } = renderHook(() =>
      useIremboPayment({ checkStatus, pollIntervalMs: 5, pollTimeoutMs: 20 }),
    );

    await act(async () => {
      await result.current.pay(INVOICE);
    });
    await act(async () => {
      widget.fire(undefined);
    });

    await waitFor(() => expect(result.current.error).toMatch(/not had confirmation yet/i));
    expect(result.current.phase).toBe('awaiting-payer');
  });

  it('loads the widget script only once across repeated payments', async () => {
    installWidget();
    const { result } = renderHook(() =>
      useIremboPayment({ checkStatus: jest.fn().mockResolvedValue('PENDING') }),
    );

    await act(async () => {
      await result.current.pay(INVOICE);
    });
    await act(async () => {
      await result.current.pay(INVOICE);
    });

    const tags = document.querySelectorAll(`script[src="${INVOICE.widgetScriptUrl}"]`);
    expect(tags.length).toBeLessThanOrEqual(1);
  });

  it('resets back to idle', async () => {
    const widget = installWidget();
    const { result } = renderHook(() =>
      useIremboPayment({ checkStatus: jest.fn().mockResolvedValue('PENDING') }),
    );

    await act(async () => {
      await result.current.pay(INVOICE);
    });
    await act(async () => {
      widget.fire({ errors: [{ code: 'INVALID_KEY' }] });
    });
    act(() => result.current.reset());

    expect(result.current.phase).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});
