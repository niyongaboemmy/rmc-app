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
 * The step and FAQ lists are FIXED-LENGTH on purpose. `mergeContent` walks arrays
 * by index, so a removable item would inherit the seeded item that used to sit at
 * its index and reappear (see the note in `HajjSteps` for the version of this
 * problem that needed solving). Editing the text of a fixed list is safe; adding
 * and removing entries needs the unmerged-read treatment and is not offered here.
 */

/** One numbered step in a "how to apply" rail. */
export interface BoardStep {
  title: Tri;
  text: Tri;
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
  q: Tri;
  a: Tri;
}

/** Scholarships carry an FAQ and a closing call to action on top of the board. */
export interface ScholarshipServiceContent extends ServiceBoardContent {
  faq: { title: Tri; items: BoardFaq[] };
  cta: { title: Tri; subtitle: Tri; startLabel: Tri; contactLabel: Tri };
}

/* ── Tenders ─────────────────────────────────────────────────────────────── */

export const TENDER_SERVICE_DEFAULT: ServiceBoardContent = {
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
      {
        title: tri('Browse open tenders', 'Reba amatumba akinguye', 'تصفح المناقصات المفتوحة'),
        text: tri(
          'Find an opportunity on the tenders board and read its terms and deadline.',
          "Shakisha ihirwe ku rutonde rw'amatumba usome amabwiriza n'igihe ntarengwa.",
          'ابحث عن فرصة في لوحة المناقصات واقرأ شروطها وموعدها النهائي.',
        ),
      },
      {
        title: tri('Complete the form', 'Uzuza ifishi', 'أكمل النموذج'),
        text: tri(
          'Give your company details, contact person, address and bid amount.',
          "Tanga amakuru y'ikigo cyawe, umuhuza, aderesi, n'igiciro utanga.",
          'أدخل بيانات شركتك، ومسؤول التواصل، والعنوان، وقيمة عرضك.',
        ),
      },
      {
        title: tri('Upload your documents', 'Ohereza inyandiko', 'ارفع وثائقك'),
        text: tri(
          'Attach the three required documents. PDF, JPG or PNG, up to 10 MB each.',
          'Shyiraho inyandiko eshatu zisabwa. PDF, JPG cyangwa PNG, ntizirenge 10 MB.',
          'أرفق الوثائق الثلاث المطلوبة. PDF أو JPG أو PNG، بحد أقصى 10 ميغابايت لكل ملف.',
        ),
      },
      {
        title: tri('Track your bid', 'Kurikirana ipiganwa', 'تتبّع عرضك'),
        text: tri(
          'Get a reference number, then follow your bid from evaluation to award.',
          "Uzahabwa nomero y'ipiganwa, ukurikirane uko rigenda kugeza ku mwanzuro.",
          'احصل على رقم مرجعي، ثم تابع عرضك من التقييم حتى الترسية.',
        ),
      },
    ],
  },
};

/* ── Jobs ────────────────────────────────────────────────────────────────── */

