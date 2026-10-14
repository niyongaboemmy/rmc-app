import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProviderProductsService } from './provider-products.service';
import { PaymentTypeProviderProduct } from './entities/payment-type-provider-product.entity';

const TYPE = {
  id: 'type-1',
  key: 'MARRIAGE_FEE',
  name: 'Marriage Fees',
  amount: null,
  isActive: true,
};
const SBX = { currency: 'RWF', environment: 'sandbox' as const };
const RATE = {
  id: 'rate-1',
  paymentTypeId: 'type-1',
  code: 'OUTSIDE',
  name: 'Outside Mosque',
  amount: 200000,
  sortOrder: 0,
};

function mapping(overrides: Partial<PaymentTypeProviderProduct> = {}): PaymentTypeProviderProduct {
  return {
    id: 'map-1',
    provider: 'irembopay',
    paymentTypeId: 'type-1',
    paymentTypeRateId: null,
    productCode: 'PI-TYPE-DEFAULT',
    paymentAccountIdentifier: null,
    currency: 'RWF',
    environment: 'sandbox',
    ...overrides,
  } as PaymentTypeProviderProduct;
}

function build(
  opts: {
    mappings?: PaymentTypeProviderProduct[];
    type?: unknown;
    types?: unknown[];
    rates?: unknown[];
  } = {},
) {
  // Applies the `where` the service passes, so a test proves the filter rather
  // than trusting a mock that returns everything.
  const all = opts.mappings ?? [];
  const repo = {
    find: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
      all.filter((m) =>
        Object.entries(where).every(([k, v]) => (m as unknown as Record<string, unknown>)[k] === v),
      ),
    ),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: unknown) => v),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const typeRepo = {
    findOne: jest.fn().mockResolvedValue(opts.type === undefined ? TYPE : opts.type),
    find: jest.fn().mockResolvedValue(opts.types ?? [TYPE]),
  };
  const rateRepo = {
    findOne: jest.fn().mockResolvedValue(RATE),
    find: jest.fn().mockResolvedValue(opts.rates ?? []),
  };

  return {
    service: new ProviderProductsService(repo as never, typeRepo as never, rateRepo as never),
    repo,
    typeRepo,
    rateRepo,
  };
}

