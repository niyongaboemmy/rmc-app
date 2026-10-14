import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PaymentType } from './entities/payment-type.entity';
import { PaymentTypeRate } from './entities/payment-type-rate.entity';
import {
  PROVIDER_CURRENCIES,
  PaymentTypeProviderProduct,
  ProviderEnvironment,
} from './entities/payment-type-provider-product.entity';

/** Which merchant and currency a charge, or a Products-tab view, is about. */
export interface ProductScope {
  environment: ProviderEnvironment;
  currency: string;
}

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
  /** Mapping row id, for deleting it. Null when unmapped. */
  mappingId: string | null;
  currency: string;
  environment: ProviderEnvironment;
  paymentTypeActive: boolean;
  rateCode: string | null;
  rateName: string | null;
  amount: number | null;
  productCode: string | null;
  paymentAccountIdentifier: string | null;
  /**
   * True when an RWF charge for this row would fail for want of a product code.
   * USD/EUR rows are never flagged: most services are simply not sold in those
   * currencies, and an empty cell there means "not offered", not "broken".
   */
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
   * Only mappings for the charge's merchant (environment) and currency are
   * candidates. Within those, a rate-specific mapping wins; failing that the
   * type's default mapping (the row with a null rate id) is used, so an admin
   * need only map every rate when the rates genuinely bill as different
   * products.
   *
   * There is deliberately no fallback across currencies or environments: a
   * Sadaqat_RWF code on a EUR invoice, or a sandbox code on production, is
   * refused by IremboPay at best and mis-reported at worst.
   */
  async resolveForCharge(
    provider: string,
    paymentTypeKey: string,
    scope: ProductScope & { rateId?: string },
  ): Promise<ResolvedProduct> {
    const type = await this.typeRepo.findOne({ where: { key: paymentTypeKey as never } });
    if (!type) {
      throw new BadRequestException(
        `Payment type "${paymentTypeKey}" does not exist. Add it in Admin → Settings → Payments → Payment Types.`,
      );
    }

    const currency = scope.currency.trim().toUpperCase();
    const candidates = await this.repo.find({
      where: { provider, paymentTypeId: type.id, environment: scope.environment, currency },
    });

    const match =
      (scope.rateId && candidates.find((c) => c.paymentTypeRateId === scope.rateId)) ||
      candidates.find((c) => c.paymentTypeRateId === null);

    if (!match) {
      throw new BadRequestException(
        `No ${provider} product is mapped to "${type.name}" (${paymentTypeKey})` +
          (scope.rateId ? ' or the selected rate' : '') +
          ` in ${currency} on ${scope.environment}. Map it in Admin → Settings → Payments → Products.`,
      );
    }

    return {
      productCode: match.productCode,
      paymentAccountIdentifier: match.paymentAccountIdentifier,
    };
  }

  /**
   * Every payment type and rate for one merchant, with its mapping where one
   * exists — one row per type × currency, plus the type's rates under RWF
   * (rates are priced in RWF, so a per-rate USD/EUR product has no meaning).
   */
  async listRows(
    provider: string,
    environment: ProviderEnvironment,
  ): Promise<ProviderProductRow[]> {
    const [types, rates, mappings] = await Promise.all([
      this.typeRepo.find({ order: { createdAt: 'ASC' } }),
      this.rateRepo.find({ order: { sortOrder: 'ASC' } }),
      this.repo.find({ where: { provider, environment } }),
    ]);

    const find = (typeId: string, rateId: string | null, currency: string) =>
      mappings.find(
        (m) =>
          m.paymentTypeId === typeId &&
          m.paymentTypeRateId === rateId &&
          m.currency.trim().toUpperCase() === currency,
      ) ?? null;

    const rows: ProviderProductRow[] = [];

    for (const type of types) {
      for (const currency of PROVIDER_CURRENCIES) {
        const typeDefault = find(type.id, null, currency);
        const base = {
          paymentTypeId: type.id,
          paymentTypeKey: type.key,
          paymentTypeName: type.name,
          paymentTypeActive: type.isActive !== false,
          currency,
          environment,
        };
        rows.push({
          ...base,
          paymentTypeRateId: null,
          mappingId: typeDefault?.id ?? null,
          rateCode: null,
          rateName: null,
          amount: currency === 'RWF' && type.amount !== null ? Number(type.amount) : null,
          productCode: typeDefault?.productCode ?? null,
          paymentAccountIdentifier: typeDefault?.paymentAccountIdentifier ?? null,
          unmapped: currency === 'RWF' && !typeDefault,
        });

        if (currency !== 'RWF') continue;

        for (const rate of rates.filter((r) => r.paymentTypeId === type.id)) {
          const mapping = find(type.id, rate.id, currency);
          rows.push({
            ...base,
            paymentTypeRateId: rate.id,
            mappingId: mapping?.id ?? null,
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
      currency?: string;
      environment: ProviderEnvironment;
    },
  ): Promise<PaymentTypeProviderProduct> {
    const currency = (input.currency ?? 'RWF').trim().toUpperCase();
    if (!(PROVIDER_CURRENCIES as readonly string[]).includes(currency)) {
      throw new BadRequestException(`Unsupported currency "${currency}"`);
    }

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
        environment: input.environment,
        currency,
      },
    });

    const record =
      existing ??
      this.repo.create({
        provider,
        paymentTypeId: input.paymentTypeId,
        paymentTypeRateId: rateId,
        environment: input.environment,
        currency,
      });

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
