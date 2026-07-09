import { DataSource } from 'typeorm';
import { DONATION_CONTENT } from './donation-content.data';

/**
 * Seeds the donation categories & sub-funds from the curated content (extracted
 * from the original donate i18n). Idempotent: a category/sub-fund is inserted
 * only if its key doesn't already exist, so admin edits are never overwritten.
 */
export async function seedDonationContent(dataSource: DataSource): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[SEED] Seeding donation categories & sub-funds...');
  const catRepo = dataSource.getRepository('donation_categories');
  const subRepo = dataSource.getRepository('donation_subfunds');

  for (const cat of DONATION_CONTENT) {
    let existing = await catRepo.findOne({ where: { key: cat.key } });
    if (!existing) {
      existing = await catRepo.save(
        catRepo.create({
          key: cat.key,
          icon: cat.icon,
          tone: cat.tone,
          image: cat.image,
          sortOrder: cat.sortOrder,
          status: 'active',
          titleEn: cat.title.en,
          titleRw: cat.title.rw,
          titleAr: cat.title.ar,
          descEn: cat.desc.en,
          descRw: cat.desc.rw,
          descAr: cat.desc.ar,
          longEn: cat.long.en,
          longRw: cat.long.rw,
          longAr: cat.long.ar,
          impactEn: cat.impact.en,
          impactRw: cat.impact.rw,
          impactAr: cat.impact.ar,
        }),
      );
    }

    for (const sf of cat.subfunds) {
      const has = await subRepo.findOne({ where: { categoryId: existing.id, key: sf.key } });
      if (has) continue;
      await subRepo.save(
        subRepo.create({
          categoryId: existing.id,
          key: sf.key,
          image: sf.image,
          campaignSlug: sf.campaignSlug,
          sortOrder: sf.sortOrder,
          status: 'active',
          labelEn: sf.label.en,
          labelRw: sf.label.rw,
          labelAr: sf.label.ar,
          longEn: sf.long.en,
          longRw: sf.long.rw,
          longAr: sf.long.ar,
          impactEn: sf.impact.en,
          impactRw: sf.impact.rw,
          impactAr: sf.impact.ar,
          examplesEn: sf.examples.en,
          examplesRw: sf.examples.rw,
          examplesAr: sf.examples.ar,
        }),
      );
    }
  }
  // eslint-disable-next-line no-console
  console.log('[SEED] Donation content seed complete.');
}
