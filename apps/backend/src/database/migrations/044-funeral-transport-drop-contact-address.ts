import { MigrationInterface, QueryRunner } from 'typeorm';

/** Drop the transport contact-address column — no longer captured. */
export class FuneralTransportDropContactAddress1786000000017 implements MigrationInterface {
  name = 'FuneralTransportDropContactAddress1786000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "funeral_transports" DROP COLUMN IF EXISTS "contact_address"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "funeral_transports" ADD COLUMN "contact_address" varchar(300)`);
  }
}
