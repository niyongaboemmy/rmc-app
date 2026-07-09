"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscribers1782900000000 = void 0;
class Subscribers1782900000000 {
    constructor() {
        this.name = 'Subscribers1782900000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscribers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "locale" varchar(5) NOT NULL DEFAULT 'en',
        "source" varchar(40),
        "unsubscribe_token" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_subscribers_email" ON "subscribers" (LOWER("email"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_subscribers_unsub_token" ON "subscribers" ("unsubscribe_token")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "subscribers"`);
    }
}
exports.Subscribers1782900000000 = Subscribers1782900000000;
//# sourceMappingURL=029-subscribers.js.map