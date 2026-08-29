import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PaymentTestingTab from './PaymentTestingTab';
import {
  paymentSettingsApi,
  PaymentMethod,
  PaymentType,
} from '@/lib/paymentSettingsApi';

jest.mock('@/lib/paymentSettingsApi', () => ({
  paymentSettingsApi: {
    listTransactions: jest.fn(),
    getIremboPayStatus: jest.fn(),
    testIremboPayPush: jest.fn(),
    testIremboPayInvoice: jest.fn(),
    checkTransactionStatus: jest.fn(),
    recheckIremboPayInvoice: jest.fn(),
  },
}));

const toast = { success: jest.fn(), error: jest.fn() };
jest.mock('@/components/ui/Toast', () => ({ useToast: () => toast }));

// The tab opens an EventSource to the admin SSE stream on mount.
class FakeEventSource {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = jest.fn();
}
(global as unknown as { EventSource: unknown }).EventSource = FakeEventSource;

const api = paymentSettingsApi as unknown as Record<string, jest.Mock>;

const METHODS: PaymentMethod[] = [
  {
    id: 'm-1', name: 'IremboPay', code: 'IREMBOPAY', description: null,
    isActive: true, logoUrl: null, sortOrder: 1, createdAt: '', updatedAt: '',
  },
  // Inactive, so it must not be offered as a target for a new test.
  {
    id: 'm-2', name: 'Cash', code: 'CASH' as unknown as PaymentMethod['code'],
    description: null, isActive: false, logoUrl: null, sortOrder: 9, createdAt: '', updatedAt: '',
  },
];

const TYPES: PaymentType[] = [
  {
    id: 't-1', name: 'Donations', key: 'DONATION', description: null, amount: null,
    isActive: true, rates: [], createdAt: '', updatedAt: '',
  },
];

const INVOICE_RESULT = {
  transactionId: 'TEST-ABC',
  invoiceNumber: '880519183280',
  status: 'PENDING' as const,
  paymentLinkUrl: 'https://pay.sandbox.irembopay.com/880519183280',
  responseCode: 'NEW',
  message: 'Invoice created',
};

