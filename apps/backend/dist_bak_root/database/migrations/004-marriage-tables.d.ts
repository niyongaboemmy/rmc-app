import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class MarriageTables1700000000004 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
