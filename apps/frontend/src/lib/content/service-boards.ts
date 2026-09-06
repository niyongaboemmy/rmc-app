import { Tri, tri } from './client';

/**
 * Copy for the three "service board" pages — Tenders, Jobs and Scholarships.
 *
 * All three are the same page: a hero, a list of records with a header above it,
 * and a "how to apply" rail. The code already says so — the jobs page is
 * documented as mirroring the tenders board, and the scholarship steps are
 * deliberately kept in the tenders board's order. One shape for all three keeps
 * that true, which is why these live together rather than in a file each: a
 * per-section file would either duplicate the interface or need a fourth module
 * to hold it.
 *
 * Seeded from the `services.{tender,jobs,scholarship}` i18n messages that used to
 * be the only source, so the pages read identically until an admin edits them.
 * Those message keys stay where they are — the functional chrome around the copy
 * (search boxes, table headers, status labels, "Back to Services") is still i18n
 * and should be: it is UI, not copy anyone would want to rewrite per-locale.
 *
 * The STEPS and the scholarship FAQ are read through `boardSteps()` / `boardFaqs()`
 * rather than the merged blob, which is what lets an admin add and remove them — see
 * those functions for why a merged read cannot.
 */

/** One numbered step in a "how to apply" rail. */
export interface BoardStep {
  /** Stable id, so React keys survive reordering. Any unique string. */
  id?: string;
  title: Tri;
  text: Tri;
}

/**
 * The steps an admin has saved, or the seeded ones when the section has never been
 * edited.
 *
 * Deliberately NOT run through `mergeContent`: that merges arrays by index, so an
 * admin who deletes step 2 leaves step 3 sitting at index 2 — and any translation
 * that step has not been given would then be filled from the SEEDED step 2, text
 * belonging to a step that is no longer on the page. Read raw, an empty translation
 * simply falls back to the step's own English via `pick()`.
 *
 * Takes the unmerged value: the live edit-mode draft when there is one, else exactly
 * what the store returned. `defaults` is this board's own seed, used only when the
 * section has never been saved — an admin who deletes every step gets an empty rail,
 * not the seeded one back.
 */
export function boardSteps(saved: unknown, defaults: ServiceBoardContent): BoardStep[] {
  return unmergedList((saved as ServiceBoardContent | null)?.steps?.items, defaults.steps.items, 'step', titleText);
}

/**
 * Shared body of the unmerged-list readers.
 *
 * `items` is whatever the store held at that path. Anything that is not an array —
 * unset section, malformed blob — falls back to the seed; an array is taken exactly
 * as saved, which is the whole point (see {@link boardSteps}).
 */
export function unmergedList<T>(
  items: unknown,
  fallback: T[],
  idPrefix: string,
  make: (item: Record<string, unknown> | null, id: string) => T,
): T[] {
  if (!Array.isArray(items)) return fallback;
  return items.map((item, i) =>
    make(item ?? null, (item as { id?: string } | null)?.id || `${idPrefix}-${i}`),
  );
}

/** The `{ id, title, text }` entry shape steps and requirements share. */
function titleText(item: Record<string, unknown> | null, id: string): BoardStep {
  return {
    id,
    title: (item?.title as Tri) ?? tri(''),
    text: (item?.text as Tri) ?? tri(''),
  };
}

/**
 * The education levels an admin has saved, or the seeded three when the section
 * has never been edited. Unmerged for the reason {@link boardSteps} explains —
 * merging by index would attach one level's Kinyarwanda label to another's key.
 */
export function boardLevels(saved: unknown, defaults: ScholarshipServiceContent): BoardLevel[] {
  return unmergedList(
    (saved as ScholarshipServiceContent | null)?.levels,
    defaults.levels,
    'lvl',
    (item, id) => ({ id, label: (item?.label as Tri) ?? tri('') }),
  );
}

