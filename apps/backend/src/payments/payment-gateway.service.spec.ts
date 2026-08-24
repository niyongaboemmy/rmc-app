import { BadRequestException } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { IremboPayProvider } from './providers/irembo-pay.provider';
import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';
import { PaymentChargeRequest, PaymentGatewayProvider } from './payment-gateway.port';

const chargeReq: PaymentChargeRequest = {
  transactionId: 'DON-abc12345-1',
  amount: 5000,
  currency: 'RWF',
  paymentTypeKey: 'DONATION',
  payer: { name: 'Test Payer', phone: '0781234567' },
};

function makeIrembo(overrides: Record<string, unknown> = {}) {
  return {
    code: PaymentMethodCode.IREMBOPAY,
    providerName: 'IremboPay',
    isConfigured: jest.fn().mockResolvedValue(true),
    charge: jest.fn().mockResolvedValue({
      provider: 'irembopay',
      status: 'PENDING',
      providerReference: 'INV-880099',
      domainReference: 'DON-abc12345-1',
      transactionId: 'DON-abc12345-1',
      responseCode: 'NEW',
      message: 'Invoice INV-880099 created',
    }),
    getStatus: jest
      .fn()
      .mockResolvedValue({ status: 'SUCCESSFUL', providerReference: 'INV-880099' }),
    ...overrides,
  } as unknown as IremboPayProvider;
}

/**
 * A second provider that is not IremboPay.
 *
 * IremboPay is currently the only real one, but every behaviour in this file is
 * about *routing* — picking one provider over another, honouring sort order,
 * refusing an inactive one. A router exercised against a single provider is a
 * router that can silently stop routing, so the cases below keep a second
 * registered even though no second gateway ships today.
 */
function makeFake(overrides: Record<string, unknown> = {}): PaymentGatewayProvider {
  return {
    code: 'FAKE_GATEWAY' as PaymentMethodCode,
    providerName: 'Fake Gateway',
    isConfigured: jest.fn().mockResolvedValue(true),
    charge: jest.fn().mockResolvedValue({
      provider: 'fake',
      status: 'PENDING',
      providerReference: 'FAKE-1',
      domainReference: 'DON-abc12345-1',
      transactionId: 'DON-abc12345-1',
    }),
    getStatus: jest.fn().mockResolvedValue({ status: 'PENDING', providerReference: 'FAKE-1' }),
    ...overrides,
  } as unknown as PaymentGatewayProvider;
}

function makeSettings(
  methods: Array<Partial<{ code: string; isActive: boolean; sortOrder: number }>>,
) {
  return { findAllMethods: jest.fn().mockResolvedValue(methods) } as never;
}

/** The service registers IremboPay itself; extra providers are registered after. */
function makeService(
  irembo: IremboPayProvider,
  settings: never,
  ...extra: PaymentGatewayProvider[]
): PaymentGatewayService {
  const service = new PaymentGatewayService(irembo, settings);
  for (const p of extra) service.register(p);
  return service;
}

const IREMBO_ACTIVE = [{ code: PaymentMethodCode.IREMBOPAY, isActive: true, sortOrder: 1 }];

