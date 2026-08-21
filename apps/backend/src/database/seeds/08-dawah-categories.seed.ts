import { DataSource } from 'typeorm';
import { DawahCategory } from '../../dawah/entities/dawah-category.entity';

/**
 * Seeds the shared Dawah taxonomy — one set of categories serving both the
 * course catalogue and the library, so "Fiqh" means the same thing in both.
 *
 * On translations: English is populated, Kinyarwanda is left empty, and Arabic
 * is filled only for the classical disciplines whose Arabic name *is* the
 * original term (الفقه is not a translation of "Fiqh", it is the word). The UI
 * falls back to English by design, and a wrong Kinyarwanda religious term is
 * worse than an empty one a human fills in later. RMC's content team completes
 * the rw column in the admin UI.
 */
const CATEGORIES = [
  { slug: 'quran-studies', nameEn: 'Qur’an Studies', nameRw: '', nameAr: 'علوم القرآن', icon: 'BookOpen', sortOrder: 1 },
  { slug: 'hadith', nameEn: 'Hadith', nameRw: '', nameAr: 'الحديث', icon: 'Scroll', sortOrder: 2 },
  { slug: 'fiqh', nameEn: 'Fiqh', nameRw: '', nameAr: 'الفقه', icon: 'Scale', sortOrder: 3 },
  { slug: 'aqeedah', nameEn: 'Aqeedah', nameRw: '', nameAr: 'العقيدة', icon: 'Compass', sortOrder: 4 },
  { slug: 'seerah', nameEn: 'Seerah', nameRw: '', nameAr: 'السيرة النبوية', icon: 'Sparkles', sortOrder: 5 },
  { slug: 'arabic-language', nameEn: 'Arabic Language', nameRw: '', nameAr: 'اللغة العربية', icon: 'Languages', sortOrder: 6 },
  { slug: 'new-muslims', nameEn: 'New Muslims', nameRw: '', nameAr: 'المسلمون الجدد', icon: 'Heart', sortOrder: 7 },
  { slug: 'family-life', nameEn: 'Family Life', nameRw: '', nameAr: 'الحياة الأسرية', icon: 'Users', sortOrder: 8 },
];

export async function seedDawahCategories(dataSource: DataSource): Promise<void> {
  const categoryRepo = dataSource.getRepository(DawahCategory);

  console.log('[SEED] Seeding Dawah categories...');

  let created = 0;

  for (const c of CATEGORIES) {
    // `withDeleted` matters twice over. It stops us re-creating a category an
    // admin has deliberately soft-deleted, and — because the slug is UNIQUE at
    // the DB level and a soft-deleted row still occupies it — a plain findOne
    // would miss the row and then blow up on the insert.
    const existing = await categoryRepo.findOne({
      where: { slug: c.slug },
      withDeleted: true,
    });

    if (existing) {
      // Deliberately does NOT refresh names / icon / sort_order, unlike the
      // roles seed. These are admin-editable content: production runs this
      // seed, and an update pass would silently overwrite a translation the
      // content team had entered — writing back the empty nameRw above — or
      // undo a reordering. Create-if-missing is the only non-destructive
      // idempotent shape for editable rows.
      continue;
    }

    await categoryRepo.save(categoryRepo.create(c));
    created += 1;
    console.log(`  [SEED] Created category "${c.nameEn}"`);
  }

  console.log(
    `[SEED] Dawah categories seed complete — ${created} created, ${CATEGORIES.length - created} already present.`,
  );
}
