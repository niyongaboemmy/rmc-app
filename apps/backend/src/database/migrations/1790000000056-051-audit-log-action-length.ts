import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `audit_log.action` was varchar(20); 'token_theft_suspected' (21 chars) overflowed it and
 * dropped the write. Widened to 30 to give future action names headroom too.
 */
export class AuditLogActionLength1790000000056 implements MigrationInterface {
  name = 'AuditLogActionLength1790000000056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_log" ALTER COLUMN "action" TYPE varchar(30)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_log" ALTER COLUMN "action" TYPE varchar(20)`);
  }
}
