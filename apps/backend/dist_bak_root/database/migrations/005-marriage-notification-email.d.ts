import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class MarriageNotificationEmail1700000000005 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
