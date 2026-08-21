import { BadRequestException } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { IntouchPayProvider } from './providers/intouch-pay.provider';
import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';
import { PaymentChargeRequest } from './payment-gateway.port';

const chargeReq: PaymentChargeRequest = {
  transactionId: 'DON-abc12345-1',
  amount: 5000,
  currency: 'RWF',
  paymentTypeKey: 'DONATION',
  payer: { name: 'Test Payer', phone: '0781234567' },
};

function makeIntouch(overrides: Partial<IntouchPayProvider> = {}) {
  return {
    code: PaymentMethodCode.MOMO_INTOUCH,
    providerName: 'IntouchPay',
    isConfigured: jest.fn().mockResolvedValue(true),
    charge: jest.fn().mockResolvedValue({
      provider: 'intouchpay',
      status: 'PENDING',
      providerReference: 'DON-abc12345-1|GW-99',
      transactionId: 'DON-abc12345-1',
      responseCode: '1000',
      message: 'Pending',
    }),
    getStatus: jest.fn().mockResolvedValue({ status: 'SUCCESSFUL', providerReference: 'x' }),
    ...overrides,
  } as unknown as IntouchPayProvider;
}

function makeIrembo(overrides: Record<string, unknown> = {}) {
  return {
    code: PaymentMethodCode.IREMBOPAY,
    providerName: 'IremboPay',
    isConfigured: jest.fn().mockResolvedValue(false),
    charge: jest.fn(),
    getStatus: jest.fn(),
    ...overrides,
  } as never;
}

function makeSettings(
  methods: Array<Partial<{ code: string; isActive: boolean; sortOrder: number }>>,
) {
  return { findAllMethods: jest.fn().mockResolvedValue(methods) } as never;
}

describe('PaymentGatewayService', () => {
  it('routes a charge to the registered IntouchPay provider, unchanged', async () => {
    const intouch = makeIntouch();
    const service = new PaymentGatewayService(
      intouch,
      makeIrembo(),
      makeSettings([{ code: PaymentMethodCode.MOMO_INTOUCH, isActive: true, sortOrder: 1 }]),
    );

    const result = await service.charge(chargeReq, PaymentMethodCode.MOMO_INTOUCH);

    expect(intouch.charge).toHaveBeenCalledWith(chargeReq);
    expect(result.provider).toBe('intouchpay');
    // The `requestTxnId|gatewayTxnId` reference format the webhook services parse.
    expect(result.providerReference).toBe('DON-abc12345-1|GW-99');
  });

  it('rejects an unknown method with a message naming the settings page', async () => {
    const service = new PaymentGatewayService(makeIntouch(), makeIrembo(), makeSettings([]));

    await expect(service.charge(chargeReq, 'NOT_A_GATEWAY')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.charge(chargeReq, 'NOT_A_GATEWAY')).rejects.toThrow(
      /Admin → Settings → Payments/,
    );
  });

  it('rejects an unconfigured provider without attempting the charge', async () => {
    const intouch = makeIntouch({ isConfigured: jest.fn().mockResolvedValue(false) } as never);
    const service = new PaymentGatewayService(
      intouch,
      makeIrembo(),
      makeSettings([{ code: PaymentMethodCode.MOMO_INTOUCH, isActive: true, sortOrder: 1 }]),
    );

    await expect(service.charge(chargeReq, PaymentMethodCode.MOMO_INTOUCH)).rejects.toThrow(
      /IntouchPay is not configured/,
    );
    expect(intouch.charge).not.toHaveBeenCalled();
  });

  it('refuses an explicitly named method that is deactivated, even when configured', async () => {
    // Credentials stay readable while a provider is off so in-flight invoices can
    // settle after a rollback. That must not become a licence to take new money.
    const intouch = makeIntouch();
    const service = new PaymentGatewayService(
      intouch,
      makeIrembo(),
      makeSettings([{ code: PaymentMethodCode.MOMO_INTOUCH, isActive: false, sortOrder: 1 }]),
    );

    await expect(service.charge(chargeReq, PaymentMethodCode.MOMO_INTOUCH)).rejects.toThrow(
      /IntouchPay is not active/,
    );
    expect(intouch.charge).not.toHaveBeenCalled();
  });

  describe('canCharge', () => {
    /**
     * Domain services use this to decide whether a record starts PENDING or is
     * treated as already settled. A false negative therefore records money as
     * received that nobody was ever asked for — so this must reflect the whole
     * gateway, never one named provider.
     */
    it('is true when some provider is active and configured', async () => {
      const service = new PaymentGatewayService(
        makeIntouch(),
        makeIrembo(),
        makeSettings([{ code: PaymentMethodCode.MOMO_INTOUCH, isActive: true, sortOrder: 1 }]),
      );

      await expect(service.canCharge()).resolves.toBe(true);
    });

    it('is true when the active provider is IremboPay rather than IntouchPay', async () => {
      const service = new PaymentGatewayService(
        makeIntouch({ isConfigured: jest.fn().mockResolvedValue(false) } as never),
        makeIrembo({ isConfigured: jest.fn().mockResolvedValue(true) }),
        makeSettings([
          { code: PaymentMethodCode.MOMO_INTOUCH, isActive: false, sortOrder: 1 },
          { code: PaymentMethodCode.IREMBOPAY, isActive: true, sortOrder: 5 },
        ]),
      );

      await expect(service.canCharge()).resolves.toBe(true);
    });

    it('is false when nothing is active and configured, without throwing', async () => {
      const service = new PaymentGatewayService(
        makeIntouch({ isConfigured: jest.fn().mockResolvedValue(false) } as never),
        makeIrembo(),
        makeSettings([{ code: PaymentMethodCode.MOMO_INTOUCH, isActive: true, sortOrder: 1 }]),
      );

      await expect(service.canCharge()).resolves.toBe(false);
    });
  });

  it('falls back to the single active + configured method when none is given', async () => {
    const intouch = makeIntouch();
    const service = new PaymentGatewayService(
      intouch,
      makeIrembo(),
      makeSettings([
        { code: 'CASH', isActive: true, sortOrder: 0 },
        { code: PaymentMethodCode.MOMO_INTOUCH, isActive: true, sortOrder: 1 },
      ]),
    );

    const provider = await service.resolve();
    expect(provider.code).toBe(PaymentMethodCode.MOMO_INTOUCH);
  });

  it('throws when no active method has a configured provider', async () => {
    const intouch = makeIntouch({ isConfigured: jest.fn().mockResolvedValue(false) } as never);
    const service = new PaymentGatewayService(
      intouch,
      makeIrembo(),
      makeSettings([{ code: PaymentMethodCode.MOMO_INTOUCH, isActive: true, sortOrder: 0 }]),
    );

    await expect(service.resolve()).rejects.toThrow(/No payment gateway is active and configured/);
  });

  it('skips inactive methods during fallback resolution', async () => {
    const intouch = makeIntouch();
    const service = new PaymentGatewayService(
      intouch,
      makeIrembo(),
      makeSettings([{ code: PaymentMethodCode.MOMO_INTOUCH, isActive: false, sortOrder: 0 }]),
    );

    await expect(service.resolve()).rejects.toThrow(/No payment gateway is active and configured/);
    expect(intouch.isConfigured).not.toHaveBeenCalled();
  });
});
