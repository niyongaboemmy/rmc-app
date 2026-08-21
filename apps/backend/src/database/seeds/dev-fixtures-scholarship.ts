import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../config/data-source';
import { User } from '../../users/entities/user.entity';
import {
  ScholarshipLevel,
  ScholarshipProgram,
  ScholarshipProgramStatus,
} from '../../scholarship/entities/scholarship-program.entity';
import {
  ScholarshipApplication,
  ScholarshipApplicationStatus,
  ScholarshipRelationship,
} from '../../scholarship/entities/scholarship-application.entity';
import { ScholarshipStatusHistory } from '../../scholarship/entities/scholarship-status-history.entity';
import { generateTrackingCode } from '../../tracking/tracking-code.util';

/**
 * LOCAL DEVELOPMENT FIXTURES — deliberately NOT registered in run-seeds.ts.
 *
 * Production runs the seed chain, so demo applicants must never be in it. Run by
 * hand when the admin screens need something to show:
 *
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/dev-fixtures-scholarship.ts
 *
 * Requires at least one PUBLISHED scholarship to exist (create one in the admin,
 * or via `dev-fixtures-scholarship.ts --with-scholarships`). Applications are
 * spread across the pipeline so the review board has a card in every column and
 * the reports page has a distribution rather than one bar.
 *
 * ── Two constraints shape the whole file ────────────────────────────────────
 *
 * 1. `IDX_scholarship_app_one_per_program` (migration 054) permits ONE live
 *    application per person per scholarship, so every live fixture application
 *    gets its own applicant. Reusing one demo user would fail on the second row
 *    of the second column.
 *
 * 2. `tracking_code` is unique and NOT NULL (migration 051). Fixtures generate
 *    real ones through the shared util rather than inventing strings, so a
 *    fixture application can actually be tracked end to end in dev.
 *
 * Idempotent by `application_number`: re-running updates nothing and inserts
 * nothing that already exists.
 */

/** Clearly-fake domain so a fixture user is never mistaken for a real member. */
const FIXTURE_DOMAIN = 'fixture.invalid';

/** bcrypt hash of "Fixture@2026" — dev only, and the accounts are `pending`. */
const FIXTURE_PASSWORD_HASH = '$2b$12$3Qw8YQKQ1oZ0rQe5Yv1nUeJ0Yq7yq7Q3o0m1Kk9Q8Nn2Xw6Yb1cKa';

interface FixtureSpec {
  /** Suffix for the application number and the applicant's email. */
  n: number;
  name: string;
  school: string;
  level: ScholarshipLevel;
  year: string;
  status: ScholarshipApplicationStatus;
  /** 0 = first published scholarship, 1 = second, and so on (wraps). */
  program: number;
  rejectionReason?: string;
}

/**
 * A believable spread rather than one of each: most applications sit early in
 * the pipeline, a few get decided. A board where every column holds exactly one
 * card does not show you what a busy review week looks like.
 */
const FIXTURES: FixtureSpec[] = [
  {
    n: 1,
    name: 'Aisha Uwimana',
    school: 'GS Kigali Islamic',
    level: ScholarshipLevel.SECONDARY,
    year: 'S4',
    status: ScholarshipApplicationStatus.DRAFT,
    program: 0,
  },
  {
    n: 2,
    name: 'Ibrahim Niyonzima',
    school: 'GS Nyamirambo',
    level: ScholarshipLevel.SECONDARY,
    year: 'S5',
    status: ScholarshipApplicationStatus.SUBMITTED,
    program: 0,
  },
  {
    n: 3,
    name: 'Fatuma Mukamana',
    school: 'GS Remera',
    level: ScholarshipLevel.SECONDARY,
    year: 'S5',
    status: ScholarshipApplicationStatus.SUBMITTED,
    program: 0,
  },
  {
    n: 4,
    name: 'Yusuf Habimana',
    school: 'GS Kicukiro',
    level: ScholarshipLevel.SECONDARY,
    year: 'S6',
    status: ScholarshipApplicationStatus.SUBMITTED,
    program: 0,
  },
  {
    n: 5,
    name: 'Khadija Ingabire',
    school: 'GS Gisozi',
    level: ScholarshipLevel.SECONDARY,
    year: 'S4',
    status: ScholarshipApplicationStatus.UNDER_REVIEW,
    program: 0,
  },
  {
    n: 6,
    name: 'Omar Nsengimana',
    school: 'GS Kimironko',
    level: ScholarshipLevel.SECONDARY,
    year: 'S5',
    status: ScholarshipApplicationStatus.UNDER_REVIEW,
    program: 0,
  },
  {
    n: 7,
    name: 'Zainab Mukandayisenga',
    school: 'GS Nyabugogo',
    level: ScholarshipLevel.SECONDARY,
    year: 'S6',
    status: ScholarshipApplicationStatus.APPROVED,
    program: 0,
  },
  {
    n: 8,
    name: 'Idriss Bizimana',
    school: 'GS Gikondo',
    level: ScholarshipLevel.SECONDARY,
    year: 'S6',
    status: ScholarshipApplicationStatus.CONFIRMED,
    program: 0,
  },
  {
    n: 9,
    name: 'Halima Uwase',
    school: 'GS Kanombe',
    level: ScholarshipLevel.SECONDARY,
    year: 'S4',
    status: ScholarshipApplicationStatus.REJECTED,
    program: 0,
    rejectionReason: 'Household income is above the threshold for this bursary.',
  },
  {
    n: 10,
    name: 'Salim Mugisha',
    school: 'University of Rwanda',
    level: ScholarshipLevel.UNIVERSITY,
    year: 'Year 2',
    status: ScholarshipApplicationStatus.SUBMITTED,
    program: 1,
  },
  {
    n: 11,
    name: 'Mariam Keza',
    school: 'INES Ruhengeri',
    level: ScholarshipLevel.UNIVERSITY,
    year: 'Year 1',
    status: ScholarshipApplicationStatus.UNDER_REVIEW,
    program: 1,
  },
  {
    n: 12,
    name: 'Bilal Rwigema',
    school: 'IPRC Kigali',
    level: ScholarshipLevel.TVET,
    year: 'Level 4',
    status: ScholarshipApplicationStatus.APPROVED,
    program: 1,
  },
];

