import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Not, IsNull } from 'typeorm';
import { Donation, DonationStatus, DonationFrequency } from './entities/donation.entity';
import { DonationCampaign, CampaignStatus } from './entities/donation-campaign.entity';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { IntouchPayService } from '../integrations/intouch-pay/intouch-pay.service';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { PaymentMethodCode } from '../payment-settings/entities/payment-method.entity';
import { SmsService } from '../integrations/sms/sms.service';
import { DonationSmsTemplates } from './donation-sms-templates';
import { parseDonationMeta } from './donation-meta';
import { toXlsxBuffer, formatDateTime } from '../common/utils/xlsx';

export interface DonationFilters {
  dateFrom?: string;
  dateTo?: string;
  campaignId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  /** Structured metadata carried in `message` (see donationMeta on the frontend). */
  category?: string;
  niyyah?: string;
  /** Real column, unlike the two above. */
  method?: string;
}

/** Keys of the exported donation rows, in column order. */
const DONATION_EXPORT_COLUMNS = [
  'Transaction Ref',
  'Date',
  'Donor',
  'Donor Email',
  'Donor Phone',
  'Anonymous',
  'Fund',
  'Category',
  'Intention',
  'Amount',
  'Currency',
  'Method',
  'Status',
  'Frequency',
  'Payment Reference',
];

/**
 * Match one `key:value` segment of the pipe-delimited metadata packed into a
 * donation's `message` ("niyyah:sadaqah|category:charity").
 *
 * A plain LIKE '%category:charity%' would also match "category:charity2", so this
 * anchors on the segment boundary. Values are restricted to the same charset the
 * writer uses; anything else can't be a real key and is made to match nothing
 * rather than being interpolated into a regex.
 */
function metaSegmentRegex(key: 'category' | 'niyyah', value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return '(?!)';
  return `(^|\\|)${key}:${value}(\\||$)`;
}

