import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class PaymentTypeRates1781957702490 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
