"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactMessages1700000000012 = void 0;
class ContactMessages1700000000012 {
    constructor() {
        this.name = 'ContactMessages1700000000012';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contact_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "email" varchar(150) NOT NULL,
        "subject" varchar(200) NOT NULL,
        "message" text NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'unread',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contact_messages" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_contact_messages_status" ON "contact_messages" ("status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_contact_messages_created_at" ON "contact_messages" ("created_at")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contact_messages_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contact_messages_status"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "contact_messages"`);
    }
}
exports.ContactMessages1700000000012 = ContactMessages1700000000012;
//# sourceMappingURL=012-contact-messages.js.map