export const JOBS_SERVICE_DEFAULT: ServiceBoardContent = {
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
      {
        title: tri('Sign in', 'Injira', 'تسجيل الدخول'),
        text: tri(
          "Sign in to your RMC account, or register in a minute if you're new.",
          'Injira kuri konti yawe ya RMC, cyangwa wiyandikishe mu munota umwe niba uri mushya.',
          'سجّل الدخول إلى حسابك في RMC، أو أنشئ حسابًا في دقيقة إن كنت جديدًا.',
        ),
      },
      {
        title: tri('Fill your details', 'Uzuza amakuru yawe', 'أدخل بياناتك'),
        text: tri(
          "Enter your personal details and the position you're applying for.",
          "Andika amakuru yawe bwite n'umwanya usaba.",
          'أدخل بياناتك الشخصية والوظيفة التي تتقدم لها.',
        ),
      },
      {
        title: tri('Upload your documents', 'Ohereza inyandiko zawe', 'ارفع مستنداتك'),
        text: tri(
          'Attach your application letter, CV, National ID, criminal record and academic papers.',
          "Ohereza ibaruwa isaba, CV, Indangamuntu, icyemezo cy'imyifatire n'impamyabumenyi.",
          'أرفق خطاب التقديم والسيرة الذاتية والهوية الوطنية وشهادة السجل الجنائي والشهادات الأكاديمية.',
        ),
      },
      {
        title: tri('Add good conduct', "Ongeraho icyemezo cy'imyifatire", 'أضف حسن السيرة'),
        text: tri(
          'Verify your good-conduct certificate number, or upload the certificate.',
          "Genzura nimero y'icyemezo cy'imyifatire, cyangwa uohereze icyemezo.",
          'تحقّق من رقم شهادة حسن السيرة، أو ارفع الشهادة.',
        ),
      },
      {
        title: tri('Submit & track', 'Ohereza & ukurikirane', 'أرسل وتابع'),
        text: tri(
          'Submit and keep your tracking number to follow your application status.',
          'Ohereza ubike nimero yo gukurikirana kugira ngo urebe aho isaba rigeze.',
          'أرسل واحتفظ برقم التتبع لمتابعة حالة طلبك.',
        ),
      },
    ],
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
      {
        title: tri('Browse open scholarships', 'Reba buruse zikinguye', 'تصفح المنح المفتوحة'),
        text: tri(
          'Find a scholarship on this page and read its eligibility and deadline.',
          "Shaka buruse kuri iyi paji hanyuma usome ibisabwa n'itariki ntarengwa.",
          'اختر منحة من هذه الصفحة واقرأ شروطها وموعدها النهائي.',
        ),
      },
      {
        title: tri('Complete the form', 'Uzuza ifishi', 'أكمل النموذج'),
        text: tri(
          'Give your personal, education and guardian details.',
          "Tanga amakuru yawe bwite, ay'uburezi, n'ay'umurera.",
          'أدخل بياناتك الشخصية والتعليمية وبيانات ولي أمرك.',
        ),
      },
      {
        title: tri('Upload your documents', 'Ohereza inyandiko', 'ارفع وثائقك'),
        text: tri(
          'Attach the documents that scholarship asks for.',
          'Shyiraho inyandiko izo buruse isaba.',
          'أرفق الوثائق التي تطلبها المنحة.',
        ),
      },
      {
        title: tri('Track your application', 'Kurikirana ubusabe bwawe', 'تتبّع طلبك'),
        text: tri(
          'Get a tracking code, then follow your application to the decision.',
          'Wakira kode yo gukurikirana, hanyuma ukurikirane ubusabe bwawe kugeza ku cyemezo.',
          'احصل على رمز التتبع، ثم تابع طلبك حتى القرار.',
        ),
      },
    ],
  },
  faq: {
    title: tri('Frequently asked questions', 'Ibibazo Bikunze Kubazwa', 'الأسئلة الشائعة'),
    items: [
      {
        q: tri(
          'Do I need an account to apply?',
          'Ese ngomba kuba mfite konti kugira nsabe?',
          'هل أحتاج إلى حساب للتقديم؟',
        ),
        a: tri(
          'Yes — you need to sign in to your RMC account to submit an application.',
          'Yego — ugomba kwinjira kuri konti yawe ya RMC kugira ngo wohereze ubusabe.',
          'نعم — يجب تسجيل الدخول إلى حسابك في RMC لإرسال طلب.',
        ),
      },
      {
        q: tri('Is there a fee to apply?', 'Hari amafaranga yo gusaba?', 'هل هناك رسوم للتقديم؟'),
        a: tri(
          'No, applying for a scholarship does not require any payment.',
          'Oya, gusaba buruse ntibisaba kwishyura.',
          'لا، التقديم على منحة دراسية لا يتطلب أي دفع.',
        ),
      },
      {
        q: tri(
          'How do I check my application status?',
          'Nakurikirana nte aho ubusabe bwanjye bugeze?',
          'كيف أتحقق من حالة طلبي؟',
        ),
        a: tri(
          'Use the tracking number you received after submitting, on the "Check Status" page — no account needed.',
          'Koresha nomero yo gukurikirana wahawe nyuma yo kohereza, ku rupapuro rwa "Reba Aho Bigeze" — nta konti ikenewe.',
          'استخدم رقم التتبع الذي حصلت عليه بعد الإرسال، في صفحة "تحقق من الحالة" — دون الحاجة إلى حساب.',
        ),
      },
      {
        q: tri(
          "Can I apply again if I'm not approved?",
          'Nashobora gusaba nanone niba ntemewe?',
          'هل يمكنني التقديم مرة أخرى إذا لم يُقبل طلبي؟',
        ),
        a: tri(
          "Yes, you're welcome to submit a new application.",
          'Yego, urakaza neza kohereza ubundi busabe bushya.',
          'نعم، يسعدنا أن تقدّم طلبًا جديدًا.',
        ),
      },
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
};
