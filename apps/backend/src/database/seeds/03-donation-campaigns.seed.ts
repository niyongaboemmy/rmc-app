import { DataSource } from 'typeorm';
import {
  DonationCampaign,
  CampaignStatus,
} from '../../donations/entities/donation-campaign.entity';
import {
  Donation,
  DonationStatus,
  DonationFrequency,
} from '../../donations/entities/donation.entity';

/**
 * Seeds the static home-page events as real donation programs (slug = event id,
 * so the public donate page maps straight through), plus a modest set of sample
 * donations so the admin report, date-range / program filters and stats have
 * content on first run. Both passes are idempotent and safe to re-run.
 */

// Intentionally EMPTY: no default/sample programs are seeded. Every donation
// program is created by an admin from Finance → Donations → Programs.
const EVENT_CAMPAIGNS: {
  slug: string;
  title: string;
  fundType: string;
  target: number;
  raised: number;
  startDate: string;
  description: string;
}[] = [];

// Intentionally EMPTY: no sample donations are seeded — only real donations appear.
// [campaignSlug|null, amount, currency, status, donorName|null, anonymous, daysAgo, method]
const SAMPLE_DONATIONS: [
  string | null,
  number,
  string,
  DonationStatus,
  string | null,
  boolean,
  number,
  string,
][] = [];

export async function seedDonationCampaigns(dataSource: DataSource): Promise<void> {
  const campaignRepo = dataSource.getRepository(DonationCampaign);
  const donationRepo = dataSource.getRepository(Donation);
  const userRepo = dataSource.getRepository('users');

  console.log('[SEED] Seeding donation programs...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@rmc.org.rw';
  const admin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!admin) {
    console.log('  [SEED] No admin user found — skipping donation campaigns seed');
    return;
  }

  const slugToId = new Map<string, string>();

  for (const e of EVENT_CAMPAIGNS) {
    const existing = await campaignRepo.findOne({ where: { slug: e.slug } });
    if (existing) {
      slugToId.set(e.slug, existing.id);
      continue;
    }
    const saved = await campaignRepo.save(
      campaignRepo.create({
        title: e.title,
        slug: e.slug,
        description: e.description,
        targetAmount: e.target,
        // Raised is derived live from completed donation transactions, not seeded.
        raisedAmount: 0,
        currency: 'RWF',
        fundType: e.fundType,
        startDate: e.startDate,
        status: CampaignStatus.ACTIVE,
        createdBy: admin.id,
      }),
    );
    slugToId.set(e.slug, saved.id);
    console.log(`  [SEED] Created program "${e.title}"`);
  }

  // Sample donations — only when the table is empty, so we never pollute real data.
  const existingDonations = await donationRepo.count();
  if (existingDonations > 0) {
    console.log(
      `  [SEED] Donations already present (${existingDonations}) — skipping sample donations`,
    );
    console.log('[SEED] Donation programs seed complete.');
    return;
  }

  for (const [
    slug,
    amount,
    currency,
    status,
    donorName,
    anonymous,
    daysAgo,
    method,
  ] of SAMPLE_DONATIONS) {
    const donatedAt = new Date();
    donatedAt.setDate(donatedAt.getDate() - daysAgo);
    await donationRepo.save(
      donationRepo.create({
        campaignId: slug ? (slugToId.get(slug) ?? null) : null,
        donorId: null,
        donorName: anonymous ? null : donorName,
        donorEmail: donorName ? `${donorName.split(' ')[0].toLowerCase()}@example.com` : null,
        isAnonymous: anonymous,
        amount,
        currency,
        frequency: DonationFrequency.ONCE,
        paymentMethod: method,
        status,
        donatedAt,
      }),
    );
  }
  console.log(`  [SEED] Created ${SAMPLE_DONATIONS.length} sample donations`);
  console.log('[SEED] Donation programs seed complete.');
}
