import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class DonationCategories1781957702485 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
