import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class MarriageMarkPaid1700000000011 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(): Promise<void>;
}
