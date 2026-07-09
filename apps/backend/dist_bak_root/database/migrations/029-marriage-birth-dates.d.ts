import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class MarriageBirthDates1786000000002 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
