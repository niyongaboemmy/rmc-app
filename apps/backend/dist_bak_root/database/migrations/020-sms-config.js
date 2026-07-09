"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsConfig1782000000000 = void 0;
class SmsConfig1782000000000 {
    constructor() {
        this.name = 'SmsConfig1782000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sms_config" (
        "id"                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        "username"            varchar(100) NOT NULL DEFAULT '',
        "password_enc"        text         NOT NULL DEFAULT '',
        "sender_name"         varchar(11)  NOT NULL DEFAULT 'RMC',
        "dlr_url"             varchar(500),
        "is_active"           boolean      NOT NULL DEFAULT false,
        "balance_rwf"         decimal(12, 2),
        "balance_updated_at"  timestamptz,
        "created_at"          timestamptz  NOT NULL DEFAULT now(),
        "updated_at"          timestamptz  NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      INSERT INTO "sms_config"
        ("username", "password_enc", "sender_name", "is_active")
      VALUES
        ('RMC', '', 'RMC', false)
      ON CONFLICT DO NOTHING
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "sms_config"`);
    }
}
exports.SmsConfig1782000000000 = SmsConfig1782000000000;
//# sourceMappingURL=020-sms-config.js.map