describe('ProviderProductsService', () => {
  describe('resolveForCharge', () => {
    it('prefers a rate-specific mapping over the type default', async () => {
      const { service } = build({
        mappings: [
          mapping(),
          mapping({ id: 'map-2', paymentTypeRateId: 'rate-1', productCode: 'PI-RATE' }),
        ],
      });

      await expect(
        service.resolveForCharge('irembopay', 'MARRIAGE_FEE', { ...SBX, rateId: 'rate-1' }),
      ).resolves.toMatchObject({ productCode: 'PI-RATE' });
    });

    /**
     * A rate without its own mapping still charges: admins only need to map
     * every rate when the rates genuinely bill as different products.
     */
    it('falls back to the type default for an unmapped rate', async () => {
      const { service } = build({ mappings: [mapping()] });

      await expect(
        service.resolveForCharge('irembopay', 'MARRIAGE_FEE', { ...SBX, rateId: 'rate-99' }),
      ).resolves.toMatchObject({ productCode: 'PI-TYPE-DEFAULT' });
    });

    it('uses the type default when the charge names no rate', async () => {
      const { service } = build({ mappings: [mapping()] });

      await expect(
        service.resolveForCharge('irembopay', 'MARRIAGE_FEE', SBX),
      ).resolves.toMatchObject({
        productCode: 'PI-TYPE-DEFAULT',
      });
    });

    it('carries a per-mapping account override through', async () => {
      const { service } = build({
        mappings: [mapping({ paymentAccountIdentifier: 'TST-USD' })],
      });

      await expect(
        service.resolveForCharge('irembopay', 'MARRIAGE_FEE', SBX),
      ).resolves.toMatchObject({
        paymentAccountIdentifier: 'TST-USD',
      });
    });

    /** An actionable error: the admin can fix this, a generic 500 only makes a ticket. */
    it('names the Products tab when nothing is mapped', async () => {
      const { service } = build({ mappings: [] });

      await expect(service.resolveForCharge('irembopay', 'MARRIAGE_FEE', SBX)).rejects.toThrow(
        /Products/,
      );
      await expect(
        service.resolveForCharge('irembopay', 'MARRIAGE_FEE', SBX),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('mentions the rate when one was requested but nothing matched', async () => {
      const { service } = build({ mappings: [] });

      await expect(
        service.resolveForCharge('irembopay', 'MARRIAGE_FEE', { ...SBX, rateId: 'rate-1' }),
      ).rejects.toThrow(/selected rate/);
    });

    it('rejects a payment type that does not exist, naming Payment Types', async () => {
      const { service } = build({ type: null });

      await expect(service.resolveForCharge('irembopay', 'NOPE', SBX)).rejects.toThrow(
        /Payment Types/,
      );
    });

    it('never returns another provider’s mapping', async () => {
      const { service, repo } = build({ mappings: [] });

      await expect(service.resolveForCharge('irembopay', 'MARRIAGE_FEE', SBX)).rejects.toThrow();
      expect(repo.find).toHaveBeenCalledWith({
        where: {
          provider: 'irembopay',
          paymentTypeId: 'type-1',
          environment: 'sandbox',
          currency: 'RWF',
        },
      });
    });

    describe('currency and environment scope', () => {
      const PROD = [
        mapping({ id: 'p-rwf', environment: 'production', productCode: 'PC-RWF' }),
        mapping({ id: 'p-usd', environment: 'production', currency: 'USD', productCode: 'PC-USD' }),
        mapping({ id: 'p-eur', environment: 'production', currency: 'EUR', productCode: 'PC-EUR' }),
        mapping({ id: 's-rwf', productCode: 'PC-SANDBOX' }),
      ];

      it.each([
        ['RWF', 'PC-RWF'],
        ['USD', 'PC-USD'],
        ['EUR', 'PC-EUR'],
      ])('picks the %s product on production', async (currency, code) => {
        const { service } = build({ mappings: PROD });

        await expect(
          service.resolveForCharge('irembopay', 'MARRIAGE_FEE', {
            currency,
            environment: 'production',
          }),
        ).resolves.toMatchObject({ productCode: code });
      });

      it('accepts a lower-case currency', async () => {
        const { service } = build({ mappings: PROD });

        await expect(
          service.resolveForCharge('irembopay', 'MARRIAGE_FEE', {
            currency: 'eur',
            environment: 'production',
          }),
        ).resolves.toMatchObject({ productCode: 'PC-EUR' });
      });

      /** The bug from b1d3aee: a sandbox code sent to the live merchant. */
      it('never falls back from production to a sandbox mapping', async () => {
        const { service } = build({ mappings: [mapping({ productCode: 'PC-SANDBOX' })] });

        await expect(
          service.resolveForCharge('irembopay', 'MARRIAGE_FEE', {
            currency: 'RWF',
            environment: 'production',
          }),
        ).rejects.toThrow(/in RWF on production/);
      });

      it('keeps returning the sandbox code in sandbox mode', async () => {
        const { service } = build({ mappings: PROD });

        await expect(
          service.resolveForCharge('irembopay', 'MARRIAGE_FEE', SBX),
        ).resolves.toMatchObject({ productCode: 'PC-SANDBOX' });
      });

      /** A Sadaqat_RWF code on a EUR invoice is refused, not guessed. */
      it('never falls back to another currency', async () => {
        const { service } = build({
          mappings: [mapping({ environment: 'production', productCode: 'PC-RWF' })],
        });

        await expect(
          service.resolveForCharge('irembopay', 'MARRIAGE_FEE', {
            currency: 'EUR',
            environment: 'production',
          }),
        ).rejects.toThrow(/in EUR on production/);
      });
    });
  });

  describe('listRows', () => {
    it('flags an unmapped type and lists its rates beneath it', async () => {
      const { service } = build({ mappings: [], types: [TYPE], rates: [RATE] });

      const rows = await service.listRows('irembopay', 'sandbox');

      // RWF default + its rate, then USD and EUR defaults (rates are RWF-priced).
      expect(rows.map((r) => [r.currency, r.paymentTypeRateId])).toEqual([
        ['RWF', null],
        ['RWF', 'rate-1'],
        ['USD', null],
        ['EUR', null],
      ]);
      expect(rows[0]).toMatchObject({ paymentTypeRateId: null, unmapped: true });
      expect(rows[1]).toMatchObject({ paymentTypeRateId: 'rate-1', rateName: 'Outside Mosque' });
    });

    /** A rate inherits the type default, so it is not "unmapped" in practice. */
    it('does not flag a rate as unmapped when the type has a default', async () => {
      const { service } = build({ mappings: [mapping()], types: [TYPE], rates: [RATE] });

      const rows = await service.listRows('irembopay', 'sandbox');

      expect(rows[0].unmapped).toBe(false);
      expect(rows[1].unmapped).toBe(false);
    });

    it('shows a rate-specific product code on its own row', async () => {
      const { service } = build({
        mappings: [mapping({ paymentTypeRateId: 'rate-1', productCode: 'PI-RATE' })],
        types: [TYPE],
        rates: [RATE],
      });

      const rows = await service.listRows('irembopay', 'sandbox');

      expect(rows[1]).toMatchObject({ productCode: 'PI-RATE', unmapped: false });
      // The type itself still has no default of its own.
      expect(rows[0]).toMatchObject({ productCode: null, unmapped: true });
    });

    /** Most services are RWF-only — an empty USD cell means "not offered". */
    it('never flags USD or EUR rows as unmapped', async () => {
      const { service } = build({ mappings: [], types: [TYPE], rates: [] });

      const rows = await service.listRows('irembopay', 'sandbox');

      expect(rows.filter((r) => r.currency !== 'RWF').every((r) => !r.unmapped)).toBe(true);
    });

    it('only shows mappings of the requested environment', async () => {
      const { service, repo } = build({
        mappings: [mapping({ environment: 'production', productCode: 'PC-LIVE' })],
        types: [TYPE],
      });

      const sandbox = await service.listRows('irembopay', 'sandbox');
      expect(sandbox[0]).toMatchObject({ productCode: null, unmapped: true });
      expect(repo.find).toHaveBeenCalledWith({
        where: { provider: 'irembopay', environment: 'sandbox' },
      });

      const production = await service.listRows('irembopay', 'production');
      expect(production[0]).toMatchObject({
        productCode: 'PC-LIVE',
        environment: 'production',
        mappingId: 'map-1',
      });
    });

    it('places a EUR mapping on the EUR row only', async () => {
      const { service } = build({
        mappings: [mapping({ currency: 'EUR', productCode: 'PC-EUR' })],
        types: [TYPE],
      });

      const rows = await service.listRows('irembopay', 'sandbox');

      expect(rows.find((r) => r.currency === 'EUR')?.productCode).toBe('PC-EUR');
      expect(rows.find((r) => r.currency === 'RWF')?.productCode).toBeNull();
    });
  });

  describe('upsert', () => {
    it('creates a type-level mapping and trims the product code', async () => {
      const { service, repo } = build();

      await service.upsert('irembopay', {
        paymentTypeId: 'type-1',
        productCode: '  PI-ABC  ',
        environment: 'sandbox',
      });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ productCode: 'PI-ABC', paymentAccountIdentifier: null }),
      );
    });

    it('updates the existing mapping rather than adding a second', async () => {
      const { service, repo } = build();
      repo.findOne.mockResolvedValue(mapping());

      await service.upsert('irembopay', {
        paymentTypeId: 'type-1',
        productCode: 'PI-NEW',
        environment: 'sandbox',
      });

      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ productCode: 'PI-NEW' }));
    });

    it('rejects an unknown payment type', async () => {
      const { service } = build({ type: null });

      await expect(
        service.upsert('irembopay', {
          paymentTypeId: 'nope',
          productCode: 'PI-X',
          environment: 'sandbox',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a rate that belongs to a different type', async () => {
      const { service, rateRepo } = build();
      rateRepo.findOne.mockResolvedValue(null);

      await expect(
        service.upsert('irembopay', {
          paymentTypeId: 'type-1',
          paymentTypeRateId: 'rate-of-other-type',
          productCode: 'PI-X',
          environment: 'sandbox',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('looks up and creates within the given environment and currency', async () => {
      const { service, repo } = build();

      await service.upsert('irembopay', {
        paymentTypeId: 'type-1',
        productCode: 'PC-EUR',
        currency: 'eur',
        environment: 'production',
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ environment: 'production', currency: 'EUR' }),
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ environment: 'production', currency: 'EUR' }),
      );
    });

    it('rejects a currency RMC has no account for', async () => {
      const { service } = build();

      await expect(
        service.upsert('irembopay', {
          paymentTypeId: 'type-1',
          productCode: 'PC-GBP',
          currency: 'GBP',
          environment: 'production',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('refuses to delete a mapping belonging to another provider', async () => {
      const { service, repo } = build();
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('irembopay', 'map-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('deletes a mapping it owns', async () => {
      const { service, repo } = build();
      repo.findOne.mockResolvedValue(mapping());

      await service.remove('irembopay', 'map-1');

      expect(repo.remove).toHaveBeenCalled();
    });
  });
});
