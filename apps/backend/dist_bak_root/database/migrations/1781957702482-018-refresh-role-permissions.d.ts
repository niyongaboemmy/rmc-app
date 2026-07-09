import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class RefreshRolePermissions1781957702482 implements MigrationInterface {
    name: string;
    private readonly ALL_PERMISSIONS;
    private readonly OPERATOR_PERMISSIONS;
    private readonly ADMIN_PERMISSIONS;
    private readonly MARRIAGE_OFFICER_PERMISSIONS;
    private readonly MEMBER_PERMISSIONS;
    private readonly roles;
    private resolvePermissions;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