const PENDING_TX = {
  id: 'tx-1',
  requestTransactionId: 'TEST-ABC',
  gatewayTransactionId: null,
  paymentMethodCode: 'IREMBOPAY',
  paymentTypeKey: 'DONATION',
  referenceId: null,
  amount: 100,
  currency: 'RWF',
  mobilePhone: '250781234567',
  status: 'pending' as const,
  responseCode: 'NEW',
  message: null,
  isTest: true,
  completedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function setup() {
  return render(<PaymentTestingTab methods={METHODS} types={TYPES} />);
}

describe('PaymentTestingTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.listTransactions.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    api.getIremboPayStatus.mockResolvedValue({
      configured: true, isTestMode: true, unmappedPaymentTypes: 0,
    });
    api.testIremboPayPush.mockResolvedValue(INVOICE_RESULT);
    api.testIremboPayInvoice.mockResolvedValue(INVOICE_RESULT);
  });

  /**
   * The old banner showed the IntouchPay merchant balance. IremboPay has no
   * balance API, and the three things that actually make a test fail are
   * whether it is configured, which environment it points at, and whether any
   * payment type is unmapped — so that is what replaced it.
   */
  describe('the gateway readiness banner', () => {
    it('reports a configured gateway and its environment', async () => {
      setup();

      await waitFor(() => expect(screen.getByText('Test mode')).toBeInTheDocument());
      expect(screen.getByText(/Configured/)).toBeInTheDocument();
    });

    it('warns when credentials are missing', async () => {
      api.getIremboPayStatus.mockResolvedValue({
        configured: false, isTestMode: false, unmappedPaymentTypes: 0,
      });
      setup();

      await waitFor(() =>
        expect(screen.getByText(/Not configured/)).toBeInTheDocument(),
      );
      expect(screen.getByText('LIVE mode')).toBeInTheDocument();
    });

    /** An unmapped type throws a BadRequest at charge time — surface it first. */
    it('flags unmapped payment types', async () => {
      api.getIremboPayStatus.mockResolvedValue({
        configured: true, isTestMode: true, unmappedPaymentTypes: 2,
      });
      setup();

      await waitFor(() =>
        expect(screen.getByText(/2 payment types unmapped/)).toBeInTheDocument(),
      );
    });
  });

  describe('sending a test', () => {
    it('pushes MoMo through the push route with the chosen provider', async () => {
      setup();
      await waitFor(() => expect(api.getIremboPayStatus).toHaveBeenCalled());

      fireEvent.change(screen.getByPlaceholderText('250788000000'), {
        target: { value: '0781234567' },
      });
      fireEvent.click(screen.getByText('Airtel Money'));
      fireEvent.click(screen.getByText('Create Invoice & Push'));

      await waitFor(() => expect(api.testIremboPayPush).toHaveBeenCalled());
      expect(api.testIremboPayPush).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          mobilePhone: '0781234567',
          paymentProvider: 'AIRTEL',
          paymentTypeKey: 'DONATION',
        }),
      );
      expect(api.testIremboPayInvoice).not.toHaveBeenCalled();
    });

    /**
     * An invoice is payable by card, bank or its link, so it needs no phone
     * number — and must not send a `paymentProvider`, which only means anything
     * for a push.
     */
    it('creates an invoice with no phone number and no push provider', async () => {
      setup();
      await waitFor(() => expect(api.getIremboPayStatus).toHaveBeenCalled());

      fireEvent.click(screen.getByText('Invoice only'));
      fireEvent.click(screen.getByText('Create Invoice'));

      await waitFor(() => expect(api.testIremboPayInvoice).toHaveBeenCalled());
      const payload = api.testIremboPayInvoice.mock.calls[0][0];
      expect(payload).not.toHaveProperty('mobilePhone');
      expect(payload).not.toHaveProperty('paymentProvider');
      expect(api.testIremboPayPush).not.toHaveBeenCalled();
    });

    it('refuses a push with no phone number, without calling the gateway', async () => {
      setup();
      await waitFor(() => expect(api.getIremboPayStatus).toHaveBeenCalled());

      fireEvent.click(screen.getByText('Create Invoice & Push'));

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(api.testIremboPayPush).not.toHaveBeenCalled();
    });

    it('rejects an amount below 1 RWF', async () => {
      setup();
      await waitFor(() => expect(api.getIremboPayStatus).toHaveBeenCalled());

      fireEvent.change(screen.getByDisplayValue('100'), { target: { value: '0' } });
      fireEvent.click(screen.getByText('Create Invoice & Push'));

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(api.testIremboPayPush).not.toHaveBeenCalled();
    });

    it('surfaces the invoice number and payment link in the result panel', async () => {
      api.listTransactions
        .mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 20 })
        .mockResolvedValue({ items: [PENDING_TX], total: 1, page: 1, limit: 20 });
      setup();
      await waitFor(() => expect(api.getIremboPayStatus).toHaveBeenCalled());

      fireEvent.click(screen.getByText('Invoice only'));
      fireEvent.click(screen.getByText('Create Invoice'));

      await waitFor(() => expect(screen.getByText('880519183280')).toBeInTheDocument());
      expect(screen.getByText('Open the payment link')).toHaveAttribute(
        'href',
        INVOICE_RESULT.paymentLinkUrl,
      );
    });
  });

  /**
   * The recovery path for a callback that never arrived. There was no UI for
   * this before; without it a dropped webhook can only be fixed by waiting for
   * the reconciliation cron.
   */
  describe('re-checking an invoice', () => {
    it('re-queries by invoice number and refreshes the ledger row', async () => {
      api.listTransactions
        .mockResolvedValueOnce({ items: [], total: 0, page: 1, limit: 20 })
        .mockResolvedValue({ items: [PENDING_TX], total: 1, page: 1, limit: 20 });
      api.recheckIremboPayInvoice.mockResolvedValue({ status: 'PAID', message: 'Paid via MTN' });
      setup();
      await waitFor(() => expect(api.getIremboPayStatus).toHaveBeenCalled());

      fireEvent.click(screen.getByText('Invoice only'));
      fireEvent.click(screen.getByText('Create Invoice'));
      await waitFor(() => expect(screen.getByText('Re-check Invoice')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Re-check Invoice'));

      await waitFor(() =>
        expect(api.recheckIremboPayInvoice).toHaveBeenCalledWith('880519183280'),
      );
    });
  });

  describe('the retired gateway', () => {
    /** `is_active = false` is what stops it taking new money — including tests. */
    it('is not offered as a payment method', async () => {
      setup();
      await waitFor(() => expect(api.getIremboPayStatus).toHaveBeenCalled());

      expect(screen.queryByText(/IntouchPay/)).not.toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'IremboPay' })).toBeInTheDocument();
    });

    it('offers no deposit direction or balance control', async () => {
      setup();
      await waitFor(() => expect(api.getIremboPayStatus).toHaveBeenCalled());

      expect(screen.queryByText(/RequestDeposit/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Balance/i)).not.toBeInTheDocument();
    });
  });
});
