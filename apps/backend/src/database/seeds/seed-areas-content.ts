/**
 * Force-upsert the Areas of Intervention content with rich sample data.
 * Run: npx ts-node -r tsconfig-paths/register src/database/seeds/seed-areas-content.ts
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../config/data-source';
import { SiteContent } from '../../content/entities/site-content.entity';
import { ContentKeys, AREAS_DEFAULT } from '../../../../frontend/src/lib/content-api';

async function run(): Promise<void> {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(SiteContent);
  console.log('[seed-areas] connected.');

  const existing = await repo.findOne({ where: { sectionKey: ContentKeys.areas } });

  if (existing) {
    existing.value = AREAS_DEFAULT as unknown as Record<string, unknown>;
    await repo.save(existing);
    console.log('[seed-areas] updated existing areas content with rich sample data.');
  } else {
    await repo.save(
      repo.create({
        sectionKey: ContentKeys.areas,
        value: AREAS_DEFAULT as unknown as Record<string, unknown>,
        updatedBy: null,
      }),
    );
    console.log('[seed-areas] seeded areas content.');
  }

  await AppDataSource.destroy();
  console.log('[seed-areas] done.');
}

run().catch((err) => {
  console.error('[seed-areas] error:', err);
  process.exit(1);
});
