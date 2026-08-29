import 'reflect-metadata';
import { PATH_METADATA } from '@nestjs/common/constants';
import { WebhooksController } from '../webhooks/webhooks.controller';
import { PaymentSettingsController } from '../payment-settings/payment-settings.controller';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';

/** Route paths declared on a controller class, in declaration order. */
function routePaths(controller: object): string[] {
  return Object.getOwnPropertyNames(controller.constructor.prototype)
    .filter((name) => name !== 'constructor')
    .map((name) =>
      Reflect.getMetadata(
        PATH_METADATA,
        (controller.constructor.prototype as Record<string, unknown>)[name] as object,
      ),
    )
    .filter((path): path is string => typeof path === 'string');
}

/**
 * The retirement is only real if the surface is actually gone. These are
 * regression guards, not behaviour tests: each one fails loudly if a merge or a
 * revert quietly puts a retired IntouchPay entry point back.
 */
describe('IntouchPay retirement', () => {
  describe('the unsigned callback route', () => {
    /**
     * `POST /webhooks/intouch-pay` was `@Public()` and unsigned, and transaction
     * ids are structurally guessable (`DON-<8 chars>-<epoch ms>`). Anything that
     * could guess one could post a fake "paid" and settle a real donation.
     * Removing it is a security fix in its own right — so it must stay removed.
     */
    it('is not mounted on the webhooks controller', () => {
      const paths = routePaths(Object.create(WebhooksController.prototype) as object);

      expect(paths).toContain('irembopay');
      expect(paths).not.toContain('intouch-pay');
    });

    it('leaves no callback handler on the payment settings service', () => {
      const proto = PaymentSettingsService.prototype as unknown as Record<string, unknown>;

      expect(proto['handleIntouchCallback']).toBeUndefined();
      expect(proto['autoTriggerTestDeposit']).toBeUndefined();
    });
  });

  /**
   * IremboPay is a collections gateway: it has no disbursement and no balance
   * API. The three routes below tested capabilities that no longer exist, so a
   * UI control calling any of them would 404 at an admin.
   */
  describe('the payout-side admin routes', () => {
    it.each(['testPayment', 'testDeposit', 'getAccountBalance', 'checkTransactionStatus'])(
      'removes %s from the payment settings service',
      (method) => {
        expect(
          (PaymentSettingsService.prototype as unknown as Record<string, unknown>)[method],
        ).toBeUndefined();
      },
    );

    it('removes the test/deposit and balance routes from the controller', () => {
      const paths = routePaths(Object.create(PaymentSettingsController.prototype) as object);

      expect(paths).not.toContain('test/deposit');
      expect(paths).not.toContain('test/payment');
      expect(paths).not.toContain('balance');
      // The transaction list is provider-neutral and survives.
      expect(paths).toContain('transactions');
    });
  });

  describe('the gateway registry', () => {
    /**
     * Removing the provider must not remove the *port*. A second gateway — or an
     * IremboPay outage fallback — has to stay a settings change rather than a
     * redeploy, which is only true while nothing collapses back to a direct
     * IremboPay dependency.
     */
    it('registers IremboPay and nothing named MOMO_INTOUCH', () => {
      const irembo = {
        code: PaymentMethodCode.IREMBOPAY,
        providerName: 'IremboPay',
        isConfigured: jest.fn(),
        charge: jest.fn(),
        getStatus: jest.fn(),
      };
      const service = new PaymentGatewayService(
        irembo as never,
        { findAllMethods: jest.fn() } as never,
      );

      expect(service.listProviders()).toEqual([PaymentMethodCode.IREMBOPAY]);
      expect(service.listProviders()).not.toContain('MOMO_INTOUCH');
    });

    it('still accepts a new provider through the port', () => {
      const irembo = {
        code: PaymentMethodCode.IREMBOPAY,
        providerName: 'IremboPay',
        isConfigured: jest.fn(),
        charge: jest.fn(),
        getStatus: jest.fn(),
      };
      const service = new PaymentGatewayService(
        irembo as never,
        { findAllMethods: jest.fn() } as never,
      );

      service.register({
        code: 'FAKE_GATEWAY' as PaymentMethodCode,
        providerName: 'Fake Gateway',
        isConfigured: jest.fn(),
        charge: jest.fn(),
        getStatus: jest.fn(),
      });

      expect(service.listProviders()).toHaveLength(2);
    });
  });

  /**
   * The vocabulary was reduced to the methods that still do something.
   *
   * `MOMO_INTOUCH` was previously kept on the theory that admin reporting joins
   * on it. It does not: `payment_transactions.payment_method_code` is a plain
   * varchar, not a foreign key, so archived rows still read back after the
   * member is gone — they render the raw code rather than a friendly label,
   * which is the whole cost.
   */
  describe('the payment method vocabulary', () => {
    it('offers IremboPay and nothing else', () => {
      expect(Object.values(PaymentMethodCode)).toEqual(['IREMBOPAY']);
    });

    it('no longer carries any of the removed methods', () => {
      const codes = Object.values(PaymentMethodCode) as string[];
      for (const gone of ['MOMO_INTOUCH', 'CARD', 'CASH', 'BANK_TRANSFER']) {
        expect(codes).not.toContain(gone);
      }
    });
  });
});
