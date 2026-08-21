import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PaymentType } from './entities/payment-type.entity';
import { PaymentTypeRate } from './entities/payment-type-rate.entity';
import { PaymentTypeProviderProduct } from './entities/payment-type-provider-product.entity';

export interface ResolvedProduct {
  productCode: string;
  /** Null when the mapping inherits the method-level payment account. */
  paymentAccountIdentifier: string | null;
}

/** One row of the Products tab: a payment type or rate, mapped or not. */
export interface ProviderProductRow {
  paymentTypeId: string;
  paymentTypeKey: string;
  paymentTypeName: string;
  paymentTypeRateId: string | null;
  rateCode: string | null;
  rateName: string | null;
  amount: number | null;
  productCode: string | null;
  paymentAccountIdentifier: string | null;
  /** True when a charge for this row would fail for want of a product code. */
  unmapped: boolean;
}

/**
 * The mapping between our payment types/rates and a provider's own product
 * codes.
 *
 * Product codes are created by an admin in the provider's portal, differ
 * between sandbox and production, and change without notice — so they live in
 * a table the Products tab edits, never in source.
 */
@Injectable()
export class ProviderProductsService {
  constructor(
    @InjectRepository(PaymentTypeProviderProduct)
    private readonly repo: Repository<PaymentTypeProviderProduct>,
    @InjectRepository(PaymentType)
    private readonly typeRepo: Repository<PaymentType>,
    @InjectRepository(PaymentTypeRate)
    private readonly rateRepo: Repository<PaymentTypeRate>,
  ) {}

  /**
   * Resolves the product for a charge.
   *
   * A rate-specific mapping wins; failing that the type's default mapping (the
   * row with a null rate id) is used, so an admin need only map every rate when
   * the rates genuinely bill as different products.
   */
  async resolveForCharge(
    provider: string,
    paymentTypeKey: string,
    paymentTypeRateId?: string,
  ): Promise<ResolvedProduct> {
    const type = await this.typeRepo.findOne({ where: { key: paymentTypeKey as never } });
    if (!type) {
      throw new BadRequestException(
        `Payment type "${paymentTypeKey}" does not exist. Add it in Admin → Settings → Payments → Payment Types.`,
      );
    }

    const candidates = await this.repo.find({
      where: { provider, paymentTypeId: type.id },
    });

    const match =
      (paymentTypeRateId && candidates.find((c) => c.paymentTypeRateId === paymentTypeRateId)) ||
      candidates.find((c) => c.paymentTypeRateId === null);

    if (!match) {
      throw new BadRequestException(
        `No ${provider} product is mapped to "${type.name}" (${paymentTypeKey})` +
          (paymentTypeRateId ? ' or the selected rate' : '') +
          `. Map it in Admin → Settings → Payments → Products.`,
      );
    }

    return {
      productCode: match.productCode,
      paymentAccountIdentifier: match.paymentAccountIdentifier,
    };
  }

  /** Every payment type and rate, with its mapping where one exists. */
  async listRows(provider: string): Promise<ProviderProductRow[]> {
    const [types, rates, mappings] = await Promise.all([
      this.typeRepo.find({ order: { createdAt: 'ASC' } }),
      this.rateRepo.find({ order: { sortOrder: 'ASC' } }),
      this.repo.find({ where: { provider } }),
    ]);

    const find = (typeId: string, rateId: string | null) =>
      mappings.find((m) => m.paymentTypeId === typeId && m.paymentTypeRateId === rateId) ?? null;

    const rows: ProviderProductRow[] = [];

    for (const type of types) {
      const typeDefault = find(type.id, null);
      rows.push({
        paymentTypeId: type.id,
        paymentTypeKey: type.key,
        paymentTypeName: type.name,
        paymentTypeRateId: null,
        rateCode: null,
        rateName: null,
        amount: type.amount === null ? null : Number(type.amount),
        productCode: typeDefault?.productCode ?? null,
        paymentAccountIdentifier: typeDefault?.paymentAccountIdentifier ?? null,
        unmapped: !typeDefault,
      });

      for (const rate of rates.filter((r) => r.paymentTypeId === type.id)) {
        const mapping = find(type.id, rate.id);
        rows.push({
          paymentTypeId: type.id,
          paymentTypeKey: type.key,
          paymentTypeName: type.name,
          paymentTypeRateId: rate.id,
          rateCode: rate.code,
          rateName: rate.name,
          amount: Number(rate.amount),
          productCode: mapping?.productCode ?? null,
          paymentAccountIdentifier: mapping?.paymentAccountIdentifier ?? null,
          // A rate without its own mapping still charges fine via the type default.
          unmapped: !mapping && !typeDefault,
        });
      }
    }

    return rows;
  }

  async upsert(
    provider: string,
    input: {
      paymentTypeId: string;
      paymentTypeRateId?: string | null;
      productCode: string;
      paymentAccountIdentifier?: string | null;
    },
  ): Promise<PaymentTypeProviderProduct> {
    const type = await this.typeRepo.findOne({ where: { id: input.paymentTypeId } });
    if (!type) throw new NotFoundException('Payment type not found');

    const rateId = input.paymentTypeRateId ?? null;
    if (rateId) {
      const rate = await this.rateRepo.findOne({
        where: { id: rateId, paymentTypeId: input.paymentTypeId },
      });
      if (!rate) throw new NotFoundException('Rate not found on that payment type');
    }

    const existing = await this.repo.findOne({
      where: {
        provider,
        paymentTypeId: input.paymentTypeId,
        paymentTypeRateId: rateId === null ? IsNull() : rateId,
      },
    });

    const record =
      existing ??
      this.repo.create({ provider, paymentTypeId: input.paymentTypeId, paymentTypeRateId: rateId });

    record.productCode = input.productCode.trim();
    record.paymentAccountIdentifier = input.paymentAccountIdentifier?.trim() || null;

    return this.repo.save(record);
  }

  async remove(provider: string, id: string): Promise<void> {
    const record = await this.repo.findOne({ where: { id, provider } });
    if (!record) throw new NotFoundException('Product mapping not found');
    await this.repo.remove(record);
  }
}
