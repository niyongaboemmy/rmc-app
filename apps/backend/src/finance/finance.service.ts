import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Donation } from '../donations/entities/donation.entity';
import { txnRef } from '../donations/donations.service';
import { parseDonationMeta } from '../donations/donation-meta';
import {
  MarriageApplication,
  PaymentStatus,
} from '../marriage/entities/marriage-application.entity';
import { toXlsxBuffer, formatDateTime } from '../common/utils/xlsx';

export interface PaymentLedgerFilters {
  /** Restrict to one side of the ledger. Empty = both. */
  source?: 'donation' | 'marriage';
  /** Matches payer, reference or detail — the same fields the admin UI searches. */
  search?: string;
  /**
   * Marriage payments are only included for a caller who may see marriage data.
   * The Finance page behaves the same way, so the export shows a given admin
   * exactly the ledger they already have on screen — no more.
   */
  includeMarriage: boolean;
}

/** Keys of the exported ledger rows, in column order. */
const PAYMENT_EXPORT_COLUMNS = [
  'Source',
  'Reference',
  'Payer',
  'Detail',
  'Amount',
  'Currency',
  'Method',
  'Status',
  'Date',
];

interface LedgerEntry {
  source: string;
  ref: string;
  payer: string;
  detail: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  date: Date;
}

/**
 * The Finance page's "Payment History" is a ledger stitched together from two
 * unrelated tables — there is no unified transactions table. This service owns
 * that join for reporting, so neither the donations nor the marriage module has
 * to know about the other.
 */
@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Donation)
    private readonly donations: Repository<Donation>,
    @InjectRepository(MarriageApplication)
    private readonly marriages: Repository<MarriageApplication>,
  ) {}

  async exportPaymentsXlsx(filters: PaymentLedgerFilters): Promise<Buffer> {
    const entries = [
      ...(filters.source === 'marriage' ? [] : await this.donationEntries()),
      ...(filters.source === 'donation' || !filters.includeMarriage
        ? []
        : await this.marriageEntries()),
    ];

    const search = filters.search?.trim().toLowerCase();
    const matched = search
      ? entries.filter(
          (e) =>
            e.payer.toLowerCase().includes(search) ||
            e.ref.toLowerCase().includes(search) ||
            e.detail.toLowerCase().includes(search),
        )
      : entries;

    // Newest first — the list's default order.
    matched.sort((a, b) => b.date.getTime() - a.date.getTime());

    const rows = matched.map((e) => ({
      Source: e.source === 'donation' ? 'Donation' : 'Marriage',
      Reference: e.ref,
      Payer: e.payer,
      Detail: e.detail,
      Amount: e.amount,
      Currency: e.currency,
      Method: e.method,
      Status: e.status,
      Date: formatDateTime(e.date),
    }));

    return toXlsxBuffer('Payment History', PAYMENT_EXPORT_COLUMNS, rows);
  }

  private async donationEntries(): Promise<LedgerEntry[]> {
    const donations = await this.donations.find({ relations: { campaign: true } });

    return donations.map((d) => {
      const meta = parseDonationMeta(d.message);
      return {
        source: 'donation',
        ref: txnRef(d.id),
        // An anonymous donor is hidden on screen; naming them in a file would leak
        // exactly what the flag exists to protect.
        payer: d.isAnonymous ? 'Anonymous' : (d.donorName?.trim() || 'Unknown'),
        detail: d.campaign?.title ?? (meta.fund ? `General Fund (${meta.fund})` : 'General Fund'),
        amount: Number(d.amount),
        currency: d.currency,
        method: d.paymentMethod ?? '',
        status: d.status,
        date: d.donatedAt,
      };
    });
  }

  private async marriageEntries(): Promise<LedgerEntry[]> {
    const applications = await this.marriages.find();

    return applications
      // Only applications money has actually moved on — an unpaid application is
      // not a payment, and listing it would inflate the ledger. Mirrors the UI.
      .filter(
        (a) => Number(a.amountPaid) > 0 || a.paymentStatus === PaymentStatus.PROCESSING,
      )
      .map((a) => ({
        source: 'marriage',
        ref: a.applicationNumber,
        payer: `${a.groomName} & ${a.brideName}`,
        detail: 'Marriage service',
        amount: Number(a.amountPaid) || Number(a.amountDue),
        currency: 'RWF',
        method: a.paymentMethod ?? '',
        status: a.paymentStatus,
        date: a.updatedAt ?? a.createdAt,
      }));
  }
}
