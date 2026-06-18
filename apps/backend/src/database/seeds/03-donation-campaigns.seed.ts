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

const EVENT_CAMPAIGNS = [
  {
    slug: 'e1',
    title: 'Eid al-Adha National Celebration',
    fundType: 'religious',
    target: 30_000_000,
    raised: 22_000_000,
    startDate: '2026-06-20',
    description:
      'Support the national Eid al-Adha celebration at Amahoro Stadium — logistics, qurbani and community hospitality.',
  },
  {
    slug: 'e2',
    title: 'RMC Annual Scholarship Awards Ceremony',
    fundType: 'education',
    target: 50_000_000,
    raised: 38_000_000,
    startDate: '2026-07-11',
    description:
      'Fund scholarships for outstanding Muslim students across Rwanda at the annual awards ceremony.',
  },
  {
    slug: 'e3',
    title: 'Muslim Women Leadership Summit',
    fundType: 'community',
    target: 15_000_000,
    raised: 9_000_000,
    startDate: '2026-08-08',
    description:
      'Empower the next generation of Muslim women leaders through the national leadership summit.',
  },
  {
    slug: 'e4',
    title: 'Qur’an Recitation Competition — National Finals',
    fundType: 'dawah',
    target: 12_000_000,
    raised: 7_500_000,
    startDate: '2026-09-26',
    description:
      'Host the national finals of the Qur’an recitation competition at the Grand Mosque of Kigali.',
  },
  {
    slug: 'e5',
    title: 'RMC General Assembly Meeting',
    fundType: 'governance',
    target: 8_000_000,
    raised: 8_000_000,
    startDate: '2026-11-14',
    description: 'Support the running of the RMC General Assembly at the headquarters in Rebero.',
  },
];

// Sample donations: [campaignSlug|null, amount, currency, status, donorName|null, anonymous, daysAgo, method]
const SAMPLE_DONATIONS: [
  string | null,
  number,
  string,
  DonationStatus,
  string | null,
  boolean,
  number,
  string,
][] = [
  ['e1', 50_000, 'RWF', DonationStatus.COMPLETED, 'Aisha Uwimana', false, 2, 'momo'],
  ['e1', 100_000, 'RWF', DonationStatus.COMPLETED, 'Ibrahim Niyonzima', false, 5, 'card'],
  ['e1', 25_000, 'RWF', DonationStatus.PENDING, null, true, 1, 'momo'],
  ['e2', 250_000, 'RWF', DonationStatus.COMPLETED, 'Fatima Mukamana', false, 9, 'bank'],
  ['e2', 100, 'USD', DonationStatus.COMPLETED, 'Yusuf Diallo', false, 14, 'paypal'],
  ['e2', 75_000, 'RWF', DonationStatus.COMPLETED, 'Hassan Habimana', false, 20, 'momo'],
  ['e3', 30_000, 'RWF', DonationStatus.COMPLETED, 'Khadija Ingabire', false, 3, 'momo'],
  ['e3', 50, 'EUR', DonationStatus.PENDING, 'Omar Bizimana', false, 7, 'card'],
  ['e4', 40_000, 'RWF', DonationStatus.COMPLETED, null, true, 11, 'momo'],
  ['e4', 60_000, 'RWF', DonationStatus.FAILED, 'Said Mugisha', false, 16, 'card'],
  ['e5', 200_000, 'RWF', DonationStatus.COMPLETED, 'Mariam Uwase', false, 25, 'bank'],
  [null, 10_000, 'RWF', DonationStatus.COMPLETED, 'Anonymous Friend', true, 4, 'momo'],
  [null, 500_000, 'RWF', DonationStatus.COMPLETED, 'Abdul Karim', false, 30, 'bank'],
  [null, 250, 'USD', DonationStatus.COMPLETED, 'Salma Nshimiyimana', false, 45, 'paypal'],
  [null, 15_000, 'RWF', DonationStatus.PENDING, 'Bilal Rugema', false, 0, 'momo'],
  ['e1', 1_000_000, 'RWF', DonationStatus.COMPLETED, 'RMC Donor Circle', false, 60, 'bank'],
];

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