/**
 * The label for a stored level key, or null when the key names a level that no
 * longer exists.
 *
 * Null rather than the raw key: `university` is a passable fallback but
 * `lvl1757012345678` is not, and a programme pointing at a deleted level should
 * show nothing rather than debris. Callers hide the chip.
 */
export function levelLabel(levels: BoardLevel[], key: string | null | undefined): Tri | null {
  if (!key) return null;
  return levels.find((l) => l.id === key)?.label ?? null;
}

/** Build a seeded step; the id keeps React keys stable across reordering. */
function step(id: string, title: Tri, text: Tri): BoardStep {
  return { id, title, text };
}

/** The hero + board header + steps every service board shares. */
export interface ServiceBoardContent {
  hero: { title: Tri; subtitle: Tri };
  /** Header sitting directly above the list of records. */
  browse: { title: Tri; note: Tri };
  steps: { title: Tri; items: BoardStep[] };
}

/** One collapsible question in the scholarship FAQ. */
export interface BoardFaq {
  /** Stable id, so React keys survive reordering. Any unique string. */
  id?: string;
  q: Tri;
  a: Tri;
}

/**
 * The FAQ entries an admin has saved, or the seeded ones when the section has never
 * been edited. The `boardSteps` counterpart, and unmerged for the same reason: a
 * deleted question would otherwise leave the one that shifts up wearing the seeded
 * question's translations.
 */
export function boardFaqs(saved: unknown, defaults: ScholarshipServiceContent): BoardFaq[] {
  return unmergedList(
    (saved as ScholarshipServiceContent | null)?.faq?.items,
    defaults.faq.items,
    'faq',
    (item, id) => ({
      id,
      q: (item?.q as Tri) ?? tri(''),
      a: (item?.a as Tri) ?? tri(''),
    }),
  );
}

/** A required document on the tender detail page — same shape as a step. */
export type BoardRequirement = BoardStep;

/**
 * An education level a scholarship can be offered at.
 *
 * `id` IS the key stored on the programme row — it is not a React key that
 * happens to persist. That is why the three seeded levels keep the ids
 * `secondary`, `tvet` and `university`: those are the exact strings already in
 * `scholarship_programs.level`, so moving this list into the CMS renames nothing
 * and orphans nothing.
 *
 * A level added later gets a generated id, which is opaque but stable. Stable is
 * what matters: an admin correcting a typo in a LABEL must not silently
 * re-point every programme that used it, which is what deriving the key from the
 * label would do.
 */
export interface BoardLevel {
  id: string;
  label: Tri;
}

/**
 * The bid requirements an admin has saved, or the seeded ones when the section has
 * never been edited. Unmerged for the reason {@link boardSteps} explains.
 */
export function boardRequirements(
  saved: unknown,
  defaults: TenderServiceContent,
): BoardRequirement[] {
  return unmergedList(
    (saved as TenderServiceContent | null)?.detail?.requirements?.items,
    defaults.detail.requirements.items,
    'req',
    titleText,
  );
}

/** Build a seeded FAQ entry; the id keeps React keys stable across reordering. */
function faq(id: string, q: Tri, a: Tri): BoardFaq {
  return { id, q, a };
}

/**
 * Copy on a single record's page — one tender, one opening, one scholarship.
 *
 * Section headings, the closing CTA and the states a detail page can land in. NOT
 * the record's own fields (its title, description, deadline): those come from the
 * API and are edited on the record's own admin screen.
 *
 * Field micro-labels ("Location", "Salary") and the deadline phrases stay in i18n.
 * The deadline strings carry `{days}` and plural forms, and an admin who drops the
 * placeholder would silently print the sentence with no number in it.
 */
