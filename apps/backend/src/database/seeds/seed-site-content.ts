import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../config/data-source';
import { SiteContent } from '../../content/entities/site-content.entity';

// Canonical defaults live with the frontend section modules (single source of
// truth shared by the admin editors and the landing page). We import them here
// so the seed never drifts from what the UI renders.
import {
  ContentKeys,
  WHO_WE_ARE_DEFAULT,
  AREAS_DEFAULT,
  STATS_DEFAULT,
  PARTNERS_DEFAULT,
  UPDATES_DEFAULT,
  ACTIVITIES_DEFAULT,
  ANNOUNCEMENTS_DEFAULT,
  SOCIAL_DEFAULT,
  HERO_DEFAULT,
} from '../../../../frontend/src/lib/content-api';

const SECTIONS: Record<string, unknown> = {
  [ContentKeys.whoWeAre]: WHO_WE_ARE_DEFAULT,
  [ContentKeys.areas]: AREAS_DEFAULT,
  [ContentKeys.stats]: STATS_DEFAULT,
  [ContentKeys.partners]: PARTNERS_DEFAULT,
  [ContentKeys.updates]: UPDATES_DEFAULT,
  [ContentKeys.activities]: ACTIVITIES_DEFAULT,
  [ContentKeys.announcements]: ANNOUNCEMENTS_DEFAULT,
  [ContentKeys.social]: SOCIAL_DEFAULT,
  [ContentKeys.hero]: HERO_DEFAULT,
};

async function run(): Promise<void> {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(SiteContent);
  console.log('[seed-site-content] connected.');

  for (const [sectionKey, value] of Object.entries(SECTIONS)) {
    const existing = await repo.findOne({ where: { sectionKey } });
    if (existing) {
      console.log(`  skip (already exists): ${sectionKey}`);
      continue;
    }
    await repo.save(
      repo.create({ sectionKey, value: value as Record<string, unknown>, updatedBy: null }),
    );
    console.log(`  seeded: ${sectionKey}`);
  }

  await AppDataSource.destroy();
  console.log('[seed-site-content] done.');
}

run().catch((err) => {
  console.error('[seed-site-content] error:', err);
  process.exit(1);
});
