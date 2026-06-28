import { MigrationInterface, QueryRunner } from 'typeorm';

export class CommitteeMembers1786000000004 implements MigrationInterface {
  name = 'CommitteeMembers1786000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "committee_members" (
        "id"          uuid         NOT NULL DEFAULT gen_random_uuid(),
        "nameEn"      varchar(200) NOT NULL,
        "nameRw"      varchar(200) NOT NULL DEFAULT '',
        "nameAr"      varchar(200) NOT NULL DEFAULT '',
        "roleEn"      varchar(200) NOT NULL,
        "roleRw"      varchar(200) NOT NULL DEFAULT '',
        "roleAr"      varchar(200) NOT NULL DEFAULT '',
        "email"       varchar(200),
        "phone"       varchar(50),
        "imageUrl"    varchar(500),
        "sortOrder"   int          NOT NULL DEFAULT 0,
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        "updated_at"  timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_committee_members" PRIMARY KEY ("id")
      )
    `);

    // Seed the current Executive Committee (only if the table is empty) so the
    // About page keeps showing them; admins can then edit / add email + phone.
    await queryRunner.query(`
      INSERT INTO "committee_members"
        ("nameEn","nameRw","nameAr","roleEn","roleRw","roleAr","imageUrl","sortOrder")
      SELECT * FROM (VALUES
        ('Sheikh SINDAYIGAYA Musa','Sheikh SINDAYIGAYA Musa','الشيخ سينداييغايا موسى','Mufti of Rwanda','Mufti w''u Rwanda','مفتي رواندا','https://i.postimg.cc/8CKkfkMS/Mufti.jpg',0),
        ('Sheikh MUSHUMBA Yunnus','Sheikh MUSHUMBA Yunnus','الشيخ موشومبا يونس','Deputy Mufti of Rwanda','Mufti Wungirije w''u Rwanda','نائب مفتي رواندا','https://i.postimg.cc/mkTL1ckm/V1A8567.jpg',1),
        ('Sheikh SEGISEKURE Ibrahim','Sheikh SEGISEKURE Ibrahim','الشيخ سيغيسيكوري إبراهيم','Qadhwi of Rwanda','Qadhwi w''u Rwanda','قاضي رواندا','https://i.postimg.cc/9f1JHK96/Qadh.jpg',2),
        ('Sheikh NZANAHAYO Qassim','Sheikh NZANAHAYO Qassim','الشيخ نزاناهايو قاسم','President of The Majlisi Shuyukh','Perezida wa Majlisi Shuyukh','رئيس مجلس الشيوخ','https://i.postimg.cc/Cx0M5wJm/P1180223.jpg',3),
        ('Sheikh MBARUSHIMANA Suleiman','Sheikh MBARUSHIMANA Suleiman','الشيخ مباروشيمانا سليمان','Advisor to the Mufti of Rwanda','Umujyanama wa Mufti w''u Rwanda','مستشار مفتي رواندا','https://i.postimg.cc/Fsym22m4/P1180220.jpg',4),
        ('Mr. SIBOMANA Salim','Mr. SIBOMANA Salim','السيد سيبومانا سالم','Executive Secretary','Umunyamabanga Nshingwabikorwa','الأمين التنفيذي','https://i.postimg.cc/YSxyqhck/ES-Salim.jpg',5)
      ) AS v("nameEn","nameRw","nameAr","roleEn","roleRw","roleAr","imageUrl","sortOrder")
      WHERE NOT EXISTS (SELECT 1 FROM "committee_members")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "committee_members"`);
  }
}
