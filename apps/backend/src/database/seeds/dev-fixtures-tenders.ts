import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { AppDataSource } from '../../config/data-source';
import { Announcement } from '../../public/entities/announcement.entity';
import { slugify } from '../../common/slugify.util';

/**
 * LOCAL DEVELOPMENT FIXTURES — deliberately NOT registered in run-seeds.ts.
 *
 * Production runs the seed chain, so demo tenders must never be in it. Run by
 * hand when the tender board needs something to show:
 *
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/dev-fixtures-tenders.ts
 *
 * WAS `09-tenders.seed.ts`, in the production chain. It had to come out: these
 * rows are written `isPublished: true` with a backdated `publishAt`, so the
 * chain put six invented tenders straight onto the public board — and the bid
 * wizard populates its picker from the open ones. A contractor could file a real
 * bid, with real RDB and tax-clearance documents and a real tracking code,
 * against a tender RMC never issued.
 *
 * Covers every status the UI distinguishes (open, closing-soon, closed) plus a
 * no-deadline case and all three priorities, because the board and the
 * `/services/tender` landing page branch on all of them.
 *
 * Deadlines are relative to run time — a fixed date would drift into "closed"
 * and the fixture would stop exercising the open-tender paths.
 *
 * On the attachments: their keys point at nothing on the file-server, so the
 * attachment LIST renders (name, type, size) and the download 404s. That is the
 * point of keeping them — layout work needs the list — and it is survivable
 * here in a way it would not be for a library book, whose file IS the record
 * (see the no-fixture-books note in dev-fixtures-dawah.ts). Never let these
 * reach an environment where someone might click them in earnest.
 *
 * Idempotent by English title.
 */
type SeedTender = {
  title: { en: string; rw: string; ar: string };
  content: { en: string; rw: string; ar: string };
  priority: 'normal' | 'high' | 'urgent';
  /** Days from now until the deadline; null = no deadline. Negative = closed. */
  expiresInDays: number | null;
  attachments?: Array<{ key: string; name: string; mimeType: string; size: number }>;
};

const TENDERS: SeedTender[] = [
  {
    title: {
      en: 'Construction of Masjid Perimeter Wall',
      rw: 'Kubaka Urukuta Rukikije Umusigiti',
      ar: 'بناء السور المحيط بالمسجد',
    },
    content: {
      en: 'RMC invites sealed bids from registered contractors for the construction of a reinforced perimeter wall at the central mosque, including two gated entrances. Site visit is mandatory before submission.',
      rw: 'RMC itumira abarangizacyubaka biyandikishije gutanga inyandiko z’ipiganwa zo kubaka urukuta rukomeye rukikije umusigiti rwagati, harimo amarembo abiri. Gusura aho umushinga uzakorerwa ni itegeko mbere yo gutanga.',
      ar: 'تدعو RMC المقاولين المسجّلين لتقديم عطاءات مغلقة لبناء سور محيط مُدعّم للمسجد المركزي، بما في ذلك مدخلان ببوابتين. زيارة الموقع إلزامية قبل التقديم.',
    },
    priority: 'high',
    expiresInDays: 30,
    attachments: [
      {
        key: 'tender-seed/wall-boq.pdf',
        name: 'Bill of Quantities.pdf',
        mimeType: 'application/pdf',
        size: 284_100,
      },
      {
        key: 'tender-seed/wall-drawings.pdf',
        name: 'Architectural Drawings.pdf',
        mimeType: 'application/pdf',
        size: 1_204_880,
      },
    ],
  },
  {
    title: {
      en: 'Supply and Delivery of Office Furniture',
      rw: 'Gutanga no Gutwara Ibikoresho by’Ibiro',
      ar: 'توريد وتسليم أثاث المكاتب',
    },
    content: {
      en: 'Procurement of desks, ergonomic chairs, and filing cabinets for the RMC administrative offices. Bidders must provide a valid RRA tax clearance and a detailed price schedule.',
      rw: 'Kugura ameza, intebe zoroshye, n’amakabine yo kubika inyandiko ku biro by’ubuyobozi bya RMC. Abapiganwa bagomba gutanga icyemezo cy’umusoro cya RRA gifite agaciro n’urutonde rw’ibiciro.',
      ar: 'شراء مكاتب وكراسي مريحة وخزائن ملفات لمكاتب RMC الإدارية. يجب على مقدّمي العطاءات تقديم شهادة مخالصة ضريبية سارية من RRA وجدول أسعار مفصّل.',
    },
    priority: 'normal',
    expiresInDays: 21,
  },
  {
    title: {
      en: 'Catering Services for the Annual Eid Gathering',
      rw: 'Serivisi zo Gutegura Ifunguro ku Muhango wa Idi',
      ar: 'خدمات التموين لتجمّع العيد السنوي',
    },
    content: {
      en: 'Experienced caterers are invited to bid for the provision of halal meals for approximately 2,000 attendees at the annual Eid gathering. Proven capacity for large-scale events is required.',
      rw: 'Abategura ifunguro b’inararibonye batumiwe gupiganira gutanga ifunguro rya halal ku bantu bagera ku 2,000 mu muhango wa Idi wa buri mwaka. Ubushobozi bugaragara bwo gukora ibirori binini burakenewe.',
      ar: 'يُدعى متعهّدو التموين ذوو الخبرة لتقديم عطاءات لتوفير وجبات حلال لنحو 2000 مشارك في تجمّع العيد السنوي. يُشترط إثبات القدرة على تنظيم الفعاليات الكبيرة.',
    },
    priority: 'urgent',
    expiresInDays: 4,
    attachments: [
      {
        key: 'tender-seed/eid-menu-spec.pdf',
        name: 'Menu Specification.pdf',
        mimeType: 'application/pdf',
        size: 96_400,
      },
    ],
  },
  {
    title: {
      en: 'Procurement of IT Equipment and Networking',
      rw: 'Kugura Ibikoresho bya IT no Guhuza Imiyoboro',
      ar: 'توريد معدّات تقنية المعلومات والشبكات',
    },
    content: {
      en: 'Supply of laptops, a network switch, and structured cabling for the new RMC resource centre. Warranty terms and after-sales support will be weighted in the evaluation.',
      rw: 'Gutanga mudasobwa zigendanwa, switch ya reseau, n’imigozi ihujwe neza ku kigo gishya cya RMC. Ibisabwa ku ngwate na serivisi zo nyuma yo kugura bizitabwaho mu isuzuma.',
      ar: 'توريد حواسيب محمولة ومبدّل شبكة وتمديدات كابلات منظّمة لمركز موارد RMC الجديد. سيُؤخذ الضمان والدعم بعد البيع في الاعتبار عند التقييم.',
    },
    priority: 'high',
    expiresInDays: 6,
  },
  {
    title: {
      en: 'Security Guard Services Contract',
      rw: 'Amasezerano ya Serivisi z’Abarinzi',
      ar: 'عقد خدمات الحراسة الأمنية',
    },
    content: {
      en: 'RMC seeks a licensed security firm to provide round-the-clock guarding across three sites on a renewable one-year contract. Open until a suitable provider is selected.',
      rw: 'RMC ishaka ikigo cy’umutekano cyemewe gutanga umurinzi amasaha 24 ku bibanza bitatu ku masezerano y’umwaka umwe ashobora kongerwa. Bifunguye kugeza igihe umutanga bikwiye azatoranyirizwa.',
      ar: 'تبحث RMC عن شركة أمن مرخّصة لتوفير حراسة على مدار الساعة في ثلاثة مواقع بعقد سنوي قابل للتجديد. مفتوح حتى يتم اختيار مزوّد مناسب.',
    },
    priority: 'normal',
    expiresInDays: null,
  },
  {
    title: {
      en: 'Printing of Educational Materials',
      rw: 'Gucapa Ibikoresho by’Uburezi',
      ar: 'طباعة المواد التعليمية',
    },
    content: {
      en: 'Printing and binding of 5,000 copies of Islamic educational booklets in Kinyarwanda. This tender has now closed; it is retained here for reference.',
      rw: 'Gucapa no guhuza kopi 5,000 z’udutabo tw’uburezi bw’Idini mu Kinyarwanda. Iri piganwa ryarangiye; ribitswe hano kugira ngo rifashe mu kwifashisha.',
      ar: 'طباعة وتجليد 5000 نسخة من الكتيّبات التعليمية الإسلامية باللغة الكينيارواندية. أُغلقت هذه المناقصة الآن؛ وتُحفظ هنا للاطّلاع.',
    },
    priority: 'normal',
    expiresInDays: -5,
  },
];

