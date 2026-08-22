import { PaymentsPublicController } from './payments-public.controller';
import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';
import { PaymentTransactionStatus } from '../payment-settings/entities/payment-transaction.entity';
import { IremboPayConfig } from '../integrations/irembo-pay/irembo-pay.config.service';

const SECRET = 'sk_test_MUST_NEVER_BE_PUBLIC';

const CONFIG: IremboPayConfig = {
  secretKey: SECRET,
  publicKey: 'pk_test_public',
  paymentAccountIdentifier: 'TST-RWF',
  paymentAccountIdentifierUsd: '',
  apiBaseUrl: 'https://api.sandbox.irembopay.com',
  widgetScriptUrl: 'https://dashboard.sandbox.irembopay.com/assets/payment/inline.js',
  apiVersion: '3',
  invoiceExpiryMinutes: 1440,
  defaultLanguage: 'EN',
  signatureToleranceSeconds: 300,
  isTestMode: true,
};

function build(opts: { resolve?: jest.Mock; tx?: unknown } = {}) {
  const gateway = {
    resolve:
      opts.resolve ??
      jest.fn().mockResolvedValue({
        code: PaymentMethodCode.IREMBOPAY,
        providerName: 'IremboPay',
      }),
  };
  const iremboConfig = { get: jest.fn().mockResolvedValue(CONFIG) };
  const txRepo = { findOne: jest.fn().mockResolvedValue(opts.tx ?? null) };

  return {
    controller: new PaymentsPublicController(
      gateway as never,
      iremboConfig as never,
      txRepo as never,
    ),
    gateway,
    txRepo,
  };
}

describe('PaymentsPublicController', () => {
  describe('config', () => {
    it('advertises the widget when IremboPay is the active provider', async () => {
      const { controller } = build();

      await expect(controller.config()).resolves.toEqual({
        provider: 'irembopay',
        supportsWidget: true,
        supportsMomoPush: true,
        publicKey: 'pk_test_public',
        widgetScriptUrl: CONFIG.widgetScriptUrl,
      });
    });

    /** This endpoint is @Public — a leaked secret key here is a merchant compromise. */
    it('never exposes the secret key', async () => {
      const { controller } = build();

      const serialised = JSON.stringify(await controller.config());

      expect(serialised).not.toContain(SECRET);
      expect(serialised).not.toContain('secretKey');
    });

    it('offers MoMo only when IntouchPay is the active provider', async () => {
      const resolve = jest
        .fn()
        .mockResolvedValue({ code: PaymentMethodCode.MOMO_INTOUCH, providerName: 'IntouchPay' });
      const { controller } = build({ resolve });

      await expect(controller.config()).resolves.toEqual({
        provider: 'intouchpay',
        supportsWidget: false,
        supportsMomoPush: true,
      });
    });

    it('degrades to a null provider rather than throwing at a payer', async () => {
      const resolve = jest.fn().mockRejectedValue(new Error('nothing configured'));
      const { controller } = build({ resolve });

      await expect(controller.config()).resolves.toEqual({
        provider: null,
        supportsWidget: false,
        supportsMomoPush: false,
      });
    });
  });

  describe('status', () => {
    it.each([
      [PaymentTransactionStatus.SUCCESSFUL, 'SUCCESSFUL'],
      [PaymentTransactionStatus.FAILED, 'FAILED'],
      [PaymentTransactionStatus.CANCELLED, 'FAILED'],
      [PaymentTransactionStatus.PENDING, 'PENDING'],
    ])('maps ledger status %s to %s', async (stored, expected) => {
      const { controller } = build({ tx: { id: 'x', status: stored } });

      await expect(controller.status('MAR-0001-123')).resolves.toEqual({ status: expected });
    });

    /**
     * Transaction ids are semi-guessable, so an unknown id must be
     * indistinguishable from a pending one — otherwise this endpoint becomes an
     * oracle for which applications exist.
     */
    it('reports an unknown transaction as PENDING, not as an error', async () => {
      const { controller } = build({ tx: null });

      await expect(controller.status('MAR-9999-000')).resolves.toEqual({ status: 'PENDING' });
    });

    it('returns nothing but the status — no amount, phone or payer name', async () => {
      const { controller } = build({
        tx: { id: 'x', status: PaymentTransactionStatus.SUCCESSFUL },
      });

      const result = await controller.status('MAR-0001-123');

      expect(Object.keys(result)).toEqual(['status']);
    });

    it('selects only the columns it needs from the ledger', async () => {
      const { controller, txRepo } = build({ tx: null });

      await controller.status('MAR-0001-123');

      expect(txRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ select: { id: true, status: true } }),
      );
    });
  });
});
