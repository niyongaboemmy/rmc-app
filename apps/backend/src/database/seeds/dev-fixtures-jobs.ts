import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../config/data-source';
import {
  JobPosting,
  JobPostingStatus,
  EmploymentType,
} from '../../job-applications/entities/job-posting.entity';
import { slugify } from '../../common/slugify.util';

/**
 * LOCAL DEVELOPMENT FIXTURES — deliberately NOT registered in run-seeds.ts.
 *
 * Production runs the seed chain, so demo vacancies must never be in it. Run by
 * hand when the jobs pages need something to show:
 *
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/dev-fixtures-jobs.ts
 *
 * Covers all three statuses and every employment type, because both the public
 * listing and the admin screens branch on them — a fixture set of five identical
 * open full-time roles would leave most of that code untested by eye.
 *
 * Idempotent by slug, which is also the table's unique index.
 */

interface PostingSpec {
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  status: JobPostingStatus;
  positions: number;
  salaryRange?: string;
  /** Days from today; negative is in the past. Undefined = no deadline. */
  deadlineInDays?: number;
  description: string;
  responsibilities: string;
  requirements: string;
}

const POSTINGS: PostingSpec[] = [
  {
    title: 'Imam — Nyamirambo Central Mosque',
    department: 'Religious Affairs',
    location: 'Nyamirambo, Kigali',
    employmentType: EmploymentType.FULL_TIME,
    status: JobPostingStatus.OPEN,
    positions: 1,
    salaryRange: '450,000 – 600,000 RWF / month',
    deadlineInDays: 21,
    description:
      'Lead the five daily prayers and Jumu’ah at Nyamirambo Central Mosque, and guide the ' +
      'congregation on matters of worship and family life.',
    responsibilities:
      'Lead daily and Friday prayers.\nDeliver the khutbah.\nTeach weekly halaqah for adults and youth.\n' +
      'Counsel families referred by the mosque committee.',
    requirements:
      'Ijazah in Qur’an recitation or an equivalent qualification.\nAt least three years leading a congregation.\n' +
      'Fluent Kinyarwanda and Arabic; English an advantage.',
  },
  {
    title: 'Arabic Teacher — RMC Islamic School',
    department: 'Education',
    location: 'Kicukiro, Kigali',
    employmentType: EmploymentType.FULL_TIME,
    status: JobPostingStatus.OPEN,
    positions: 2,
    salaryRange: '350,000 – 450,000 RWF / month',
    deadlineInDays: 14,
    description: 'Teach Arabic language and Islamic studies to secondary students, S1 to S6.',
    responsibilities:
      'Plan and deliver lessons to the national curriculum.\nSet and mark termly assessments.\n' +
      'Report on each learner’s progress to parents.',
    requirements:
      'Bachelor’s degree in Arabic, Education or a related field.\nTeaching experience at secondary level.\n' +
      'Registration with the Rwanda Education Board.',
  },
  {
    title: 'Communications Officer',
    department: 'Communications',
    location: 'RMC Head Office, Kigali',
    employmentType: EmploymentType.FULL_TIME,
    status: JobPostingStatus.OPEN,
    positions: 1,
    salaryRange: '500,000 – 700,000 RWF / month',
    // Deliberately close, so the "closing soon" treatment on the listing is
    // visible without editing anything.
    deadlineInDays: 4,
    description:
      'Run RMC’s public communications across the website, social channels and the ' +
      'monthly newsletter.',
    responsibilities:
      'Write and schedule content in Kinyarwanda and English.\nManage the social accounts.\n' +
      'Photograph and write up community events.',
    requirements:
      'Degree in Communications, Journalism or similar.\nA portfolio of published work.\n' +
      'Excellent written Kinyarwanda and English.',
  },
  {
    title: 'Accountant (Maternity Cover)',
    department: 'Finance',
    location: 'RMC Head Office, Kigali',
    employmentType: EmploymentType.CONTRACT,
    status: JobPostingStatus.OPEN,
    positions: 1,
    salaryRange: '600,000 RWF / month',
    deadlineInDays: 30,
    description: 'Six-month contract covering the finance desk, with possible extension.',
    responsibilities:
      'Maintain the ledgers and monthly reconciliations.\nPrepare donation and zakat reports.\n' +
      'Support the annual external audit.',
    requirements: 'CPA part-qualified or above.\nThree years in a finance role.\nStrong Excel.',
  },
  {
    title: 'Youth Programme Coordinator',
    department: 'Community',
    location: 'Gasabo, Kigali',
    employmentType: EmploymentType.PART_TIME,
    status: JobPostingStatus.OPEN,
    positions: 1,
    salaryRange: '250,000 RWF / month',
    deadlineInDays: 45,
    description: 'Coordinate weekend youth activities across three mosques in Gasabo.',
    responsibilities:
      'Plan the term’s activity calendar.\nRecruit and brief volunteers.\nKeep attendance and safeguarding records.',
    requirements: 'Experience working with 12–18 year olds.\nAvailable Saturdays and Sundays.',
  },
  {
    title: 'IT Support Intern',
    department: 'Operations',
    location: 'RMC Head Office, Kigali',
    employmentType: EmploymentType.INTERNSHIP,
    status: JobPostingStatus.OPEN,
    positions: 2,
    salaryRange: 'Stipend — 120,000 RWF / month',
    deadlineInDays: 10,
    description: 'Six-month internship supporting RMC’s office IT and the digital platform.',
    responsibilities:
      'First-line support for staff laptops and printers.\nKeep the asset register current.\n' +
      'Assist with website content updates.',
    requirements: 'Studying or recently graduated in IT or Computer Science.\nWilling to learn.',
  },
  {
    title: 'Volunteer — Funeral Services Assistant',
    department: 'Community',
    location: 'Kigali (city-wide)',
    employmentType: EmploymentType.VOLUNTEER,
    status: JobPostingStatus.OPEN,
    positions: 5,
    deadlineInDays: undefined, // ongoing — exercises the "no deadline" branch
    description:
      'Support bereaved families with ghusl, transport and burial arrangements. Training provided.',
    responsibilities:
      'Assist with the preparation of the deceased.\nHelp coordinate transport.\nAccompany families at the graveside.',
    requirements: 'Muslim in good standing with a local mosque.\nAble to respond at short notice.',
  },
  {
    title: 'Librarian — RMC Islamic Library',
    department: 'Education',
    location: 'Nyarugenge, Kigali',
    employmentType: EmploymentType.PART_TIME,
    status: JobPostingStatus.CLOSED,
    positions: 1,
    salaryRange: '280,000 RWF / month',
    deadlineInDays: -12, // closed and past — the archive state on the listing
    description: 'Care for the collection and help readers find what they need.',
    responsibilities:
      'Catalogue new acquisitions.\nRun the lending desk.\nHost a weekly reading hour.',
    requirements: 'Library qualification or equivalent experience.',
  },
  {
    title: 'Head of Programmes',
    department: 'Leadership',
    location: 'RMC Head Office, Kigali',
    employmentType: EmploymentType.FULL_TIME,
    status: JobPostingStatus.DRAFT, // never public — proves the listing filters it out
    positions: 1,
    salaryRange: 'Negotiable',
    deadlineInDays: 60,
    description: 'Still being drafted — should not appear on the public listing.',
    responsibilities: 'To be confirmed.',
    requirements: 'To be confirmed.',
  },
];