export interface TenderDetailCopy {
  eyebrow: Tri;
  heroTitle: Tri;
  descriptionTitle: Tri;
  /** Rendered with the file count appended, so the number never reaches an editor. */
  attachmentsTitle: Tri;
  cta: { title: Tri; subtitle: Tri; button: Tri };
  notFound: { heroTitle: Tri; title: Tri; body: Tri; backLink: Tri };
  /**
   * "What you need before you start" — the documents any bid must carry. Generic to
   * the service, not to one tender: a tender's OWN attachments are its records.
   * Read through `boardRequirements()`, so entries can be added and removed.
   */
  requirements: { title: Tri; subtitle: Tri; items: BoardStep[] };
}

export interface JobsDetailCopy {
  eyebrow: Tri;
  overviewTitle: Tri;
  aboutTitle: Tri;
  requirementsTitle: Tri;
  responsibilitiesTitle: Tri;
  cta: { title: Tri; subtitle: Tri };
  notFound: Tri;
  closed: { title: Tri; body: Tri };
}

export interface ScholarshipDetailCopy {
  aboutTitle: Tri;
  documentsTitle: Tri;
  attachmentsTitle: Tri;
  need: { title: Tri; subtitle: Tri };
  cta: { title: Tri; body: Tri };
  notFound: { title: Tri; body: Tri };
  closedNotice: Tri;
  notOpenYet: Tri;
}

/** Tenders and Jobs are the plain board plus their record page. */
export interface TenderServiceContent extends ServiceBoardContent {
  detail: TenderDetailCopy;
}

export interface JobsServiceContent extends ServiceBoardContent {
  detail: JobsDetailCopy;
}

/** Scholarships carry an FAQ and a closing call to action on top of the board. */
export interface ScholarshipServiceContent extends ServiceBoardContent {
  faq: { title: Tri; items: BoardFaq[] };
  cta: { title: Tri; subtitle: Tri; startLabel: Tri; contactLabel: Tri };
  detail: ScholarshipDetailCopy;
  levels: BoardLevel[];
}

/* ── Tenders ─────────────────────────────────────────────────────────────── */

