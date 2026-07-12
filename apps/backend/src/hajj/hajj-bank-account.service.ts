import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { HajjBankAccount } from './entities/hajj-bank-account.entity';
import { CreateHajjBankAccountDto } from './dto/create-hajj-bank-account.dto';
import { UpdateHajjBankAccountDto } from './dto/update-hajj-bank-account.dto';

/**
 * CMS for the bank accounts shown on the public Hajj page — the accounts an
 * applicant pays the fees into. Mirrors HajjRequirementService: an ordered,
 * activatable, soft-deletable collection.
 */
@Injectable()
export class HajjBankAccountService {
  constructor(
    @InjectRepository(HajjBankAccount)
    private readonly accounts: Repository<HajjBankAccount>,
  ) {}

  /** All accounts ordered; `activeOnly` restricts to what the public page shows. */
  async findAll(activeOnly = false): Promise<HajjBankAccount[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.accounts.find({ where, order: { sortOrder: 'ASC' } });
  }

  async findAllDto(activeOnly = false) {
    return (await this.findAll(activeOnly)).map((a) => this.toDto(a));
  }

  async create(dto: CreateHajjBankAccountDto) {
    const max = await this.accounts
      .createQueryBuilder('a')
      .select('MAX(a.sort_order)', 'm')
      .getRawOne<{ m: number | null }>();

    const entity = this.accounts.create({
      bankName: dto.bankName,
      accountName: dto.accountName,
      accountNumber: dto.accountNumber,
      currency: dto.currency ?? 'RWF',
      swiftCode: dto.swiftCode || null,
      branch: dto.branch || null,
      sortOrder: dto.sortOrder ?? Number(max?.m ?? -1) + 1,
      isActive: dto.isActive ?? true,
    });
    return this.toDto(await this.accounts.save(entity));
  }

  async update(id: string, dto: UpdateHajjBankAccountDto) {
    const account = await this.get(id);
    Object.assign(account, {
      bankName: dto.bankName ?? account.bankName,
      accountName: dto.accountName ?? account.accountName,
      accountNumber: dto.accountNumber ?? account.accountNumber,
      currency: dto.currency ?? account.currency,
      // swiftCode and branch are nullable — `undefined` means "unchanged", but
      // an explicit null (or blank) means "clear it", so no ?? shorthand.
      swiftCode: dto.swiftCode !== undefined ? dto.swiftCode || null : account.swiftCode,
      branch: dto.branch !== undefined ? dto.branch || null : account.branch,
      sortOrder: dto.sortOrder ?? account.sortOrder,
      isActive: dto.isActive ?? account.isActive,
    });
    return this.toDto(await this.accounts.save(account));
  }

  async remove(id: string) {
    const account = await this.get(id);
    await this.accounts.softRemove(account);
    return { id, deleted: true };
  }

  async reorder(ids: string[]) {
    const rows = await this.accounts.find({ where: { id: In(ids) } });
    const byId = new Map(rows.map((a) => [a.id, a]));
    const updated: HajjBankAccount[] = [];
    ids.forEach((id, index) => {
      const row = byId.get(id);
      if (row) {
        row.sortOrder = index;
        updated.push(row);
      }
    });
    await this.accounts.save(updated);
    return this.findAllDto(false);
  }

  private async get(id: string): Promise<HajjBankAccount> {
    const account = await this.accounts.findOne({ where: { id } });
    if (!account) throw new NotFoundException('Bank account not found');
    return account;
  }

  toDto(a: HajjBankAccount) {
    return {
      id: a.id,
      bankName: a.bankName,
      accountName: a.accountName,
      accountNumber: a.accountNumber,
      currency: a.currency,
      swiftCode: a.swiftCode ?? undefined,
      branch: a.branch ?? undefined,
      sortOrder: a.sortOrder,
      isActive: a.isActive,
    };
  }
}
