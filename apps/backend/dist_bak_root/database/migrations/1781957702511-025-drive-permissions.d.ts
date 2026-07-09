import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class DrivePermissions1781957702511 implements MigrationInterface {
    name: string;
    private readonly USER_PERMS;
    private readonly ADMIN_EXTRA;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