export const TENDER_SERVICE_DEFAULT: TenderServiceContent = {
  hero: {
    title: tri('Tenders', 'Itumba', 'المناقصات'),
    subtitle: tri(
      'Business opportunities published by RMC for qualified organizations and contractors.',
      "Amahirwe y'ubucuruzi ashyirwa ahagaragara na RMC ku mashirika n'abakozi bafite ubushobozi.",
      'الفرص التجارية التي تنشرها المجتمع الإسلامي الرواندي للمنظمات والمقاولين المؤهلين.',
    ),
  },
  browse: {
    title: tri('Browse open tenders', 'Reba amasoko afunguye', 'تصفّح المناقصات المفتوحة'),
    note: tri(
      'Every procurement and contracting opportunity currently published by RMC. Filter by status or search to find a specific tender, then open it for full details and attachments.',
      "Amahirwe yose y'amasoko RMC yatangaje. Yungurura ukurikije uko ahagaze cyangwa ushakishe kugira ngo ubone isoko runaka, hanyuma urifungure urebe amakuru yuzuye n'inyandiko ziriho.",
      'جميع فرص التوريد والتعاقد المنشورة حاليًا من قِبل RMC. صفِّ حسب الحالة أو ابحث للعثور على مناقصة معيّنة، ثم افتحها لعرض التفاصيل الكاملة والمرفقات.',
    ),
  },
  steps: {
    title: tri('How to apply', 'Uko usaba', 'كيفية التقديم'),
    items: [
      step(
        'browse',
        tri('Browse open tenders', 'Reba amatumba akinguye', 'تصفح المناقصات المفتوحة'),
        tri(
          'Find an opportunity on the tenders board and read its terms and deadline.',
          "Shakisha ihirwe ku rutonde rw'amatumba usome amabwiriza n'igihe ntarengwa.",
          'ابحث عن فرصة في لوحة المناقصات واقرأ شروطها وموعدها النهائي.',
        ),
      ),
      step(
        'form',
        tri('Complete the form', 'Uzuza ifishi', 'أكمل النموذج'),
        tri(
          'Give your company details, contact person, address and bid amount.',
          "Tanga amakuru y'ikigo cyawe, umuhuza, aderesi, n'igiciro utanga.",
          'أدخل بيانات شركتك، ومسؤول التواصل، والعنوان، وقيمة عرضك.',
        ),
      ),
      step(
        'documents',
        tri('Upload your documents', 'Ohereza inyandiko', 'ارفع وثائقك'),
        tri(
          'Attach the three required documents. PDF, JPG or PNG, up to 10 MB each.',
          'Shyiraho inyandiko eshatu zisabwa. PDF, JPG cyangwa PNG, ntizirenge 10 MB.',
          'أرفق الوثائق الثلاث المطلوبة. PDF أو JPG أو PNG، بحد أقصى 10 ميغابايت لكل ملف.',
        ),
      ),
      step(
        'track',
        tri('Track your bid', 'Kurikirana ipiganwa', 'تتبّع عرضك'),
        tri(
          'Get a reference number, then follow your bid from evaluation to award.',
          "Uzahabwa nomero y'ipiganwa, ukurikirane uko rigenda kugeza ku mwanzuro.",
          'احصل على رقم مرجعي، ثم تابع عرضك من التقييم حتى الترسية.',
        ),
      ),
    ],
  },
  detail: {
    eyebrow: tri('Business Opportunities', "Amahirwe y'Ubucuruzi", 'فرص الأعمال'),
    heroTitle: tri('Tender Details', "Amakuru y'Umushinga", 'تفاصيل المناقصة'),
    descriptionTitle: tri('Tender Description', "Ibisobanuro by'Umushinga", 'وصف المناقصة'),
    attachmentsTitle: tri('Attachments', 'Inyandiko', 'المرفقات'),
    cta: {
      title: tri('Interested in this tender?', 'Uzirikana uyu mushinga?', 'مهتم بهذه المناقصة؟'),
      subtitle: tri(
        'Submit your bid before the deadline.',
        "Ohereza ipiganwa ryawe mbere y'igihe ntarengwa.",
        'قدّم عرضك قبل انتهاء الموعد.',
      ),
      button: tri('Submit a bid', 'Tanga ipiganwa', 'قدّم عطاءً'),
    },
    notFound: {
      heroTitle: tri('Not Found', 'Ntabwo Byabonetse', 'غير موجود'),
      title: tri('Tender not found', 'Umushinga ntuboneka', 'المناقصة غير موجودة'),
      body: tri(
        'It may have been removed or the link is invalid.',
        'Ushobora kuba wakuweho cyangwa uhuze ntabwo ari wo.',
        'ربما تمت إزالتها أو الرابط غير صحيح.',
      ),
      backLink: tri('View all tenders', 'Reba imishinga yose', 'عرض جميع المناقصات'),
    },
    requirements: {
      title: tri(
        'What you need before you start',
        'Ibyo ukeneye mbere yo gutangira',
        'ما تحتاجه قبل البدء',
      ),
      subtitle: tri(
        'Have these ready — you cannot submit a bid without them.',
        'Ibi bigomba kuba byiteguye — ntushobora gutanga ipiganwa utabifite.',
        'جهّز هذه المستندات — لا يمكنك تقديم عرض بدونها.',
      ),
      items: [
        step(
          'rdb',
          tri(
            'Company Registration (RDB) certificate',
            "Icyemezo cy'iyandikwa ry'ikigo (RDB)",
            'شهادة تسجيل الشركة (RDB)',
          ),
          tri(
            'Your certificate of incorporation from the Rwanda Development Board.',
            "Icyemezo cy'iyandikwa ry'ikigo cyawe gitangwa na Rwanda Development Board.",
            'شهادة تأسيس شركتك الصادرة عن مجلس تنمية رواندا.',
          ),
        ),
        step(
          'tax',
          tri('RRA Tax Clearance certificate', "Icyemezo cy'imisoro (RRA)", 'شهادة المخالصة الضريبية (RRA)'),
          tri(
            'A valid tax clearance certificate from the Rwanda Revenue Authority.',
            "Icyemezo cyemewe cy'uko wishyuye imisoro gitangwa na Rwanda Revenue Authority.",
            'شهادة مخالصة ضريبية سارية صادرة عن هيئة الإيرادات الرواندية.',
          ),
        ),
        step(
          'proposal',
          tri('Technical & Financial Proposal', "Igitekerezo cya tekiniki n'imari", 'العرض الفني والمالي'),
          tri(
            'Your full proposal for the tender, including your pricing.',
            "Igitekerezo cyawe cyuzuye ku itumba, hamwe n'ibiciro.",
            'عرضك الكامل للمناقصة، متضمنًا التسعير.',
          ),
        ),
        step(
          'company',
          tri('Company details', "Amakuru y'ikigo", 'بيانات الشركة'),
          tri(
            'Your registered company name, 9-digit TIN, and a contact person we can reach.',
            "Izina ry'ikigo cyawe cyanditse, nomero ya TIN y'imibare 9, n'umuhuza twabasha kuvugana.",
            'اسم شركتك المسجل، ورقم التعريف الضريبي المكوّن من 9 أرقام، ومسؤول تواصل.',
          ),
        ),
        step(
          'deadline',
          tri('Time before the deadline', "Igihe mbere y'igihe ntarengwa", 'وقت قبل الموعد النهائي'),
          tri(
            "Bids cannot be submitted or edited once a tender's deadline has passed.",
            'Ipiganwa ntirishobora gutangwa cyangwa guhindurwa igihe ntarengwa cyarenze.',
            'لا يمكن تقديم العروض أو تعديلها بعد انتهاء الموعد النهائي للمناقصة.',
          ),
        ),
      ],
    },
  },
};

