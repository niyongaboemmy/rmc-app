"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsMessages1782200000000 = void 0;
class SmsMessages1782200000000 {
    constructor() {
        this.name = 'SmsMessages1782200000000';
    }
    async up(queryRunner) {
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
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "sms_messages"`);
    }
}
exports.SmsMessages1782200000000 = SmsMessages1782200000000;
//# sourceMappingURL=022-sms-messages.js.map