/** Rwandan mobile format the app validates against: +250 7[2389] + 7 digits. */
const phoneFor = (n: number, offset = 0) =>
  `+2507${8}${String(1_000_000 + n * 137 + offset).slice(-6)}`;

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const users = AppDataSource.getRepository(User);
  const programs = AppDataSource.getRepository(ScholarshipProgram);
  const applications = AppDataSource.getRepository(ScholarshipApplication);
  const history = AppDataSource.getRepository(ScholarshipStatusHistory);

  // Only published scholarships: an application against a draft is a state the
  // app itself refuses to create, so a fixture must not manufacture it.
  const published = await programs.find({
    where: { status: ScholarshipProgramStatus.PUBLISHED },
    order: { createdAt: 'ASC' },
  });

  if (published.length === 0) {
    console.error(
      '[fixtures] No PUBLISHED scholarship found.\n' +
        '           Create and publish one in the admin first — an application must\n' +
        '           target a real scholarship (migration 054 makes program_id NOT NULL).',
    );
    await AppDataSource.destroy();
    process.exitCode = 1;
    return;
  }

  console.log(`[fixtures] ${published.length} published scholarship(s):`);
  for (const p of published) console.log(`             · ${p.title}`);

  let created = 0;
  let skipped = 0;

  for (const spec of FIXTURES) {
    const applicationNumber = `RMC-SCH-FIX-${String(spec.n).padStart(3, '0')}`;

    const existing = await applications.findOne({ where: { applicationNumber } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const email = `applicant${spec.n}@${FIXTURE_DOMAIN}`;
    let user = await users.findOne({ where: { email } });
    if (!user) {
      const [firstName, ...rest] = spec.name.split(' ');
      user = await users.save(
        users.create({
          email,
          phone: phoneFor(spec.n),
          passwordHash: FIXTURE_PASSWORD_HASH,
          firstName,
          lastName: rest.join(' ') || 'Applicant',
        }),
      );
    }

    const program = published[spec.program % published.length];
    const decided = [
      ScholarshipApplicationStatus.APPROVED,
      ScholarshipApplicationStatus.CONFIRMED,
      ScholarshipApplicationStatus.REJECTED,
    ].includes(spec.status);

    const entity = applications.create({
      applicationNumber,
      trackingCode: generateTrackingCode('RMC-SCH'),
      applicantId: user.id,
      programId: program.id,
      fullNames: spec.name,
      phone: phoneFor(spec.n),
      email,
      schoolName: spec.school,
      educationLevel: spec.level,
      currentYear: spec.year,
      guardianName: `${spec.name.split(' ').slice(-1)[0]} (guardian)`,
      guardianPhone: phoneFor(spec.n, 1),
      relationship: ScholarshipRelationship.PARENT,
      motivation:
        `I am applying for this scholarship because my family cannot meet the school fees ` +
        `this year. I am in ${spec.year} at ${spec.school} and intend to continue into ` +
        `higher education.`,
      status: spec.status,
      // A draft was never submitted — leaving submittedAt set would make the
      // tracking page claim a date the applicant never reached.
      submittedAt: spec.status === ScholarshipApplicationStatus.DRAFT ? null : new Date(),
      rejectionReason: spec.rejectionReason ?? null,
      reviewedAt: decided ? new Date() : null,
    });
    const application = await applications.save(entity);

    // One history row for anything past submission, so the public tracking page
    // and the admin timeline have something to draw.
    if (spec.status !== ScholarshipApplicationStatus.DRAFT) {
      await history.save(
        history.create({
          applicationId: application.id,
          fromStatus: null,
          toStatus: spec.status,
          changedBy: null,
          notes: 'Seeded by dev fixtures.',
        }),
      );
    }

    created += 1;
    console.log(
      `[fixtures] + ${applicationNumber}  ${spec.status.padEnd(13)} ${spec.name}  (${program.title})`,
    );
  }

  console.log(`[fixtures] done — ${created} created, ${skipped} already present.`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('[fixtures] failed:', err);
  process.exit(1);
});