/* ── Jobs ────────────────────────────────────────────────────────────────── */

export const JOBS_SERVICE_DEFAULT: JobsServiceContent = {
  hero: {
    title: tri('Job Opportunities', "Amahirwe y'Akazi", 'فرص العمل'),
    subtitle: tri(
      'Apply for open positions at RMC and affiliated organizations, and track your application status.',
      "Saba imyanya ifunguye muri RMC n'imiryango ishamikiyeho, ukurikirane aho isaba ryawe rigeze.",
      'تقدّم للوظائف الشاغرة في المجتمع الإسلامي الرواندي والمنظمات التابعة له، وتابع حالة طلبك.',
    ),
  },
  browse: {
    title: tri('Browse open positions', 'Reba imyanya ifunguye', 'تصفّح الوظائف المفتوحة'),
    note: tri(
      'Every role currently open at RMC and affiliated organizations. Filter by status or search to find a specific position, then open it for full details.',
      "Imyanya yose ifunguye muri RMC n'imiryango ishamikiyeho. Yungurura ukurikije uko ihagaze cyangwa ushakishe umwanya runaka, hanyuma uwufungure kugira ngo urebe amakuru yose.",
      'كل وظيفة مفتوحة حالياً في المجتمع الإسلامي الرواندي والمنظمات التابعة له. صفِّ حسب الحالة أو ابحث عن وظيفة محددة، ثم افتحها لعرض كامل التفاصيل.',
    ),
  },
  steps: {
    title: tri('How to apply', 'Uko usaba', 'كيفية التقديم'),
    items: [
      step(
        'signin',
        tri('Sign in', 'Injira', 'تسجيل الدخول'),
        tri(
          "Sign in to your RMC account, or register in a minute if you're new.",
          'Injira kuri konti yawe ya RMC, cyangwa wiyandikishe mu munota umwe niba uri mushya.',
          'سجّل الدخول إلى حسابك في RMC، أو أنشئ حسابًا في دقيقة إن كنت جديدًا.',
        ),
      ),
      step(
        'details',
        tri('Fill your details', 'Uzuza amakuru yawe', 'أدخل بياناتك'),
        tri(
          "Enter your personal details and the position you're applying for.",
          "Andika amakuru yawe bwite n'umwanya usaba.",
          'أدخل بياناتك الشخصية والوظيفة التي تتقدم لها.',
        ),
      ),
      step(
        'documents',
        tri('Upload your documents', 'Ohereza inyandiko zawe', 'ارفع مستنداتك'),
        tri(
          'Attach your application letter, CV, National ID, criminal record and academic papers.',
          "Ohereza ibaruwa isaba, CV, Indangamuntu, icyemezo cy'imyifatire n'impamyabumenyi.",
          'أرفق خطاب التقديم والسيرة الذاتية والهوية الوطنية وشهادة السجل الجنائي والشهادات الأكاديمية.',
        ),
      ),
      step(
        'conduct',
        tri('Add good conduct', "Ongeraho icyemezo cy'imyifatire", 'أضف حسن السيرة'),
        tri(
          'Verify your good-conduct certificate number, or upload the certificate.',
          "Genzura nimero y'icyemezo cy'imyifatire, cyangwa uohereze icyemezo.",
          'تحقّق من رقم شهادة حسن السيرة، أو ارفع الشهادة.',
        ),
      ),
      step(
        'submit',
        tri('Submit & track', 'Ohereza & ukurikirane', 'أرسل وتابع'),
        tri(
          'Submit and keep your tracking number to follow your application status.',
          'Ohereza ubike nimero yo gukurikirana kugira ngo urebe aho isaba rigeze.',
          'أرسل واحتفظ برقم التتبع لمتابعة حالة طلبك.',
        ),
      ),
    ],
  },
  detail: {
    eyebrow: tri('Career opportunities', "Amahirwe y'akazi", 'فرص وظيفية'),
    overviewTitle: tri('Job overview', 'Incamake y’akazi', 'نظرة عامة على الوظيفة'),
    aboutTitle: tri('About this role', 'Ibyerekeye uyu mwanya', 'عن هذه الوظيفة'),
    requirementsTitle: tri('Requirements', 'Ibisabwa', 'المتطلبات'),
    responsibilitiesTitle: tri('Responsibilities', 'Inshingano', 'المسؤوليات'),
    cta: {
      title: tri('Interested in this role?', 'Ushishikajwe n’uyu mwanya?', 'مهتم بهذه الوظيفة؟'),
      subtitle: tri(
        'Submit your application before the deadline.',
        'Ohereza ubusabe bwawe mbere y’igihe ntarengwa.',
        'قدّم طلبك قبل الموعد النهائي.',
      ),
    },
    notFound: tri(
      'This position is no longer available.',
      'Uyu mwanya ntukiriho.',
      'هذه الوظيفة لم تعد متاحة.',
    ),
    closed: {
      title: tri('Applications closed', 'Isaba ryafunzwe', 'انتهى وقت التقديم'),
      body: tri(
        'The application deadline for this position has passed.',
        'Igihe cyo gusaba uyu mwanya cyararangiye.',
        'انتهى الموعد النهائي للتقديم لهذه الوظيفة.',
      ),
    },
  },
};