/** The short reference the admin UI shows for a donation — keep the two in step. */
export function txnRef(id: string): string {
  return `TXN-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

/** Whitelist of sortable columns for the admin donations list. */
const DONATION_SORT_COLUMNS: Record<string, string> = {
  date: 'donation.donatedAt',
  amount: 'donation.amount',
  donor: 'donation.donorName',
  status: 'donation.status',
};

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private readonly donations: Repository<Donation>,
    @InjectRepository(DonationCampaign)
    private readonly campaigns: Repository<DonationCampaign>,
    private readonly intouchPay: IntouchPayService,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
  ) {}

  // ── Public ───────────────────────────────────────────────────────────────

  /**
   * Active programs shown on the public donate page, each enriched with its
   * live raised total (sum of completed donation transactions in the program's
   * currency) — the same figure the admin Programs tab shows.
   */
  async listPublicCampaigns() {
    const campaigns = await this.campaigns.find({
      where: { status: CampaignStatus.ACTIVE },
      order: { startDate: 'ASC' },
    });
    const { received } = await this.getReceivedMap();
    return campaigns.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      targetAmount: Number(c.targetAmount),
      receivedAmount: received.get(`${c.id}|${c.currency}`) ?? 0,
      currency: c.currency,
      fundType: c.fundType,
      subFundId: c.subFundId,
      heroImageUrl: c.heroImageUrl,
      startDate: c.startDate,
      endDate: c.endDate,
    }));
  }

  /**
   * Record a donation from the public donate page.
   *
   * When a real payment gateway drives the transaction (Mobile Money, with
   * credentials configured and a payer phone supplied) the donation starts as
   * "pending" and a collection request is initiated; its status is confirmed
   * later via {@link refreshPaymentStatus} (gateway polling). Without an active
   * gateway there is nothing to verify, so the donation is treated as received
   * immediately ("completed") — this also covers offline/manual methods, which
   * an admin can correct from the donations report if needed.
   */
  async create(dto: CreateDonationDto, donorId: string | null): Promise<Donation> {
    let campaignId: string | null = null;
    if (dto.campaignSlug) {
      const campaign = await this.campaigns.findOne({ where: { slug: dto.campaignSlug } });
      campaignId = campaign?.id ?? null;
    }

    const creds =
      dto.paymentMethod === 'momo' && dto.donorPhone
        ? await this.paymentSettings.getRawSettings(PaymentMethodCode.MOMO_INTOUCH)
        : null;
    const useGateway = !!(creds?.username && creds?.partnerPassword && creds?.accountNo);

    const donation = this.donations.create({
      campaignId,
      donorId,
      donorName: dto.isAnonymous ? null : (dto.donorName ?? null),
      donorEmail: dto.donorEmail ?? null,
      donorPhone: dto.donorPhone ?? null,
      isAnonymous: dto.isAnonymous ?? false,
      amount: dto.amount,
      currency: dto.currency ?? 'RWF',
      frequency: dto.frequency ?? DonationFrequency.ONCE,
      paymentMethod: dto.paymentMethod ?? null,
      status: useGateway ? DonationStatus.PENDING : DonationStatus.COMPLETED,
      message: dto.message ?? null,
      donatedAt: new Date(),
    });
    const saved = await this.donations.save(donation);

    if (useGateway && creds) {
      const requestTxnId = `DON-${saved.id.slice(0, 8)}-${Date.now()}`;
      const fallbackCallback = `${this.configService.get('app.url', 'http://localhost:3000')}/api/v1/webhooks/intouch-pay`;

      const result = await this.intouchPay.requestPayment({
        username: creds.username,
        partnerPassword: creds.partnerPassword,
        accountNo: creds.accountNo,
        amount: Number(saved.amount),
        mobilePhone: dto.donorPhone as string,
        transactionId: requestTxnId,
        reason: 'RMC Donation – Rwanda Muslim Council',
        callbackUrl: creds.callbackUrl || fallbackCallback,
        gatewayUrl: creds.gatewayUrl || undefined,
      });

      // Store requestTxnId and gateway txnId separated by | for status polling
      saved.paymentReference = result.transactionId
        ? `${requestTxnId}|${result.transactionId}`
        : requestTxnId;

      if (result.status === 'SUCCESSFUL') {
        saved.status = DonationStatus.COMPLETED;
      } else if (result.status === 'FAILED') {
        saved.status = DonationStatus.FAILED;
      }
      await this.donations.save(saved);
    }

    return saved;
  }

  /**
   * Re-check a pending gateway-backed donation against the payment provider and
   * advance its status (pending → completed/failed). Safe to call repeatedly;
   * it only contacts the gateway while the donation is still pending and has a
   * payment reference. Returns the (possibly updated) donation.
   */
  async refreshPaymentStatus(id: string): Promise<Donation> {
    const donation = await this.donations.findOne({
      where: { id },
      relations: ['campaign'],
    });
    if (!donation) throw new NotFoundException('Donation not found');

    if (donation.status === DonationStatus.PENDING && donation.paymentReference) {
      const creds = await this.paymentSettings.getRawSettings(PaymentMethodCode.MOMO_INTOUCH);
      if (creds?.username && creds?.partnerPassword && creds?.accountNo) {
        // paymentReference is stored as "requestTxnId|gatewayTxnId" (gatewayTxnId may be absent)
        const [requestTxnId, gatewayTxnId] = donation.paymentReference.split('|');
        const result = await this.intouchPay.getTransactionStatus({
          username: creds.username,
          partnerPassword: creds.partnerPassword,
          accountNo: creds.accountNo,
          requestTransactionId: requestTxnId,
          transactionId: gatewayTxnId || requestTxnId,
          gatewayBaseUrl: creds.gatewayUrl || undefined,
        });

        if (result.status === 'SUCCESSFUL') {
          donation.status = DonationStatus.COMPLETED;
        } else if (result.status === 'FAILED') {
          donation.status = DonationStatus.FAILED;
        }

        if (result.status !== 'PENDING') {
          await this.donations.save(donation);
          if (donation.status === DonationStatus.COMPLETED && donation.donorPhone) {
            const amountStr = Number(donation.amount).toLocaleString('en-US');
            const msg = DonationSmsTemplates.paymentConfirmed(
              amountStr,
              donation.currency,
              donation.donorName,
            );
            void this.smsService.sendSms(donation.donorPhone, msg);
          }
        }
      }
    }

    return donation;
  }

  // ── Admin: donations report ──────────────────────────────────────────────

  private applyFilters(
    qb: SelectQueryBuilder<Donation>,
    filters: DonationFilters,
  ): SelectQueryBuilder<Donation> {
    if (filters.dateFrom) {
      qb.andWhere('donation.donatedAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setDate(end.getDate() + 1); // make the end date inclusive
      qb.andWhere('donation.donatedAt < :dateTo', { dateTo: end.toISOString() });
    }
    if (filters.campaignId) {
      if (filters.campaignId === 'general') {
        qb.andWhere('donation.campaignId IS NULL');
      } else {
        qb.andWhere('donation.campaignId = :campaignId', { campaignId: filters.campaignId });
      }
    }
    if (filters.status) {
      qb.andWhere('donation.status = :status', { status: filters.status });
    }
    if (filters.search) {
      // Match donor name/email, or the raw transaction id (with a leading
      // "TXN-" reference prefix stripped so a pasted reference still matches).
      const raw = filters.search.trim().replace(/^txn-/i, '');
      qb.andWhere(
        '(donation.donorName ILIKE :s OR donation.donorEmail ILIKE :s OR donation.id::text ILIKE :ids)',
        { s: `%${filters.search}%`, ids: `%${raw}%` },
      );
    }
    // Category and intention are not columns — they live in the `message` metadata.
    if (filters.category) {
      qb.andWhere('donation.message ~ :catRe', {
        catRe: metaSegmentRegex('category', filters.category),
      });
    }
    if (filters.niyyah) {
      qb.andWhere('donation.message ~ :niyRe', {
        niyRe: metaSegmentRegex('niyyah', filters.niyyah),
      });
    }
    if (filters.method) {
      qb.andWhere('donation.paymentMethod = :method', { method: filters.method });
    }
    return qb;
  }

  /**
   * Every donation matching the filters as an .xlsx report.
   *
   * Reuses applyFilters, so the export inherits the list's exact semantics — the
   * inclusive end date, the "general" campaign sentinel, the TXN- prefix strip — and
   * deliberately ignores page/limit: the point of a report is the whole filtered set,
   * not the 20 rows that happen to be on screen.
   */
  async adminExportXlsx(filters: DonationFilters): Promise<Buffer> {
    const qb = this.donations
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.campaign', 'campaign')
      .orderBy('donation.donatedAt', 'DESC')
      .addOrderBy('donation.id', 'DESC');

    this.applyFilters(qb, filters);
    const donations = await qb.getMany();

    const rows = donations.map((d) => {
      const meta = parseDonationMeta(d.message);
      return {
        'Transaction Ref': txnRef(d.id),
        Date: formatDateTime(d.donatedAt),
        // An anonymous donor's identity is hidden in the UI; a spreadsheet that
        // names them anyway would leak exactly what the flag exists to protect.
        Donor: d.isAnonymous ? 'Anonymous' : (d.donorName?.trim() || 'Unknown'),
        'Donor Email': d.isAnonymous ? '' : (d.donorEmail ?? ''),
        'Donor Phone': d.isAnonymous ? '' : (d.donorPhone ?? ''),
        Anonymous: d.isAnonymous ? 'Yes' : 'No',
        Fund: d.campaign?.title ?? 'General Fund',
        // Stable metadata keys, not localized labels — the file has no locale.
        Category: meta.category ?? '',
        Intention: meta.niyyah ?? '',
        Amount: Number(d.amount),
        Currency: d.currency,
        Method: d.paymentMethod ?? '',
        Status: d.status,
        Frequency: d.frequency,
        'Payment Reference': d.paymentReference ?? '',
      };
    });

    return toXlsxBuffer('Donations', DONATION_EXPORT_COLUMNS, rows);
  }

  async adminFindAll(filters: DonationFilters) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;

    const sortCol = DONATION_SORT_COLUMNS[filters.sort ?? 'date'] ?? DONATION_SORT_COLUMNS.date;
    const order = (filters.order ?? '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const qb = this.donations
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.campaign', 'campaign')
      .orderBy(sortCol, order)
      // Stable secondary ordering so paging is deterministic on ties.
      .addOrderBy('donation.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    this.applyFilters(qb, filters);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /**
   * Daily completed-donation totals for the dashboard chart — a continuous,
   * zero-filled series of the last `days` days in the given currency.
   */
  async adminGetDailyReceived(days = 30, currency = 'RWF') {
    const span = Math.min(Math.max(Math.trunc(days) || 30, 1), 365);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (span - 1));
    const startKey = start.toISOString().slice(0, 10);

    const rows = await this.donations
      .createQueryBuilder('donation')
      .select("TO_CHAR(donation.donatedAt::date, 'YYYY-MM-DD')", 'date')
      .addSelect(
        `COALESCE(SUM(donation.amount) FILTER (WHERE donation.status = 'completed'), 0)`,
        'received',
      )
      .addSelect(`COUNT(*) FILTER (WHERE donation.status = 'completed')`, 'count')
      .where('donation.currency = :currency', { currency })
      .andWhere('donation.donatedAt::date >= :start', { start: startKey })
      .groupBy('donation.donatedAt::date')
      .getRawMany<{ date: string; received: string; count: string }>();

    const byDate = new Map(rows.map((r) => [r.date, r]));
    const series: { date: string; received: number; count: number }[] = [];
    for (let i = 0; i < span; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const r = byDate.get(key);
      series.push({
        date: key,
        received: r ? Number(r.received) : 0,
        count: r ? Number(r.count) : 0,
      });
    }
    return { currency, days: span, series };
  }

  /** Top-line stats + per-program / per-currency / per-status breakdowns. */
  async adminGetStats(filters: DonationFilters) {
    // Per currency: received (completed) vs pending vs all
    const byCurrencyQb = this.donations
      .createQueryBuilder('donation')
      .select('donation.currency', 'currency')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        `COALESCE(SUM(donation.amount) FILTER (WHERE donation.status = 'completed'), 0)`,
        'received',
      )
      .addSelect(
        `COALESCE(SUM(donation.amount) FILTER (WHERE donation.status = 'pending'), 0)`,
        'pending',
      )
      .addSelect('COALESCE(SUM(donation.amount), 0)', 'total')
      .groupBy('donation.currency');
    this.applyFilters(byCurrencyQb, filters);
    const byCurrencyRaw = await byCurrencyQb.getRawMany();

    // Per program (campaign)
    const byProgramQb = this.donations
      .createQueryBuilder('donation')
      .leftJoin('donation.campaign', 'campaign')
      .select('donation.campaignId', 'campaignId')
      .addSelect('campaign.title', 'title')
      .addSelect('donation.currency', 'currency')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        `COALESCE(SUM(donation.amount) FILTER (WHERE donation.status = 'completed'), 0)`,
        'received',
      )
      .addSelect('COALESCE(SUM(donation.amount), 0)', 'total')
      .groupBy('donation.campaignId')
      .addGroupBy('campaign.title')
      .addGroupBy('donation.currency')
      .orderBy('received', 'DESC');
    this.applyFilters(byProgramQb, filters);
    const byProgramRaw = await byProgramQb.getRawMany();

    // Per status
    const byStatusQb = this.donations
      .createQueryBuilder('donation')
      .select('donation.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(donation.amount), 0)', 'total')
      .groupBy('donation.status');
    this.applyFilters(byStatusQb, filters);
    const byStatusRaw = await byStatusQb.getRawMany();

    const count = byCurrencyRaw.reduce((acc, r) => acc + Number(r.count), 0);

    return {
      count,
      byCurrency: byCurrencyRaw.map((r) => ({
        currency: r.currency,
        count: Number(r.count),
        received: Number(r.received),
        pending: Number(r.pending),
        total: Number(r.total),
      })),
      byProgram: byProgramRaw.map((r) => ({
        campaignId: r.campaignId,
        title: r.title ?? 'General fund',
        currency: r.currency,
        count: Number(r.count),
        received: Number(r.received),
        total: Number(r.total),
      })),
      byStatus: byStatusRaw.map((r) => ({
        status: r.status,
        count: Number(r.count),
        total: Number(r.total),
      })),
    };
  }

  async adminUpdateDonation(id: string, dto: UpdateDonationDto): Promise<Donation> {
    const donation = await this.donations.findOne({ where: { id } });
    if (!donation) throw new NotFoundException('Donation not found');

    if (dto.amount !== undefined) donation.amount = dto.amount;
    if (dto.status !== undefined) donation.status = dto.status;
    if (dto.frequency !== undefined) donation.frequency = dto.frequency;
    if (dto.campaignId !== undefined) donation.campaignId = dto.campaignId || null;
    if (dto.donorName !== undefined) donation.donorName = dto.donorName;
    if (dto.donorEmail !== undefined) donation.donorEmail = dto.donorEmail;
    if (dto.currency !== undefined) donation.currency = dto.currency;

    const saved = await this.donations.save(donation);

    // Note: a program's `raisedAmount` is the public-facing figure (shown
    // identically on the admin Programs tab and the client donate page) and is
    // managed explicitly via the program editor — we don't overwrite it here.

    return this.donations.findOne({
      where: { id: saved.id },
      relations: ['campaign'],
    }) as Promise<Donation>;
  }

  // ── Admin: program / campaign management ──────────────────────────────────

  /**
   * Per-campaign aggregates from completed donation transactions, grouped by
   * campaign AND currency so a campaign's received total is summed in its own
   * currency only (we never add e.g. USD gifts into an RWF total).
   */
  private async getReceivedMap(): Promise<{
    counts: Map<string, number>;
    received: Map<string, number>;
  }> {
    const agg = await this.donations
      .createQueryBuilder('donation')
      .select('donation.campaignId', 'campaignId')
      .addSelect('donation.currency', 'currency')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        `COALESCE(SUM(donation.amount) FILTER (WHERE donation.status = 'completed'), 0)`,
        'received',
      )
      .where('donation.campaignId IS NOT NULL')
      .groupBy('donation.campaignId')
      .addGroupBy('donation.currency')
      .getRawMany();

    const counts = new Map<string, number>();
    const received = new Map<string, number>();
    for (const r of agg) {
      counts.set(r.campaignId, (counts.get(r.campaignId) ?? 0) + Number(r.count));
      received.set(`${r.campaignId}|${r.currency}`, Number(r.received));
    }
    return { counts, received };
  }

  /** All campaigns with live received totals + donation counts. */
  async adminListCampaigns() {
    const campaigns = await this.campaigns.find({ order: { startDate: 'ASC' } });
    const { counts, received } = await this.getReceivedMap();

    return campaigns.map((c) => ({
      ...c,
      targetAmount: Number(c.targetAmount),
      raisedAmount: Number(c.raisedAmount),
      receivedAmount: received.get(`${c.id}|${c.currency}`) ?? 0,
      donationCount: counts.get(c.id) ?? 0,
    }));
  }

  /** Soft-deleted (archived) programs, most-recently-deleted first, for the restore view. */
  async adminListDeletedCampaigns() {
    const campaigns = await this.campaigns.find({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
      order: { deletedAt: 'DESC' },
    });
    const { counts, received } = await this.getReceivedMap();

    return campaigns.map((c) => ({
      ...c,
      targetAmount: Number(c.targetAmount),
      raisedAmount: Number(c.raisedAmount),
      receivedAmount: received.get(`${c.id}|${c.currency}`) ?? 0,
      donationCount: counts.get(c.id) ?? 0,
    }));
  }

  /** Restore a soft-deleted program. No-op if it isn't deleted. */
  async restoreCampaign(id: string): Promise<{ id: string }> {
    const campaign = await this.campaigns.findOne({ where: { id }, withDeleted: true });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.deletedAt) await this.campaigns.recover(campaign);
    return { id };
  }

  private slugify(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180);
  }

  /**
   * Return `base`, or `base-2`, `base-3`, … until it's free (ignoring `excludeId`).
   * Checks soft-deleted rows too (`withDeleted`), since the slug unique index spans
   * them — otherwise recreating a deleted program's slug hits a DB unique violation.
   */
  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let n = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.campaigns.findOne({ where: { slug }, withDeleted: true });
      if (!existing || existing.id === excludeId) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }

  async createCampaign(dto: CreateCampaignDto, userId: string): Promise<DonationCampaign> {
    // Admin may supply a slug; otherwise derive it from the title.
    const base = this.slugify(dto.slug || dto.title) || 'campaign';
    const slug = await this.uniqueSlug(base);

    const campaign = this.campaigns.create({
      title: dto.title,
      slug,
      description: dto.description,
      targetAmount: dto.targetAmount,
      currency: dto.currency ?? 'RWF',
      fundType: dto.fundType ?? 'general',
      subFundId: dto.subFundId ?? null,
      startDate: dto.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: dto.endDate ?? null,
      heroImageUrl: dto.heroImageUrl ?? null,
      status: dto.status ?? CampaignStatus.ACTIVE,
      createdBy: userId,
    });
    return this.campaigns.save(campaign);
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto): Promise<DonationCampaign> {
    const campaign = await this.campaigns.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    // Honor an admin-supplied slug change, keeping it unique.
    if (dto.slug !== undefined) {
      const base = this.slugify(dto.slug) || campaign.slug;
      if (base !== campaign.slug) campaign.slug = await this.uniqueSlug(base, campaign.id);
    }

    Object.assign(campaign, {
      title: dto.title ?? campaign.title,
      description: dto.description ?? campaign.description,
      targetAmount: dto.targetAmount ?? campaign.targetAmount,
      raisedAmount: dto.raisedAmount ?? campaign.raisedAmount,
      currency: dto.currency ?? campaign.currency,
      fundType: dto.fundType ?? campaign.fundType,
      subFundId: dto.subFundId !== undefined ? dto.subFundId : campaign.subFundId,
      startDate: dto.startDate ?? campaign.startDate,
      endDate: dto.endDate !== undefined ? dto.endDate : campaign.endDate,
      heroImageUrl: dto.heroImageUrl !== undefined ? dto.heroImageUrl : campaign.heroImageUrl,
      status: dto.status ?? campaign.status,
    });
    return this.campaigns.save(campaign);
  }

  async deleteCampaign(id: string): Promise<{ id: string }> {
    const campaign = await this.campaigns.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    await this.campaigns.softRemove(campaign);
    return { id };
  }
}
