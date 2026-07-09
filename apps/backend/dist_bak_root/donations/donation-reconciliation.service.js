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
var DonationReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const donation_entity_1 = require("./entities/donation.entity");
const donations_service_1 = require("./donations.service");
let DonationReconciliationService = DonationReconciliationService_1 = class DonationReconciliationService {
    constructor(repo, donationsService) {
        this.repo = repo;
        this.donationsService = donationsService;
        this.logger = new common_1.Logger(DonationReconciliationService_1.name);
        this.timer = null;
        this.RUN_INTERVAL_MS = 3 * 60 * 1000;
        this.MIN_AGE_MINUTES = 3;
        this.MAX_AGE_HOURS = 24;
    }
    onModuleInit() {
        setTimeout(() => void this.reconcile(), 30_000);
        this.timer = setInterval(() => void this.reconcile(), this.RUN_INTERVAL_MS);
    }
    onModuleDestroy() {
        if (this.timer)
            clearInterval(this.timer);
    }
    async reconcile() {
        const minAge = new Date(Date.now() - this.MIN_AGE_MINUTES * 60 * 1000);
        const maxAge = new Date(Date.now() - this.MAX_AGE_HOURS * 60 * 60 * 1000);
        const stuckDonations = await this.repo.find({
            where: {
                status: donation_entity_1.DonationStatus.PENDING,
                donatedAt: (0, typeorm_2.LessThan)(minAge),
            },
            order: { donatedAt: 'DESC' },
            take: 50,
        });
        const toCheck = stuckDonations.filter((d) => d.paymentReference && d.donatedAt > maxAge);
        if (!toCheck.length)
            return;
        this.logger.log(`[Reconciliation] Checking ${toCheck.length} stuck pending donation(s)`);
        const results = await Promise.allSettled(toCheck.map((d) => this.donationsService.refreshPaymentStatus(d.id)));
        let resolved = 0;
        results.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value.status !== donation_entity_1.DonationStatus.PENDING) {
                resolved++;
                this.logger.log(`[Reconciliation] Donation ${toCheck[i].id} → ${r.value.status}`);
            }
        });
        if (resolved) {
            this.logger.log(`[Reconciliation] Resolved ${resolved}/${toCheck.length} donation(s)`);
        }
    }
};
exports.DonationReconciliationService = DonationReconciliationService;
exports.DonationReconciliationService = DonationReconciliationService = DonationReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(donation_entity_1.Donation)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        donations_service_1.DonationsService])
], DonationReconciliationService);
//# sourceMappingURL=donation-reconciliation.service.js.map