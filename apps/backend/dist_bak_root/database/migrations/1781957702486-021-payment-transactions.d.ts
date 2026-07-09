import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class PaymentTransactions1781957702486 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
