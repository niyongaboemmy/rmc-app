import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class PaymentSettings1781957702483 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
