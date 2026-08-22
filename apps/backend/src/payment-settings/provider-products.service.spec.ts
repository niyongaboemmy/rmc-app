import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProviderProductsService } from './provider-products.service';
import { PaymentTypeProviderProduct } from './entities/payment-type-provider-product.entity';

const TYPE = { id: 'type-1', key: 'MARRIAGE_FEE', name: 'Marriage Fees', amount: null };
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
  const repo = {
    find: jest.fn().mockResolvedValue(opts.mappings ?? []),
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
        service.resolveForCharge('irembopay', 'MARRIAGE_FEE', 'rate-1'),
      ).resolves.toMatchObject({ productCode: 'PI-RATE' });
    });

    /**
     * A rate without its own mapping still charges: admins only need to map
     * every rate when the rates genuinely bill as different products.
     */
    it('falls back to the type default for an unmapped rate', async () => {
      const { service } = build({ mappings: [mapping()] });

      await expect(
        service.resolveForCharge('irembopay', 'MARRIAGE_FEE', 'rate-99'),
      ).resolves.toMatchObject({ productCode: 'PI-TYPE-DEFAULT' });
    });

    it('uses the type default when the charge names no rate', async () => {
      const { service } = build({ mappings: [mapping()] });

      await expect(service.resolveForCharge('irembopay', 'MARRIAGE_FEE')).resolves.toMatchObject({
        productCode: 'PI-TYPE-DEFAULT',
      });
    });

    it('carries a per-mapping account override through', async () => {
      const { service } = build({
        mappings: [mapping({ paymentAccountIdentifier: 'TST-USD' })],
      });

      await expect(service.resolveForCharge('irembopay', 'MARRIAGE_FEE')).resolves.toMatchObject({
        paymentAccountIdentifier: 'TST-USD',
      });
    });

    /** An actionable error: the admin can fix this, a generic 500 only makes a ticket. */
    it('names the Products tab when nothing is mapped', async () => {
      const { service } = build({ mappings: [] });

      await expect(service.resolveForCharge('irembopay', 'MARRIAGE_FEE')).rejects.toThrow(
        /Products/,
      );
      await expect(service.resolveForCharge('irembopay', 'MARRIAGE_FEE')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('mentions the rate when one was requested but nothing matched', async () => {
      const { service } = build({ mappings: [] });

      await expect(service.resolveForCharge('irembopay', 'MARRIAGE_FEE', 'rate-1')).rejects.toThrow(
        /selected rate/,
      );
    });

    it('rejects a payment type that does not exist, naming Payment Types', async () => {
      const { service } = build({ type: null });

      await expect(service.resolveForCharge('irembopay', 'NOPE')).rejects.toThrow(/Payment Types/);
    });

    it('never returns another provider’s mapping', async () => {
      const { service, repo } = build({ mappings: [] });

      await expect(service.resolveForCharge('irembopay', 'MARRIAGE_FEE')).rejects.toThrow();
      expect(repo.find).toHaveBeenCalledWith({
        where: { provider: 'irembopay', paymentTypeId: 'type-1' },
      });
    });
  });

  describe('listRows', () => {
    it('flags an unmapped type and lists its rates beneath it', async () => {
      const { service } = build({ mappings: [], types: [TYPE], rates: [RATE] });

      const rows = await service.listRows('irembopay');

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ paymentTypeRateId: null, unmapped: true });
      expect(rows[1]).toMatchObject({ paymentTypeRateId: 'rate-1', rateName: 'Outside Mosque' });
    });

    /** A rate inherits the type default, so it is not "unmapped" in practice. */
    it('does not flag a rate as unmapped when the type has a default', async () => {
      const { service } = build({ mappings: [mapping()], types: [TYPE], rates: [RATE] });

      const rows = await service.listRows('irembopay');

      expect(rows[0].unmapped).toBe(false);
      expect(rows[1].unmapped).toBe(false);
    });

    it('shows a rate-specific product code on its own row', async () => {
      const { service } = build({
        mappings: [mapping({ paymentTypeRateId: 'rate-1', productCode: 'PI-RATE' })],
        types: [TYPE],
        rates: [RATE],
      });

      const rows = await service.listRows('irembopay');

      expect(rows[1]).toMatchObject({ productCode: 'PI-RATE', unmapped: false });
      // The type itself still has no default of its own.
      expect(rows[0]).toMatchObject({ productCode: null, unmapped: true });
    });
  });

  describe('upsert', () => {
    it('creates a type-level mapping and trims the product code', async () => {
      const { service, repo } = build();

      await service.upsert('irembopay', {
        paymentTypeId: 'type-1',
        productCode: '  PI-ABC  ',
      });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ productCode: 'PI-ABC', paymentAccountIdentifier: null }),
      );
    });

    it('updates the existing mapping rather than adding a second', async () => {
      const { service, repo } = build();
      repo.findOne.mockResolvedValue(mapping());

      await service.upsert('irembopay', { paymentTypeId: 'type-1', productCode: 'PI-NEW' });

      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ productCode: 'PI-NEW' }));
    });

    it('rejects an unknown payment type', async () => {
      const { service } = build({ type: null });

      await expect(
        service.upsert('irembopay', { paymentTypeId: 'nope', productCode: 'PI-X' }),
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
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
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