/* ── Scholarships ────────────────────────────────────────────────────────── */

export const SCHOLARSHIP_SERVICE_DEFAULT: ScholarshipServiceContent = {
  hero: {
    title: tri('Scholarships', 'Buruse', 'المنح الدراسية'),
    subtitle: tri(
      'Financial support for Muslim students pursuing education at all levels.',
      "Inkunga y'amafaranga kuri abanyeshuri b'Abasilamu bavoma uburezi mu mashuri yose.",
      'دعم مالي للطلاب المسلمين الساعين إلى التعليم على جميع المستويات.',
    ),
  },
  browse: {
    title: tri('Available Scholarships', 'Buruse Ziboneka', 'المنح الدراسية المتاحة'),
    note: tri(
      'Open scholarship programs you can apply for right now.',
      'Porogaramu za buruse zifunguye ushobora gusaba nonaha.',
      'برامج المنح الدراسية المفتوحة التي يمكنك التقديم عليها الآن.',
    ),
  },
  steps: {
    title: tri('How to apply', 'Uko Usaba', 'كيف تتقدّم'),
    items: [
      step(
        'browse',
        tri('Browse open scholarships', 'Reba buruse zikinguye', 'تصفح المنح المفتوحة'),
        tri(
          'Find a scholarship on this page and read its eligibility and deadline.',
          "Shaka buruse kuri iyi paji hanyuma usome ibisabwa n'itariki ntarengwa.",
          'اختر منحة من هذه الصفحة واقرأ شروطها وموعدها النهائي.',
        ),
      ),
      step(
        'form',
        tri('Complete the form', 'Uzuza ifishi', 'أكمل النموذج'),
        tri(
          'Give your personal, education and guardian details.',
          "Tanga amakuru yawe bwite, ay'uburezi, n'ay'umurera.",
          'أدخل بياناتك الشخصية والتعليمية وبيانات ولي أمرك.',
        ),
      ),
      step(
        'documents',
        tri('Upload your documents', 'Ohereza inyandiko', 'ارفع وثائقك'),
        tri(
          'Attach the documents that scholarship asks for.',
          'Shyiraho inyandiko izo buruse isaba.',
          'أرفق الوثائق التي تطلبها المنحة.',
        ),
      ),
      step(
        'track',
        tri('Track your application', 'Kurikirana ubusabe bwawe', 'تتبّع طلبك'),
        tri(
          'Get a tracking code, then follow your application to the decision.',
          'Wakira kode yo gukurikirana, hanyuma ukurikirane ubusabe bwawe kugeza ku cyemezo.',
          'احصل على رمز التتبع، ثم تابع طلبك حتى القرار.',
        ),
      ),
    ],
  },
  faq: {
    title: tri('Frequently asked questions', 'Ibibazo Bikunze Kubazwa', 'الأسئلة الشائعة'),
    items: [
      faq(
        'account',
        tri(
          'Do I need an account to apply?',
          'Ese ngomba kuba mfite konti kugira nsabe?',
          'هل أحتاج إلى حساب للتقديم؟',
        ),
        tri(
          'Yes — you need to sign in to your RMC account to submit an application.',
          'Yego — ugomba kwinjira kuri konti yawe ya RMC kugira ngo wohereze ubusabe.',
          'نعم — يجب تسجيل الدخول إلى حسابك في RMC لإرسال طلب.',
        ),
      ),
      faq(
        'fee',
        tri('Is there a fee to apply?', 'Hari amafaranga yo gusaba?', 'هل هناك رسوم للتقديم؟'),
        tri(
          'No, applying for a scholarship does not require any payment.',
          'Oya, gusaba buruse ntibisaba kwishyura.',
          'لا، التقديم على منحة دراسية لا يتطلب أي دفع.',
        ),
      ),
      faq(
        'status',
        tri(
          'How do I check my application status?',
          'Nakurikirana nte aho ubusabe bwanjye bugeze?',
          'كيف أتحقق من حالة طلبي؟',
        ),
        tri(
          'Use the tracking number you received after submitting, on the "Check Status" page — no account needed.',
          'Koresha nomero yo gukurikirana wahawe nyuma yo kohereza, ku rupapuro rwa "Reba Aho Bigeze" — nta konti ikenewe.',
          'استخدم رقم التتبع الذي حصلت عليه بعد الإرسال، في صفحة "تحقق من الحالة" — دون الحاجة إلى حساب.',
        ),
      ),
      faq(
        'reapply',
        tri(
          "Can I apply again if I'm not approved?",
          'Nashobora gusaba nanone niba ntemewe?',
          'هل يمكنني التقديم مرة أخرى إذا لم يُقبل طلبي؟',
        ),
        tri(
          "Yes, you're welcome to submit a new application.",
          'Yego, urakaza neza kohereza ubundi busabe bushya.',
          'نعم، يسعدنا أن تقدّم طلبًا جديدًا.',
        ),
      ),
    ],
  },
  cta: {
    title: tri(
      'Ready to apply for a scholarship?',
      'Witeguye gusaba buruse?',
      'هل أنت مستعد للتقديم على منحة دراسية؟',
    ),
    subtitle: tri(
      'Sign in and submit your application in just a few minutes.',
      'Injira hanyuma wohereze ubusabe bwawe mu minota mike gusa.',
      'سجّل الدخول وأرسل طلبك في دقائق معدودة.',
    ),
    startLabel: tri('Start application', 'Tangira ubusabe', 'ابدأ الطلب'),
    contactLabel: tri('Contact us', 'Twandikire', 'تواصل معنا'),
  },
  detail: {
    aboutTitle: tri('About this scholarship', 'Ibyerekeye iyi buruse', 'عن هذه المنحة'),
    documentsTitle: tri(
      'Documents you must attach',
      'Inyandiko ugomba gushyiraho',
      'الوثائق المطلوب إرفاقها',
    ),
    attachmentsTitle: tri('Attachments', 'Inyandiko zometse', 'المرفقات'),
    need: {
      title: tri("What you'll need", 'Ibyo Ukeneye', 'ما الذي تحتاجه'),
      subtitle: tri(
        'Have these ready before you start your application.',
        'Byiteguze mbere yo gutangira ubusabe bwawe.',
        'جهّز هذه المعلومات قبل بدء طلبك.',
      ),
    },
    cta: {
      title: tri(
        'Ready to apply for a scholarship?',
        'Witeguye gusaba buruse?',
        'هل أنت مستعد للتقديم على منحة دراسية؟',
      ),
      body: tri(
        'Apply before the deadline. You will get a tracking code to follow your application.',
        'Saba mbere y’itariki ntarengwa. Uzahabwa kode yo gukurikirana ubusabe bwawe.',
        'قدّم قبل الموعد النهائي. ستحصل على رمز تتبع لمتابعة طلبك.',
      ),
    },
    notFound: {
      title: tri('Scholarship not found', 'Buruse ntiyabonetse', 'المنحة غير موجودة'),
      body: tri(
        'It may have been withdrawn, or the link is out of date.',
        'Ishobora kuba yarakuwemo, cyangwa iyi link yarataye igihe.',
        'ربما تم سحبها، أو أن الرابط قديم.',
      ),
    },
    closedNotice: tri(
      'This scholarship is closed and is no longer accepting applications.',
      'Iyi buruse yarafunzwe, ntikiyakira ubusabe.',
      'هذه المنحة مغلقة ولم تعد تستقبل الطلبات.',
    ),
    notOpenYet: tri(
      'Applications for this scholarship have not opened yet.',
      'Gusaba iyi buruse ntibiratangira.',
      'لم يبدأ التقديم على هذه المنحة بعد.',
    ),
  },
  /**
   * The education levels the programme form offers.
   *
   * These three ids are the exact strings already stored in
   * `scholarship_programs.level`, so seeding them here renames nothing. An admin
   * may now add, rename, reorder or remove levels; the id of one they add is
   * generated and permanent, because it is what gets written to the programme.
   */
  levels: [
    { id: 'secondary', label: tri('Secondary School', 'Amashuri yisumbuye', 'المدرسة الثانوية') },
    { id: 'tvet', label: tri('TVET / Vocational', 'TVET / Imyuga', 'التعليم والتدريب المهني') },
    { id: 'university', label: tri('University', 'Kaminuza', 'الجامعة') },
  ],
};
