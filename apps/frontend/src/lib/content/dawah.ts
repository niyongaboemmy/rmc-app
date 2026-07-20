import { Tri, tri } from './client';

/**
 * Dawah Learning landing-page content (admin-managed in Content → Dawah).
 *
 * The prose blocks ONLY. Courses and books are real records with their own
 * tables, slugs and admin screens — they are not CMS copy, and nothing here
 * should ever try to describe one. This holds the hero and the description
 * section: the words around the catalogue, not the catalogue.
 *
 * Kinyarwanda and Arabic are left empty. `pick()` falls back to English until a
 * translator fills them, which is the intended state — a wrong Kinyarwanda
 * rendering of a religious term is worse than an English one a reader can still
 * understand.
 */
export interface DawahContent {
  hero: {
    eyebrow: Tri;
    title: Tri;
    subtitle: Tri;
  };
  /**
   * The prose block under the hero. `body` is HTML from the admin rich-text
   * editor, so it MUST be sanitised before it is rendered.
   */
  description: {
    eyebrow: Tri;
    title: Tri;
    body: Tri;
  };
  /** Heading above the course outline pulled from /dawah/courses/featured. */
  courses: {
    eyebrow: Tri;
    title: Tri;
    subtitle: Tri;
    /** The "browse all" button under the featured grid. */
    cta: Tri;
  };
  /**
   * The two cards at the foot of the page.
   *
   * Deliberately its OWN copy rather than reusing `courses` above: the courses
   * card sits a few hundred pixels below the courses section heading, and
   * pointing both at the same Tri rendered the identical eyebrow, title and
   * subtitle twice on one page. An editor must be able to word the invitation
   * differently from the section it follows.
   */
  cta: {
    courses: {
      eyebrow: Tri;
      title: Tri;
      subtitle: Tri;
      action: Tri;
    };
    library: {
      eyebrow: Tri;
      title: Tri;
      subtitle: Tri;
      action: Tri;
    };
  };
}

/**
 * Seeded copy. English and Arabic are written; Kinyarwanda is deliberately left
 * empty (`tri()`'s second argument), so `pick()` falls back to English on /rw
 * until a Kinyarwanda speaker fills it in through Content → Dawah.
 *
 * That gap is honest, not an oversight: a mistranslated religious term reads
 * worse to a Rwandan Muslim than plain English does, and the CMS is the right
 * place for a human to fix it — no code change needed.
 */
export const DAWAH_DEFAULT: DawahContent = {
  hero: {
    eyebrow: tri('Dawah Learning', '', 'التعلّم والدعوة'),
    title: tri(
      'Learn your deen, at your own pace',
      '',
      'تعلَّم دينك، وفق وتيرتك الخاصة',
    ),
    subtitle: tri(
      'Structured courses and a growing library of books — free, and open to everyone in our community.',
      '',
      'دورات منظّمة ومكتبة متنامية من الكتب — مجانًا، ومتاحة لكل أفراد مجتمعنا.',
    ),
  },
  description: {
    eyebrow: tri('About Dawah Learning', '', 'عن التعلّم والدعوة'),
    title: tri('Knowledge that stays with you', '', 'علمٌ يبقى معك'),
    body: tri(
      '<p>Dawah Learning brings the teaching of our scholars into one place. Whether you are taking your first steps in the deen or deepening study you began years ago, the courses here are built to be followed at your own pace, in your own time.</p>' +
        '<p>Every course is free. Every book in the library is free to read. Start wherever you are.</p>',
      '',
      '<p>يجمع قسم التعلّم والدعوة تعليم علمائنا في مكان واحد. سواء كنت تخطو خطواتك الأولى في الدين أو تعمّق دراسةً بدأتها منذ سنوات، فقد أُعِدّت هذه الدورات لتتابعها وفق وتيرتك وفي وقتك الذي يناسبك.</p>' +
        '<p>كل دورة مجانية، وكل كتاب في المكتبة متاح للقراءة مجانًا. ابدأ من حيث أنت.</p>',
    ),
  },
  courses: {
    eyebrow: tri('Courses', '', 'الدورات'),
    title: tri('Where to begin', '', 'من أين تبدأ'),
    subtitle: tri(
      'A selection of courses from across the curriculum — from Qur’an recitation to the fiqh of daily worship.',
      '',
      'مجموعة مختارة من الدورات عبر المنهج — من تلاوة القرآن إلى فقه العبادات اليومية.',
    ),
    cta: tri('Browse all courses', '', 'تصفّح كل الدورات'),
  },
  cta: {
    courses: {
      eyebrow: tri('Courses', '', 'الدورات'),
      title: tri('Study at your own pace', '', 'ادرس وفق وتيرتك'),
      subtitle: tri(
        'Browse the full catalogue and filter by subject, level or language to find the course that fits where you are.',
        '',
        'تصفّح الفهرس كاملًا وصفِّ الدورات حسب الموضوع أو المستوى أو اللغة لتجد ما يناسب مستواك.',
      ),
      action: tri('Browse all courses', '', 'تصفّح كل الدورات'),
    },
    library: {
      eyebrow: tri('Library', '', 'المكتبة'),
      title: tri('Read from our collection', '', 'اقرأ من مجموعتنا'),
      subtitle: tri(
        'Classical and contemporary works, readable right in your browser — no account needed for most of them.',
        '',
        'مؤلفات كلاسيكية ومعاصرة يمكن قراءتها مباشرة في متصفحك — ومعظمها لا يحتاج إلى حساب.',
      ),
      action: tri('Open the library', '', 'افتح المكتبة'),
    },
  },
};