describe('PaymentGatewayService', () => {
  it('routes a charge to the named provider, unchanged', async () => {
    const irembo = makeIrembo();
    const service = makeService(irembo, makeSettings(IREMBO_ACTIVE));

    const result = await service.charge(chargeReq, PaymentMethodCode.IREMBOPAY);

    expect(irembo.charge).toHaveBeenCalledWith(chargeReq);
    expect(result.provider).toBe('irembopay');
    // `domainReference` — not `providerReference` — is what the domain record
    // persists, because it is the value the callback carries back.
    expect(result.domainReference).toBe('DON-abc12345-1');
  });

  it('routes to a second registered provider when that is the one named', async () => {
    const irembo = makeIrembo();
    const fake = makeFake();
    const service = makeService(
      irembo,
      makeSettings([{ code: 'FAKE_GATEWAY', isActive: true, sortOrder: 1 }]),
      fake,
    );

    const result = await service.charge(chargeReq, 'FAKE_GATEWAY');

    expect(fake.charge).toHaveBeenCalledWith(chargeReq);
    expect(irembo.charge).not.toHaveBeenCalled();
    expect(result.provider).toBe('fake');
  });

  it('rejects an unknown method with a message naming the settings page', async () => {
    const service = makeService(makeIrembo(), makeSettings([]));

    await expect(service.charge(chargeReq, 'NOT_A_GATEWAY')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.charge(chargeReq, 'NOT_A_GATEWAY')).rejects.toThrow(
      /Admin → Settings → Payments/,
    );
  });

  it('rejects an unconfigured provider without attempting the charge', async () => {
    const irembo = makeIrembo({ isConfigured: jest.fn().mockResolvedValue(false) });
    const service = makeService(irembo, makeSettings(IREMBO_ACTIVE));

    await expect(service.charge(chargeReq, PaymentMethodCode.IREMBOPAY)).rejects.toThrow(
      /IremboPay is not configured/,
    );
    expect(irembo.charge).not.toHaveBeenCalled();
  });

  it('refuses an explicitly named method that is deactivated, even when configured', async () => {
    // Credentials stay readable while a provider is off so in-flight invoices can
    // settle after a rollback. That must not become a licence to take new money.
    const irembo = makeIrembo();
    const service = makeService(
      irembo,
      makeSettings([{ code: PaymentMethodCode.IREMBOPAY, isActive: false, sortOrder: 1 }]),
    );

    await expect(service.charge(chargeReq, PaymentMethodCode.IREMBOPAY)).rejects.toThrow(
      /IremboPay is not active/,
    );
    expect(irembo.charge).not.toHaveBeenCalled();
  });

  describe('canCharge', () => {
    /**
     * Domain services use this to decide whether a record starts PENDING or is
     * treated as already settled. A false negative therefore records money as
     * received that nobody was ever asked for — so this must reflect the whole
     * gateway, never one named provider.
     */
    it('is true when some provider is active and configured', async () => {
      const service = makeService(makeIrembo(), makeSettings(IREMBO_ACTIVE));

      await expect(service.canCharge()).resolves.toBe(true);
    });

    it('is true when the active provider is the second one, not the default', async () => {
      const service = makeService(
        makeIrembo({ isConfigured: jest.fn().mockResolvedValue(false) }),
        makeSettings([
          { code: PaymentMethodCode.IREMBOPAY, isActive: false, sortOrder: 1 },
          { code: 'FAKE_GATEWAY', isActive: true, sortOrder: 5 },
        ]),
        makeFake(),
      );

      await expect(service.canCharge()).resolves.toBe(true);
    });

    it('is false when nothing is active and configured, without throwing', async () => {
      const service = makeService(
        makeIrembo({ isConfigured: jest.fn().mockResolvedValue(false) }),
        makeSettings(IREMBO_ACTIVE),
      );

      await expect(service.canCharge()).resolves.toBe(false);
    });
  });

  it('falls back to the single active + configured method when none is given', async () => {
    const service = makeService(
      makeIrembo(),
      makeSettings([
        { code: 'CASH', isActive: true, sortOrder: 0 },
        { code: PaymentMethodCode.IREMBOPAY, isActive: true, sortOrder: 1 },
      ]),
    );

    const provider = await service.resolve();
    expect(provider.code).toBe(PaymentMethodCode.IREMBOPAY);
  });

  it('prefers the lowest sortOrder when several providers are active and configured', async () => {
    const service = makeService(
      makeIrembo(),
      makeSettings([
        { code: PaymentMethodCode.IREMBOPAY, isActive: true, sortOrder: 9 },
        { code: 'FAKE_GATEWAY', isActive: true, sortOrder: 2 },
      ]),
      makeFake(),
    );

    const provider = await service.resolve();
    expect(provider.code).toBe('FAKE_GATEWAY');
  });

  it('skips a lower-sortOrder provider that is not configured and takes the next one', async () => {
    const service = makeService(
      makeIrembo(),
      makeSettings([
        { code: PaymentMethodCode.IREMBOPAY, isActive: true, sortOrder: 9 },
        { code: 'FAKE_GATEWAY', isActive: true, sortOrder: 2 },
      ]),
      makeFake({ isConfigured: jest.fn().mockResolvedValue(false) }),
    );

    const provider = await service.resolve();
    expect(provider.code).toBe(PaymentMethodCode.IREMBOPAY);
  });

  it('throws when no active method has a configured provider', async () => {
    const service = makeService(
      makeIrembo({ isConfigured: jest.fn().mockResolvedValue(false) }),
      makeSettings([{ code: PaymentMethodCode.IREMBOPAY, isActive: true, sortOrder: 0 }]),
    );

    await expect(service.resolve()).rejects.toThrow(/No payment gateway is active and configured/);
  });

  it('skips inactive methods during fallback resolution', async () => {
    const irembo = makeIrembo();
    const service = makeService(
      irembo,
      makeSettings([{ code: PaymentMethodCode.IREMBOPAY, isActive: false, sortOrder: 0 }]),
    );

    await expect(service.resolve()).rejects.toThrow(/No payment gateway is active and configured/);
    expect(irembo.isConfigured).not.toHaveBeenCalled();
  });

  it('registers only the real provider by default', () => {
    const service = makeService(makeIrembo(), makeSettings([]));
    expect(service.listProviders()).toEqual([PaymentMethodCode.IREMBOPAY]);
  });

  it('resolves a status through the port for the active provider', async () => {
    const irembo = makeIrembo();
    const service = makeService(irembo, makeSettings(IREMBO_ACTIVE));

    const result = await service.getStatus('DON-abc12345-1');

    expect(irembo.getStatus).toHaveBeenCalledWith('DON-abc12345-1');
    expect(result.status).toBe('SUCCESSFUL');
  });
});
