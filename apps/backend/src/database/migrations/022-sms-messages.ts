import { MigrationInterface, QueryRunner } from 'typeorm';

export class SmsMessages1782200000000 implements MigrationInterface {
  name = 'SmsMessages1782200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sms_messages" (
        "id"             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        "recipients"     text[]        NOT NULL,
        "message"        text          NOT NULL,
        "sender"         varchar(20),
        "provider"       varchar(30)   NOT NULL DEFAULT 'intouch',
        "success"        boolean       NOT NULL DEFAULT false,
        "total_messages" int,
        "cost"           decimal(10,2),
        "balance_after"  decimal(15,2),
        "error"          text,
        "details"        jsonb,
        "sent_at"        timestamptz,
        "created_at"     timestamptz   NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sms_messages_created_at"
        ON "sms_messages" ("created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_sms_messages_success"
        ON "sms_messages" ("success")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sms_messages"`);
  }
}
