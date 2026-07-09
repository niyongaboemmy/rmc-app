"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const donation_entity_1 = require("./entities/donation.entity");
const donation_campaign_entity_1 = require("./entities/donation-campaign.entity");
const intouch_pay_service_1 = require("../integrations/intouch-pay/intouch-pay.service");
const payment_settings_service_1 = require("../payment-settings/payment-settings.service");
const payment_method_entity_1 = require("../payment-settings/entities/payment-method.entity");
const sms_service_1 = require("../integrations/sms/sms.service");
const donation_sms_templates_1 = require("./donation-sms-templates");
const DONATION_SORT_COLUMNS = {
    date: 'donation.donatedAt',
    amount: 'donation.amount',
    donor: 'donation.donorName',
    status: 'donation.status',
};
let DonationsService = class DonationsService {
    constructor(donations, campaigns, intouchPay, paymentSettings, smsService, configService) {
        this.donations = donations;
        this.campaigns = campaigns;
        this.intouchPay = intouchPay;
        this.paymentSettings = paymentSettings;
        this.smsService = smsService;
        this.configService = configService;
    }
    async listPublicCampaigns() {
        const campaigns = await this.campaigns.find({
            where: { status: donation_campaign_entity_1.CampaignStatus.ACTIVE },
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
    async create(dto, donorId) {
        let campaignId = null;
        if (dto.campaignSlug) {
            const campaign = await this.campaigns.findOne({ where: { slug: dto.campaignSlug } });
            campaignId = campaign?.id ?? null;
        }
        const creds = dto.paymentMethod === 'momo' && dto.donorPhone
            ? await this.paymentSettings.getRawSettings(payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH)
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
            frequency: dto.frequency ?? donation_entity_1.DonationFrequency.ONCE,
            paymentMethod: dto.paymentMethod ?? null,
            status: useGateway ? donation_entity_1.DonationStatus.PENDING : donation_entity_1.DonationStatus.COMPLETED,
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
                mobilePhone: dto.donorPhone,
                transactionId: requestTxnId,
                reason: 'RMC Donation – Rwanda Muslim Council',
                callbackUrl: creds.callbackUrl || fallbackCallback,
                gatewayUrl: creds.gatewayUrl || undefined,
            });
            saved.paymentReference = result.transactionId
                ? `${requestTxnId}|${result.transactionId}`
                : requestTxnId;
            if (result.status === 'SUCCESSFUL') {
                saved.status = donation_entity_1.DonationStatus.COMPLETED;
            }
            else if (result.status === 'FAILED') {
                saved.status = donation_entity_1.DonationStatus.FAILED;
            }
            await this.donations.save(saved);
        }
        return saved;
    }
    async refreshPaymentStatus(id) {
        const donation = await this.donations.findOne({
            where: { id },
            relations: ['campaign'],
        });
        if (!donation)
            throw new common_1.NotFoundException('Donation not found');
        if (donation.status === donation_entity_1.DonationStatus.PENDING && donation.paymentReference) {
            const creds = await this.paymentSettings.getRawSettings(payment_method_entity_1.PaymentMethodCode.MOMO_INTOUCH);
            if (creds?.username && creds?.partnerPassword && creds?.accountNo) {
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
                    donation.status = donation_entity_1.DonationStatus.COMPLETED;
                }
                else if (result.status === 'FAILED') {
                    donation.status = donation_entity_1.DonationStatus.FAILED;
                }
                if (result.status !== 'PENDING') {
                    await this.donations.save(donation);
                    if (donation.status === donation_entity_1.DonationStatus.COMPLETED && donation.donorPhone) {
                        const amountStr = Number(donation.amount).toLocaleString('en-US');
                        const msg = donation_sms_templates_1.DonationSmsTemplates.paymentConfirmed(amountStr, donation.currency, donation.donorName);
                        void this.smsService.sendSms(donation.donorPhone, msg);
                    }
                }
            }
        }
        return donation;
    }
    applyFilters(qb, filters) {
        if (filters.dateFrom) {
            qb.andWhere('donation.donatedAt >= :dateFrom', { dateFrom: filters.dateFrom });
        }
        if (filters.dateTo) {
            const end = new Date(filters.dateTo);
            end.setDate(end.getDate() + 1);
            qb.andWhere('donation.donatedAt < :dateTo', { dateTo: end.toISOString() });
        }
        if (filters.campaignId) {
            if (filters.campaignId === 'general') {
                qb.andWhere('donation.campaignId IS NULL');
            }
            else {
                qb.andWhere('donation.campaignId = :campaignId', { campaignId: filters.campaignId });
            }
        }
        if (filters.status) {
            qb.andWhere('donation.status = :status', { status: filters.status });
        }
        if (filters.search) {
            const raw = filters.search.trim().replace(/^txn-/i, '');
            qb.andWhere('(donation.donorName ILIKE :s OR donation.donorEmail ILIKE :s OR donation.id::text ILIKE :ids)', { s: `%${filters.search}%`, ids: `%${raw}%` });
        }
        return qb;
    }
    async adminFindAll(filters) {
        const page = filters.page && filters.page > 0 ? filters.page : 1;
        const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
        const sortCol = DONATION_SORT_COLUMNS[filters.sort ?? 'date'] ?? DONATION_SORT_COLUMNS.date;
        const order = (filters.order ?? '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const qb = this.donations
            .createQueryBuilder('donation')
            .leftJoinAndSelect('donation.campaign', 'campaign')
            .orderBy(sortCol, order)
            .addOrderBy('donation.id', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        this.applyFilters(qb, filters);
        const [items, total] = await qb.getManyAndCount();
        return { items, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async adminGetDailyReceived(days = 30, currency = 'RWF') {
        const span = Math.min(Math.max(Math.trunc(days) || 30, 1), 365);
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (span - 1));
        const startKey = start.toISOString().slice(0, 10);
        const rows = await this.donations
            .createQueryBuilder('donation')
            .select("TO_CHAR(donation.donatedAt::date, 'YYYY-MM-DD')", 'date')
            .addSelect(`COALESCE(SUM(donation.amount) FILTER (WHERE donation.status = 'completed'), 0)`, 'received')
            .addSelect(`COUNT(*) FILTER (WHERE donation.status = 'completed')`, 'count')
            .where('donation.currency = :currency', { currency })
            .andWhere('donation.donatedAt::date >= :start', { start: startKey })
            .groupBy('donation.donatedAt::date')
            .getRawMany();
        const byDate = new Map(rows.map((r) => [r.date, r]));
        const series = [];
        for (let i = 0; i < span; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            const r = byDate.get(key);
            series.push({ date: key, received: r ? Number(r.received) : 0, count: r ? Number(r.count) : 0 });
        }
        return { currency, days: span, series };
    }
    async adminGetStats(filters) {
        const byCurrencyQb = this.donations
            .createQueryBuilder('donation')
            .select('donation.currency', 'currency')
            .addSelect('COUNT(*)', 'count')
            .addSelect(`COALESCE(SUM(donation.amount) FILTER (WHERE donation.status = 'completed'), 0)`, 'received')
            .addSelect(`COALESCE(SUM(donation.amount) FILTER (WHERE donation.status = 'pending'), 0)`, 'pending')
            .addSelect('COALESCE(SUM(donation.amount), 0)', 'total')
            .groupBy('donation.currency');
        this.applyFilters(byCurrencyQb, filters);
        const byCurrencyRaw = await byCurrencyQb.getRawMany();
        const byProgramQb = this.donations
            .createQueryBuilder('donation')
            .leftJoin('donation.campaign', 'campaign')
            .select('donation.campaignId', 'campaignId')
            .addSelect('campaign.title', 'title')
            .addSelect('donation.currency', 'currency')
            .addSelect('COUNT(*)', 'count')
            .addSelect(`COALESCE(SUM(donation.amount) FILTER (WHERE donation.status = 'completed'), 0)`, 'received')
            .addSelect('COALESCE(SUM(donation.amount), 0)', 'total')
            .groupBy('donation.campaignId')
            .addGroupBy('campaign.title')
            .addGroupBy('donation.currency')
            .orderBy('received', 'DESC');
        this.applyFilters(byProgramQb, filters);
        const byProgramRaw = await byProgramQb.getRawMany();
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
    async adminUpdateDonation(id, dto) {
        const donation = await this.donations.findOne({ where: { id } });
        if (!donation)
            throw new common_1.NotFoundException('Donation not found');
        if (dto.amount !== undefined)
            donation.amount = dto.amount;
        if (dto.status !== undefined)
            donation.status = dto.status;
        if (dto.frequency !== undefined)
            donation.frequency = dto.frequency;
        if (dto.campaignId !== undefined)
            donation.campaignId = dto.campaignId || null;
        if (dto.donorName !== undefined)
            donation.donorName = dto.donorName;
        if (dto.donorEmail !== undefined)
            donation.donorEmail = dto.donorEmail;
        if (dto.currency !== undefined)
            donation.currency = dto.currency;
        const saved = await this.donations.save(donation);
        return this.donations.findOne({
            where: { id: saved.id },
            relations: ['campaign'],
        });
    }
    async getReceivedMap() {
        const agg = await this.donations
            .createQueryBuilder('donation')
            .select('donation.campaignId', 'campaignId')
            .addSelect('donation.currency', 'currency')
            .addSelect('COUNT(*)', 'count')
            .addSelect(`COALESCE(SUM(donation.amount) FILTER (WHERE donation.status = 'completed'), 0)`, 'received')
            .where('donation.campaignId IS NOT NULL')
            .groupBy('donation.campaignId')
            .addGroupBy('donation.currency')
            .getRawMany();
        const counts = new Map();
        const received = new Map();
        for (const r of agg) {
            counts.set(r.campaignId, (counts.get(r.campaignId) ?? 0) + Number(r.count));
            received.set(`${r.campaignId}|${r.currency}`, Number(r.received));
        }
        return { counts, received };
    }
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
    async adminListDeletedCampaigns() {
        const campaigns = await this.campaigns.find({
            withDeleted: true,
            where: { deletedAt: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()) },
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
    async restoreCampaign(id) {
        const campaign = await this.campaigns.findOne({ where: { id }, withDeleted: true });
        if (!campaign)
            throw new common_1.NotFoundException('Campaign not found');
        if (campaign.deletedAt)
            await this.campaigns.recover(campaign);
        return { id };
    }
    slugify(title) {
        return title
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 180);
    }
    async uniqueSlug(base, excludeId) {
        let slug = base;
        let n = 1;
        while (true) {
            const existing = await this.campaigns.findOne({ where: { slug }, withDeleted: true });
            if (!existing || existing.id === excludeId)
                return slug;
            n += 1;
            slug = `${base}-${n}`;
        }
    }
    async createCampaign(dto, userId) {
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
            status: dto.status ?? donation_campaign_entity_1.CampaignStatus.ACTIVE,
            createdBy: userId,
        });
        return this.campaigns.save(campaign);
    }
    async updateCampaign(id, dto) {
        const campaign = await this.campaigns.findOne({ where: { id } });
        if (!campaign)
            throw new common_1.NotFoundException('Campaign not found');
        if (dto.slug !== undefined) {
            const base = this.slugify(dto.slug) || campaign.slug;
            if (base !== campaign.slug)
                campaign.slug = await this.uniqueSlug(base, campaign.id);
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
    async deleteCampaign(id) {
        const campaign = await this.campaigns.findOne({ where: { id } });
        if (!campaign)
            throw new common_1.NotFoundException('Campaign not found');
        await this.campaigns.softRemove(campaign);
        return { id };
    }
};
exports.DonationsService = DonationsService;
exports.DonationsService = DonationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(donation_entity_1.Donation)),
    __param(1, (0, typeorm_1.InjectRepository)(donation_campaign_entity_1.DonationCampaign)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        intouch_pay_service_1.IntouchPayService,
        payment_settings_service_1.PaymentSettingsService,
        sms_service_1.SmsService,
        config_1.ConfigService])
], DonationsService);
//# sourceMappingURL=donations.service.js.map