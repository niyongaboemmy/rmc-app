import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class UploadSettings1781957702512 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
