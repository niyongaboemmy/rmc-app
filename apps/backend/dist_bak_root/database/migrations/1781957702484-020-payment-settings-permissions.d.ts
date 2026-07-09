import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class PaymentSettingsPermissions1781957702484 implements MigrationInterface {
    name: string;
    private readonly NEW_PERMISSIONS;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