async function main(): Promise<void> {
  await AppDataSource.initialize();
  console.log('[fixtures] Connected. Seeding tender fixtures...');

  const repo = AppDataSource.getRepository(Announcement);

  // created_by is NOT NULL — attribute the fixture rows to the earliest user.
  const [owner] = await AppDataSource.query<{ id: string }[]>(
    'SELECT id FROM users ORDER BY created_at ASC LIMIT 1',
  );
  if (!owner?.id) {
    console.log(
      '[fixtures] No user found for created_by — run `npm run seed` first. Nothing done.',
    );
    await AppDataSource.destroy();
    return;
  }

  const now = Date.now();
  const publishAt = new Date(now - 10 * 86_400_000); // published 10 days ago
  let created = 0;

  // Tenders are addressed by slug — dedupe against every slug already stored.
  const usedSlugs = new Set<string>(
    (
      await repo
        .createQueryBuilder('a')
        .select('a.slug', 'slug')
        .where('a.slug IS NOT NULL')
        .getRawMany<{ slug: string }>()
    ).map((r) => r.slug),
  );
  const uniqueSlug = (title: string): string => {
    const base = slugify(title) || 'tender';
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);
    return slug;
  };

  for (const tk of TENDERS) {
    const existing = await repo.findOne({
      where: { title: tk.title.en, type: 'tender' },
      withDeleted: true,
    });
    if (existing) continue;

    await repo.save(
      repo.create({
        title: tk.title.en,
        content: tk.content.en,
        titleI18n: tk.title,
        contentI18n: tk.content,
        slug: uniqueSlug(tk.title.en),
        priority: tk.priority,
        targetAudience: 'all',
        publishAt,
        expiresAt: tk.expiresInDays === null ? null : new Date(now + tk.expiresInDays * 86_400_000),
        isPublished: true,
        type: 'tender',
        attachments: tk.attachments ?? [],
        createdBy: owner.id,
      }),
    );
    created += 1;
    console.log(`[fixtures] + ${tk.title.en}`);
  }

  console.log(`[fixtures] done — ${created} created, ${TENDERS.length - created} already present.`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('[fixtures] failed:', err);
  process.exit(1);
});
