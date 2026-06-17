import { MigrationInterface, QueryRunner } from 'typeorm';

export class Rbac1700000000003 implements MigrationInterface {
  name = 'Rbac1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Roles table ───────────────────────────────────────────────
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

    // ── Add role_id FK to users ───────────────────────────────────
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "role_id" uuid`);
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_role_id"
        FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX "IDX_users_role_id" ON "users" ("role_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_role_id"`);
    await queryRunner.query(`DROP INDEX "IDX_users_role_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role_id"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
