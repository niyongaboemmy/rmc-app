import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { IremboPayWidget } from './IremboPayWidget';
import { IremboInvoiceHandle } from '@/hooks/useIremboPayment';

const INVOICE: IremboInvoiceHandle = {
  transactionId: 'DON-abc12345-1',
  invoiceNumber: '880519183280',
  publicKey: 'pk_test',
  widgetScriptUrl: 'https://dashboard.sandbox.irembopay.com/assets/payment/inline.js',
  paymentLinkUrl: 'https://pay.sandbox.irembopay.com/880519183280',
};

type WidgetCallback = (err?: unknown) => void;

function installWidget(): { fire: (err?: unknown) => Promise<void> } {
  let captured: WidgetCallback | undefined;
  (window as unknown as { IremboPay?: unknown }).IremboPay = {
    initiate: (opts: { callback: WidgetCallback }) => {
      captured = opts.callback;
    },
    locale: { EN: 'en' },
  };

  // The real inline.js registers the global on load; resolve any injected tag so
  // the hook's loadScript() settles.
  const observer = new MutationObserver(() => {
    document.querySelectorAll('script').forEach((s) => s.dispatchEvent(new Event('load')));
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return {
    // Opening the widget is asynchronous (script load, then initiate), so wait
    // for the callback to be registered before pretending the payer acted.
    fire: async (err?: unknown) => {
      await waitFor(() => expect(captured).toBeDefined());
      await act(async () => {
        captured?.(err);
      });
    },
  };
}

describe('IremboPayWidget', () => {
  afterEach(() => {
    delete (window as unknown as { IremboPay?: unknown }).IremboPay;
    document.querySelectorAll('script').forEach((s) => s.remove());
  });

  it('shows the amount and invoice number so the payer can check both', () => {
    render(
      <IremboPayWidget
        invoice={INVOICE}
        amount={5000}
        checkStatus={jest.fn().mockResolvedValue('PENDING')}
      />,
    );

    // Formatted with the same locale the component uses, because `rw-RW` groups
    // with a dot ("5.000") — hardcoding "5,000" would pin the wrong convention.
    const expected = `${new Intl.NumberFormat('rw-RW').format(5000)} RWF`;
    // React splits `{formatted} {currency}` into separate text nodes, so match on
    // the element's combined content rather than a single node.
    expect(
      screen.getByText((_, el) => el?.textContent?.replace(/\s+/g, ' ') === expected),
    ).toBeInTheDocument();
    expect(screen.getByText(/880519183280/)).toBeInTheDocument();
  });

  /** Closing the modal must not strand the payer with no way to finish. */
  it('always offers the payment link as a pay-later fallback', () => {
    render(
      <IremboPayWidget
        invoice={INVOICE}
        amount={5000}
        checkStatus={jest.fn().mockResolvedValue('PENDING')}
      />,
    );

    const link = screen.getByRole('link', { name: /pay later|another device/i });
    expect(link).toHaveAttribute('href', INVOICE.paymentLinkUrl);
  });

  it('tells the payer to keep the page open while confirming', async () => {
    const widget = installWidget();
    render(
      <IremboPayWidget
        invoice={INVOICE}
        amount={5000}
        checkStatus={jest.fn().mockResolvedValue('PENDING')}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    await widget.fire(undefined);

    await waitFor(() =>
      expect(screen.getByText(/keep this page open/i)).toBeInTheDocument(),
    );
  });

  it('confirms only after the backend says so, then hides the fallback link', async () => {
    const widget = installWidget();
    const onConfirmed = jest.fn();
    render(
      <IremboPayWidget
        invoice={INVOICE}
        amount={5000}
        checkStatus={jest.fn().mockResolvedValue('SUCCESSFUL')}
        onConfirmed={onConfirmed}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    await widget.fire(undefined);

    await waitFor(() => expect(screen.getByText(/payment received/i)).toBeInTheDocument());
    expect(onConfirmed).toHaveBeenCalled();
    // Nothing left to pay, so no "pay later" invitation.
    expect(screen.queryByRole('link', { name: /pay later/i })).not.toBeInTheDocument();
  });

  it('surfaces a widget error while leaving the invoice payable', async () => {
    const widget = installWidget();
    render(
      <IremboPayWidget
        invoice={INVOICE}
        amount={5000}
        checkStatus={jest.fn().mockResolvedValue('PENDING')}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    await widget.fire({ errors: [{ code: 'BAD_INVOICES_PAYMENT_EXPIRED' }] });

    await waitFor(() => expect(screen.getByText(/expired/i)).toBeInTheDocument());
    // Still recoverable: the link stays on offer.
    expect(screen.getByRole('link', { name: /pay later|another device/i })).toBeInTheDocument();
  });

  it('disables the button while a payment is being confirmed', async () => {
    const widget = installWidget();
    render(
      <IremboPayWidget
        invoice={INVOICE}
        amount={5000}
        checkStatus={jest.fn().mockResolvedValue('PENDING')}
      />,
    );

    const button = screen.getByRole('button', { name: /pay now/i });
    fireEvent.click(button);
    await widget.fire(undefined);

    await waitFor(() => expect(screen.getByRole('button', { name: /confirming/i })).toBeDisabled());
  });
});
