import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Funeral service — public janāzah announcements. Creates the table and seeds a
 * few upcoming notices (prayer times relative to now, so the public filters
 * have content right after migration).
 */
export class FuneralAnnouncements1786000000007 implements MigrationInterface {
  name = 'FuneralAnnouncements1786000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "funeral_announcements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "age" int NOT NULL DEFAULT 0,
        "date_of_death" date,
        "janazah_location" varchar(200) NOT NULL,
        "prayer_time" timestamptz NOT NULL,
        "burial_location" varchar(200) NOT NULL,
        "verse" text,
        "photo_url" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_funeral_announcements" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_announcement_prayer_time" ON "funeral_announcements" ("prayer_time")`);

    await queryRunner.query(`
      INSERT INTO "funeral_announcements"
        ("name", "age", "date_of_death", "janazah_location", "prayer_time", "burial_location", "verse") VALUES
        ('Hajji Ibrahim Uwimana', 78, current_date - 1, 'Nyamirambo Grand Mosque', date_trunc('day', now()) + interval '13 hours 30 minutes', 'Nyamirambo Muslim Cemetery', 'إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ'),
        ('Aisha Mukamana', 64, current_date, 'Kigali Islamic Centre', date_trunc('day', now()) + interval '1 day 15 hours', 'Nyanza Muslim Cemetery', 'إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ'),
        ('Yusuf Habimana', 52, current_date, 'Huye Jamia Mosque', date_trunc('day', now()) + interval '2 days 12 hours 30 minutes', 'Huye Muslim Cemetery', 'إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ'),
        ('Khadija Mukandayisenga', 81, current_date + 1, 'Musanze Central Mosque', date_trunc('day', now()) + interval '4 days 14 hours', 'Musanze Muslim Cemetery', 'إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "funeral_announcements"`);
  }
}
