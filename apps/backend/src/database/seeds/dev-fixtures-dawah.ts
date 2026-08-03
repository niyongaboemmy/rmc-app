import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../config/data-source';
import { DawahCategory } from '../../dawah/entities/dawah-category.entity';
import {
  DawahCourse,
  ContentStatus,
  CourseLevel,
  CourseFormat,
} from '../../dawah/entities/dawah-course.entity';
import { DawahCourseLesson } from '../../dawah/entities/dawah-course-lesson.entity';

/**
 * LOCAL DEVELOPMENT FIXTURES — deliberately NOT registered in run-seeds.ts.
 *
 * Production runs the seed chain, so demo courses must never be in it. Run this
 * by hand when you need something on the page:
 *
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/dev-fixtures-dawah.ts
 *
 * Requires 08-dawah-categories to have run (it attaches courses to those slugs).
 * Idempotent by slug.
 *
 * No fixture BOOKS: dawah_books.file_key is NOT NULL and must point at real
 * bytes under the file-server's protected `dawah-library/` prefix. A book row
 * with an invented key is a record whose preview and download both fail — the
 * Library would look broken rather than empty. Upload a real PDF through the
 * admin UI instead once Phase 2B exists. Courses need no files to render.
 */
const COURSES = [
  {
    slug: 'foundations-of-quran-recitation',
    categorySlug: 'quran-studies',
    titleEn: 'Foundations of Qur’an Recitation',
    summaryEn:
      'Learn the rules of tajweed from the ground up, with guided practice on the short surahs.',
    descriptionEn:
      '<p>A practical introduction to correct recitation: articulation points, the rules of noon and meem sakinah, and the lengthenings. Suitable for complete beginners.</p>',
    level: CourseLevel.BEGINNER,
    format: CourseFormat.SELF_PACED,
    instructorName: 'Sheikh Musa Bizimana',
    instructorTitle: 'Qur’an Instructor, Grand Mosque of Kigali',
    durationMinutes: 420,
    isFeatured: true,
    sortOrder: 1,
    lessons: [
      ['Introduction to Tajweed', 'Why recitation has rules, and what they protect.'],
      ['The Articulation Points (Makharij)', 'Where each letter is formed in the mouth and throat.'],
      ['Noon and Meem Sakinah', 'Idgham, ikhfa, iqlab and izhar in practice.'],
      ['The Rules of Madd', 'Recognising and measuring the lengthenings.'],
    ],
  },
  {
    slug: 'introduction-to-fiqh-of-worship',
    categorySlug: 'fiqh',
    titleEn: 'Introduction to the Fiqh of Worship',
    summaryEn:
      'Purification, prayer, fasting and zakat — the rulings every Muslim needs for daily practice.',
    descriptionEn:
      '<p>Covers the acts of worship in the order the classical texts treat them, with attention to the questions that come up most often in Rwanda.</p>',
    level: CourseLevel.BEGINNER,
    format: CourseFormat.HYBRID,
    instructorName: 'Sheikh Idris Habimana',
    instructorTitle: 'Lecturer in Islamic Jurisprudence',
    durationMinutes: 600,
    isFeatured: true,
    sortOrder: 2,
    lessons: [
      ['Purification (Taharah)', 'Wudu, ghusl and tayammum.'],
      ['The Prayer (Salah)', 'Conditions, pillars and the common invalidators.'],
      ['Fasting (Sawm)', 'Ramadan, its exemptions and make-up days.'],
      ['Zakat', 'Who pays, on what, and how much.'],
    ],
  },
  {
    slug: 'seerah-the-makkan-period',
    categorySlug: 'seerah',
    titleEn: 'Seerah: The Makkan Period',
    summaryEn:
      'The life of the Prophet ﷺ from birth to the Hijrah, and what it teaches about patience under trial.',
    descriptionEn:
      '<p>A narrative course through the first thirteen years of prophethood, drawing lessons for a community in the minority.</p>',
    level: CourseLevel.INTERMEDIATE,
    format: CourseFormat.IN_PERSON,
    instructorName: 'Dr. Aisha Uwimana',
    instructorTitle: 'Islamic History',
    durationMinutes: 480,
    isFeatured: false,
    sortOrder: 3,
    lessons: [
      ['Arabia Before Islam', 'The world the Prophet ﷺ was born into.'],
      ['The First Revelation', 'Hira, and the years of quiet call.'],
      ['Persecution and Patience', 'The boycott and the Year of Sorrow.'],
    ],
  },
];

async function seedDawahDevFixtures(): Promise<void> {
  await AppDataSource.initialize();
  console.log('[FIXTURES] Connected. Seeding Dawah dev fixtures...');

  const categoryRepo = AppDataSource.getRepository(DawahCategory);
  const courseRepo = AppDataSource.getRepository(DawahCourse);
  const lessonRepo = AppDataSource.getRepository(DawahCourseLesson);

  for (const c of COURSES) {
    const existing = await courseRepo.findOne({
      where: { slug: c.slug },
      withDeleted: true,
    });
    if (existing) {
      console.log(`  [FIXTURES] Course "${c.slug}" already exists — skipped`);
      continue;
    }

    const category = await categoryRepo.findOne({ where: { slug: c.categorySlug } });
    if (!category) {
      console.log(
        `  [FIXTURES] Category "${c.categorySlug}" missing — run \`npm run seed\` first. Skipping "${c.slug}".`,
      );
      continue;
    }

    const course = await courseRepo.save(
      courseRepo.create({
        slug: c.slug,
        categoryId: category.id,
        titleEn: c.titleEn,
        summaryEn: c.summaryEn,
        descriptionEn: c.descriptionEn,
        level: c.level,
        format: c.format,
        language: 'en',
        instructorName: c.instructorName,
        instructorTitle: c.instructorTitle,
        durationMinutes: c.durationMinutes,
        // Denormalised, and normally the service's job to maintain. Nothing
        // else writes it yet, so the fixture sets it to match the lessons below.
        lessonCount: c.lessons.length,
        isFeatured: c.isFeatured,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
        sortOrder: c.sortOrder,
      }),
    );

    await lessonRepo.save(
      c.lessons.map(([titleEn, summaryEn], i) =>
        lessonRepo.create({
          courseId: course.id,
          titleEn,
          summaryEn,
          bodyEn: `<p>${summaryEn}</p>`,
          sortOrder: i + 1,
        }),
      ),
    );

    console.log(`  [FIXTURES] Created "${c.titleEn}" with ${c.lessons.length} lessons`);
  }

  await AppDataSource.destroy();
  console.log('[FIXTURES] Done.');
}

seedDawahDevFixtures().catch((err) => {
  console.error('[FIXTURES] Error:', err);
  process.exit(1);
});
