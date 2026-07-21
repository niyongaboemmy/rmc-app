import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index,
} from 'typeorm';

import { type HajjCurrency } from './hajj-requirement.entity';

/**
 * A bank account an applicant pays the Hajj fees into, shown on the public Hajj
 * page. Admin-managed (Content → Hajj Bank Accounts): add / edit / remove /
 * reorder / hide, exactly like hajj_requirements.
 *
 * There is deliberately more than one: a fee can be quoted in RWF or USD, and
 * each currency needs its own account.
 */
@Entity('hajj_bank_accounts')
export class HajjBankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 120 })
  bankName: string;

  /** The account holder — RMC, not the applicant. */
  @Column({ name: 'account_name', type: 'varchar', length: 120 })
  accountName: string;

  @Column({ name: 'account_number', type: 'varchar', length: 50 })
  accountNumber: string;

  /** Which fees this account takes. Matches the requirement's currency. */
  @Column({ type: 'varchar', length: 3, default: 'RWF' })
  currency: HajjCurrency;

  /** Needed to wire money in from abroad; blank for a purely local account. */
  @Column({ name: 'swift_code', type: 'varchar', length: 20, nullable: true })
  swiftCode: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  branch: string | null;

  @Index('IDX_hajj_bank_account_sort')
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
