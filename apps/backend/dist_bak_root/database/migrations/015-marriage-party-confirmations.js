"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarriagePartyConfirmations1750600000015 = void 0;
class MarriagePartyConfirmations1750600000015 {
    constructor() {
        this.name = 'MarriagePartyConfirmations1750600000015';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'party_role_enum') THEN
          CREATE TYPE "party_role_enum" AS ENUM ('bride', 'groom', 'wali', 'imam');
        END IF;
      END $$;
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marriage_party_confirmations" (
        "id"                  uuid          NOT NULL DEFAULT gen_random_uuid(),
        "application_id"      uuid          NOT NULL,
        "role"                "party_role_enum" NOT NULL,
        "name"                varchar(150),
        "nid"                 varchar(16),
        "phone"               varchar(30),
        "confirmation_token"  varchar(80)   UNIQUE,
        "confirmed_at"        timestamptz,
        "notes"               text,
        "created_at"          timestamptz   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_marriage_party_confirmations" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mpc_application_id"
      ON "marriage_party_confirmations" ("application_id")
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mpc_token"
      ON "marriage_party_confirmations" ("confirmation_token")
      WHERE "confirmation_token" IS NOT NULL
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "marriage_party_confirmations"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "party_role_enum"`);
    }
}
exports.MarriagePartyConfirmations1750600000015 = MarriagePartyConfirmations1750600000015;
//# sourceMappingURL=015-marriage-party-confirmations.js.map