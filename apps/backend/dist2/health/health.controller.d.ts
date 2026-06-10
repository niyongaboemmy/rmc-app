import { DataSource } from 'typeorm';
import type Redis from 'ioredis';
export declare class HealthController {
    private readonly dataSource;
    private readonly redis;
    constructor(dataSource: DataSource, redis: Redis);
    getHealth(): Promise<Record<string, unknown>>;
}
