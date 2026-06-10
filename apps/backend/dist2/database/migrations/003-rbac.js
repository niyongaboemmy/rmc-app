"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rbac1700000000003 = void 0;
class Rbac1700000000003 {
    constructor() {
        this.name = 'Rbac1700000000003';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "description" text,
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "is_system" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "UQ_roles_slug" UNIQUE ("slug")
      )
    `);
        await queryRunner.query(`CREATE INDEX "IDX_roles_name" ON "roles" ("name")`);
        await queryRunner.query(`CREATE INDEX "IDX_roles_slug" ON "roles" ("slug")`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "role_id" uuid`);
        await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_role_id"
        FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL
    `);
        await queryRunner.query(`CREATE INDEX "IDX_users_role_id" ON "users" ("role_id")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_role_id"`);
        await queryRunner.query(`DROP INDEX "IDX_users_role_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role_id"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }
}
exports.Rbac1700000000003 = Rbac1700000000003;
//# sourceMappingURL=003-rbac.js.map