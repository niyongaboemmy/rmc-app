import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Donation } from './entities/donation.entity';
import { DonationsService } from './donations.service';
export declare class DonationReconciliationService implements OnModuleInit, OnModuleDestroy {
    private readonly repo;
    private readonly donationsService;
    private readonly logger;
    private timer;
    private readonly RUN_INTERVAL_MS;
    private readonly MIN_AGE_MINUTES;
    private readonly MAX_AGE_HOURS;
    constructor(repo: Repository<Donation>, donationsService: DonationsService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    reconcile(): Promise<void>;
}
