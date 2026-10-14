import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../config/data-source';
import { seedProvincesAndDistricts } from './01-provinces-districts.seed';
import { seedRolesAndAdmin } from './02-roles-admin.seed';
import { seedDonationCampaigns } from './03-donation-campaigns.seed';
import { seedMosques } from './04-mosques.seed';
import { seedDonationContent } from './05-donation-content.seed';
import { seedSmsConfig } from './06-sms-config.seed';
import { seedSectors } from './07-sectors.seed';
import { seedDawahCategories } from './08-dawah-categories.seed';
import { seedIremboPay } from './09-irembopay.seed';
import { seedIremboPayCatalog } from './10-irembopay-catalog.seed';
// No tenders here. They were `09-tenders.seed.ts` until it became clear the rows
// are demo content published to the live board — see dev-fixtures-tenders.ts.

async function runSeeds(): Promise<void> {
  await AppDataSource.initialize();
  // eslint-disable-next-line no-console
  console.log('[Seed] Database connected. Running seeds...');

  await seedProvincesAndDistricts(AppDataSource);
  await seedRolesAndAdmin(AppDataSource);
  await seedDonationCampaigns(AppDataSource);
  await seedMosques(AppDataSource);
  await seedDonationContent(AppDataSource);
  await seedSmsConfig(AppDataSource);
  await seedSectors(AppDataSource);
  await seedDawahCategories(AppDataSource);
  await seedIremboPay(AppDataSource);
  await seedIremboPayCatalog(AppDataSource);

  await AppDataSource.destroy();
  // eslint-disable-next-line no-console
  console.log('[Seed] All seeds completed.');
}

runSeeds().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[Seed] Error:', err);
  process.exit(1);
});