const daysFromNow = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const postings = AppDataSource.getRepository(JobPosting);

  let created = 0;
  let skipped = 0;

  for (const spec of POSTINGS) {
    const slug = slugify(spec.title);

    // Slug is the table's unique index, so it is also the idempotency key.
    // withDeleted: a soft-deleted row still occupies it.
    const existing = await postings.findOne({ where: { slug }, withDeleted: true });
    if (existing) {
      skipped += 1;
      continue;
    }

    await postings.save(
      postings.create({
        title: spec.title,
        slug,
        department: spec.department,
        location: spec.location,
        employmentType: spec.employmentType,
        description: spec.description,
        responsibilities: spec.responsibilities,
        requirements: spec.requirements,
        numberOfPositions: spec.positions,
        salaryRange: spec.salaryRange ?? null,
        status: spec.status,
        applicationDeadline:
          spec.deadlineInDays === undefined ? null : daysFromNow(spec.deadlineInDays),
        // A draft was never published, so it has no publishedAt. Setting one
        // would date a vacancy nobody has ever been able to see.
        publishedAt: spec.status === JobPostingStatus.DRAFT ? null : new Date(),
      }),
    );

    created += 1;
    console.log(
      `[fixtures] + ${spec.status.padEnd(6)} ${spec.employmentType.padEnd(10)} ${spec.title}`,
    );
  }

  console.log(`[fixtures] done — ${created} created, ${skipped} already present.`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('[fixtures] failed:', err);
  process.exit(1);
});
