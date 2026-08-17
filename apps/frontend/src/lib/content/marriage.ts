import { Tri, tri } from './client';

/**
 * Marriage services page content (admin-managed in Content → Marriage Page).
 *
 * Every heading, blurb, list entry and button on /services/marriage. Seeded verbatim
 * from the `services.marriage` i18n messages it replaces, so the page reads
 * identically until an admin edits it.
 *
 * NOT here: the application wizard's own fields, placeholders and validation, which
 * are UI rather than copy — a validation string an admin can reword is one that can
 * stop matching what the form enforces.
 *
 * The four lists are read through `marriageList()` rather than the merged blob, so
 * entries can be added and removed. `mergeContent` walks arrays by index, and after a
 * deletion the entry that shifts up would otherwise inherit the seeded entry's
 * translations for anything it has not been given.
 */

/** A titled list entry — "what's included" and the process steps share this shape. */
export interface MarriageItem {
  /** Stable id, so React keys survive reordering. Any unique string. */
  id?: string;
  title: Tri;
  text: Tri;
}

/** A requirement is a single line, with no title of its own. */
export interface MarriageRequirement {
  id?: string;
  text: Tri;
}

export interface MarriageFaq {
  id?: string;
  q: Tri;
  a: Tri;
}

export interface MarriageContent {
  hero: {
    badge: Tri;
    title: Tri;
    subtitle: Tri;
    startLabel: Tri;
    statusLabel: Tri;
  };
  /** The two-column intro: heading in two parts, two paragraphs, and the photo badge. */
  overview: {
    heading: Tri;
    /** Rendered in gold immediately after `heading`. */
    headingHighlight: Tri;
    p1: Tri;
    p2: Tri;
    badge: Tri;
    badgeSub: Tri;
  };
  includes: { title: Tri; subtitle: Tri; items: MarriageItem[] };
  process: { title: Tri; subtitle: Tri; items: MarriageItem[] };
  requirements: { title: Tri; subtitle: Tri; items: MarriageRequirement[] };
  /**
   * The fee table. Amounts are plain `Tri` text, not numbers: they carry their own
   * currency wording per language, and an admin changing a fee should not need a
   * deploy.
   */
  fees: {
    title: Tri;
    subtitle: Tri;
    mosqueLabel: Tri;
    mosqueAmount: Tri;
    outsideLabel: Tri;
    outsideAmount: Tri;
    clauseTitle: Tri;
    clause: Tri;
  };
  faq: { title: Tri; items: MarriageFaq[] };
  cta: { title: Tri; subtitle: Tri; startLabel: Tri; contactLabel: Tri };
}

/** Build a seeded list entry; the id keeps React keys stable across reordering. */
function item(id: string, title: Tri, text: Tri): MarriageItem {
  return { id, title, text };
}

/**
 * A list an admin has saved, or the seeded one when the section has never been edited.
 *
 * Deliberately NOT run through `mergeContent`: that merges arrays by index, so
 * deleting entry 2 leaves entry 3 sitting at index 2 — and any translation it has not
 * been given would then be filled from the SEEDED entry 2, text belonging to a row
 * that is no longer on the page.
 */
export function marriageList<T>(items: unknown, fallback: T[], idPrefix: string): T[] {
  if (!Array.isArray(items)) return fallback;
  return items.map((entry, i) => ({
    ...(entry as object),
    id: (entry as { id?: string })?.id || `${idPrefix}-${i}`,
  })) as T[];
}

export const MARRIAGE_DEFAULT: MarriageContent = {
  hero: {
    badge: tri('Marriage Services', "Serivisi y'Ubukwe", 'خدمات الزواج'),
    title: tri('Marriage Services', "Serivisi y'Ubukwe", 'خدمات الزواج'),
    subtitle: tri(
      'Official Islamic marriage ceremonies, certificates, and documentation for couples in the community.',
      "Ibirori by'ubukwe bw'Islamimu, impapuro, n'inyandiko kuri abakobwa n'abasore mu muryango.",
      'مراسم الزواج الإسلامية الرسمية والشهادات والوثائق للأزواج في المجتمع.',
    ),
    startLabel: tri('Start your application', 'Tangira gusaba', 'ابدأ طلبك'),
    statusLabel: tri('Check application status', 'Reba aho ubusabe bugeze', 'تحقق من حالة الطلب'),
  },
  overview: {
    heading: tri('A blessed beginning,', 'Intangiriro yuje umugisha,', 'بداية مباركة،'),
    headingHighlight: tri('done right', 'ikorwa neza', 'تتم على الوجه الصحيح'),
    p1: tri(
      'RMC guides you through every step of the Nikah — pre-marital guidance, an officiated ceremony, and official documentation.',
      "RMC ikuyobora muri buri ntambwe ya Nikah — nama mbere y'ubukwe, ibirori n'inyandiko zemewe.",
      'ترافقك RMC في كل خطوة من خطوات النكاح — الإرشاد قبل الزواج، وإقامة المراسم، والتوثيق الرسمي.',
    ),
    p2: tri(
      'We keep the process clear, dignified, and stress-free for both families.',
      'Tugufasha ko inzira igaragara, yubahwa kandi idatera umuhangayiko ku miryango yombi.',
      'نجعل العملية واضحة وكريمة وخالية من المتاعب للعائلتين.',
    ),
    badge: tri('Certified Nikah', 'Nikah Yemewe', 'نكاح موثَّق'),
    badgeSub: tri(
      'Officiated by qualified imams',
      "Ikorwa n'aba imamu babifitiye ubushobozi",
      'يُعقد على يد أئمة مؤهلين',
    ),
  },
  includes: {
    title: tri("What's included", 'Ibikubiyemo', 'ما الذي يشمله'),
    subtitle: tri(
      'All you need for a complete, recognised Islamic marriage.',
      "Ibyo ukeneye kugira ngo ubukwe bw'Abayisilamu bwuzuye kandi bwemewe.",
      'ما تحتاجه لزواج إسلامي كامل ومعترف به.',
    ),
    items: [
      item(
        'nikah',
        tri('Nikah Ceremony', 'Umuhango wa Nikah', 'مراسم النكاح'),
        tri(
          'A full ceremony officiated by a qualified imam in accordance with the Sunnah.',
          "Ibirori bikorwa n'imamu ubifitiye ubushobozi hakurikijwe Sunnah.",
          'مراسم يعقدها إمام مؤهل وفقًا للسنّة.',
        ),
      ),
      item(
        'certificate',
        tri('Official Certificate', 'Icyemezo Cyemewe', 'شهادة رسمية'),
        tri(
          'An RMC marriage certificate issued and registered for both partners.',
          'Icyemezo cya RMC gitangwa kandi cyandikwa ku bashyingiranwa bombi.',
          'شهادة زواج من RMC تُصدر وتُسجَّل لكلا الطرفين.',
        ),
      ),
      item(
        'guidance',
        tri('Pre-Marital Guidance', "Inama Mbere y'Ubukwe", 'الإرشاد قبل الزواج'),
        tri(
          'Counselling on rights, responsibilities, and building a strong Islamic household.',
          "Inama yerekeye uburenganzira, inshingano, no kubaka urugo rukomeye rw'Abayisilamu.",
          'إرشاد في الحقوق والواجبات وبناء أسرة إسلامية متينة.',
        ),
      ),
      item(
        'witness',
        tri('Witness & Mahr Support', 'Ubufasha mu Batangabuhamya na Mahr', 'دعم الشهود والمهر'),
        tri(
          'Help arranging witnesses and documenting the agreed mahr correctly.',
          'Ubufasha mu gushaka abatangabuhamya no kwandika mahr byumvikanyweho.',
          'مساعدة في ترتيب الشهود وتوثيق المهر المتفق عليه.',
        ),
      ),
    ],
  },
  process: {
    title: tri('How it works', 'Uko bikorwa', 'كيف تتم العملية'),
    subtitle: tri(
      'Seven simple steps from application to certificate.',
      'Intambwe zirindwi zoroshye kuva ku gusaba kugeza ku cyemezo.',
      'سبع خطوات بسيطة من الطلب إلى الشهادة.',
    ),
    items: [
      item(
        's1',
        tri('Couple details', "Amakuru y'abashyingiranwa", 'بيانات الزوجين'),
        tri(
          'Enter the groom and bride information exactly as it appears on their National IDs.',
          "Andika amakuru y'umukwe n'umugeni nk'uko agaragara ku ndangamuntu zabo.",
          'أدخل بيانات العريس والعروس كما تظهر تمامًا في بطاقتي الهوية الوطنية.',
        ),
      ),
      item(
        's2',
        tri('Ceremony details', "Amakuru y'ibirori", 'تفاصيل المراسم'),
        tri(
          'Choose where and when you would like to hold the Nikah ceremony.',
          "Hitamo aho n'igihe wifuza gukorera ibirori bya Nikah.",
          'اختر مكان وموعد إقامة عقد النكاح.',
        ),
      ),
      item(
        's3',
        tri('Witnesses & guardian', 'Abahamya na wali', 'الشهود والولي'),
        tri(
          "Provide two Muslim witnesses and the bride's Wali (guardian).",
          "Tanga abahamya babiri b'abayisilamu na wali (umurinzi) w'umugeni.",
          'قدّم شاهدين مسلمين وولي العروس.',
        ),
      ),
      item(
        's4',
        tri('Mahr & officiant', "Mahr n'uyobora ubukwe", 'المهر والمأذون'),
        tri(
          'Enter the agreed Mahr (dowry) and your preferred imam.',
          'Andika mahr (inkwano) mwumvikanyeho hamwe na imamu wifuza.',
          'أدخل المهر المتفق عليه والإمام المفضل لديك.',
        ),
      ),
      item(
        's5',
        tri('Upload documents', 'Ohereza inyandiko', 'رفع الوثائق'),
        tri(
          'Attach the required identity documents and photos.',
          "Shyiraho inyandiko z'irangamuntu n'amafoto bisabwa.",
          'أرفق وثائق الهوية والصور المطلوبة.',
        ),
      ),
      item(
        's6',
        tri('Pay & submit', 'Ishyura kandi wohereze', 'الدفع والإرسال'),
        tri(
          'Choose a fee tier and payment method, then submit your application.',
          "Hitamo igiciro n'uburyo bwo kwishyura, hanyuma wohereze ubusabe bwawe.",
          'اختر فئة الرسوم وطريقة الدفع ثم أرسل طلبك.',
        ),
      ),
      item(
        's7',
        tri('Nikah & certificate', "Nikah n'icyemezo", 'النكاح والتوثيق'),
        tri(
          'Once RMC reviews and approves your application, the ceremony is performed and your official marriage certificate is issued.',
          "Nyuma y'uko RMC isuzumye kandi yemeje ubusabe bwawe, ibirori birakorwa kandi icyemezo cyawe cy'ubukwe cyemewe gitangwa.",
          'بعد مراجعة RMC للطلب والموافقة عليه، تُقام المراسم وتُصدر شهادة زواجك الرسمية.',
        ),
      ),
    ],
  },
  requirements: {
    title: tri("What you'll need", 'Ibyo Ukeneye', 'ما الذي تحتاجه'),
    subtitle: tri(
      'Have these ready before submitting your application.',
      'Tegura izi nyandiko mbere yo gusaba.',
      'جهّز هذه الوثائق قبل التقديم.',
    ),
    items: [
      {
        id: 'r1',
        text: tri(
          'Valid national ID or passport for both partners',
          'Irangamuntu cyangwa pasiporo yemewe ku bashyingiranwa bombi',
          'بطاقة هوية وطنية سارية أو جواز سفر لكلا الطرفين',
        ),
      },
      {
        id: 'r2',
        text: tri(
          'Wali (guardian) consent and identification',
          "Uruhushya rwa wali (umurinzi) n'irangamuntu",
          'موافقة الولي وإثبات هويته',
        ),
      },
      {
        id: 'r3',
        text: tri(
          'Two adult Muslim witnesses',
          "Abatangabuhamya babiri b'Abayisilamu bakuru",
          'شاهدان مسلمان بالغان',
        ),
      },
      {
        id: 'r4',
        text: tri(
          'Proof of RMC membership for both partners',
          "Ikimenyetso cy'ubunyamuryango bwa RMC ku bashyingiranwa bombi",
          'إثبات العضوية في RMC لكلا الطرفين',
        ),
      },
      {
        id: 'r5',
        text: tri(
          'Agreed mahr (dowry) details',
          'Amakuru ya mahr (inkwano) yumvikanyweho',
          'تفاصيل المهر المتفق عليه',
        ),
      },
      {
        id: 'r6',
        text: tri('Passport-size photographs', 'Amafoto angana na pasiporo', 'صور بحجم جواز السفر'),
      },
    ],
  },
  fees: {
    title: tri('Service fees', 'Amafaranga ya serivisi', 'رسوم الخدمة'),
    subtitle: tri(
      'The marriage service fee depends on where the ceremony is held.',
      "Amafaranga ya serivisi y'ubukwe aterwa n'aho umuhango ukorerwa.",
      'تعتمد رسوم خدمة الزواج على مكان إقامة المراسم.',
    ),
    mosqueLabel: tri(
      'Ceremony held in a mosque',
      'Umuhango ukorewe mu musigiti',
      'إقامة المراسم في المسجد',
    ),
    mosqueAmount: tri('30,000 RWF', '30,000 RWF', '30,000 فرنك رواندي'),
    outsideLabel: tri(
      'Ceremony held outside a mosque',
      "Umuhango ukorewe hanze y'umusigiti",
      'إقامة المراسم خارج المسجد',
    ),
    outsideAmount: tri('200,000 RWF', '200,000 RWF', '200,000 فرنك رواندي'),
    clauseTitle: tri('Payment clause', "Ingingo y'ubwishyu", 'بند الدفع'),
    clause: tri(
      'The full fee must be paid before the certificate is issued.',
      "Amafaranga yose agomba kwishyurwa mbere y'uko icyemezo gitangwa.",
      'يجب دفع الرسوم كاملةً قبل إصدار الشهادة.',
    ),
  },
  faq: {
    title: tri('Frequently asked questions', 'Ibibazo bibazwa kenshi', 'الأسئلة الشائعة'),
    items: [
      {
        id: 'f1',
        q: tri(
          'How long does the process take?',
          'Inzira imara igihe kingana iki?',
          'كم تستغرق العملية؟',
        ),
        a: tri(
          'Once your documents are verified, the Nikah can usually be scheduled within 1-2 weeks depending on availability.',
          "Iyo inyandiko zawe zimaze kugenzurwa, Nikah ishobora gukorwa mu cyumweru kimwe kugeza kuri bibiri bitewe n'uko bishoboka.",
          'بمجرد التحقق من وثائقك، يمكن عادةً تحديد موعد النكاح خلال أسبوع إلى أسبوعين حسب التوفر.',
        ),
      },
      {
        id: 'f2',
        q: tri(
          'Is RMC membership required?',
          'Ubunyamuryango bwa RMC burakenewe?',
          'هل العضوية في RMC مطلوبة؟',
        ),
        a: tri(
          'Yes — both partners must be registered RMC members.',
          'Yego — abashyingiranwa bombi bagomba kuba banditse muri RMC.',
          'نعم — يجب أن يكون كلا الطرفين عضوين مسجلين في RMC.',
        ),
      },
      {
        id: 'f3',
        q: tri(
          'Is the certificate officially recognised?',
          'Icyemezo cyemewe ku mugaragaro?',
          'هل الشهادة معترف بها رسميًا؟',
        ),
        a: tri(
          "Recognised within the community as proof of an Islamic marriage. For civil registration, follow your local authority's process.",
          "Kiremewe mu muryango nk'ikimenyetso cy'ubukwe bw'Abayisilamu. Ku iyandikwa rya leta, kurikiza inzira y'ubuyobozi bw'aho utuye.",
          'معترف بها داخل المجتمع إثباتًا للزواج الإسلامي. للتسجيل المدني، اتبع إجراءات السلطة المحلية.',
        ),
      },
      {
        id: 'f4',
        q: tri(
          'Can the ceremony be held at our own venue?',
          'Ibirori bishobora gukorerwa ahantu hacu bwite?',
          'هل يمكن إقامة المراسم في مكاننا الخاص؟',
        ),
        a: tri(
          'Yes — subject to imam availability, at a mosque, your home, or any agreed venue.',
          "Yego — bitewe n'uko imamu aboneka, mu musigiti, mu rugo rwawe, cyangwa ahandi hantu humvikanyweho.",
          'نعم — رهنًا بتوفر الإمام، في مسجد أو منزلك أو أي مكان متفق عليه.',
        ),
      },
    ],
  },
  cta: {
    title: tri(
      'Ready to begin your Nikah?',
      'Witeguye gutangira Nikah yawe?',
      'هل أنت مستعد لبدء نكاحك؟',
    ),
    subtitle: tri(
      'Become an RMC member to start your application and book your ceremony.',
      "Iyandikishe muri RMC kugira ngo utangire ubusabe kandi ufate itariki y'ibirori.",
      'سجّل في RMC لبدء طلبك وحجز موعد مراسمك.',
    ),
    startLabel: tri('Start application', 'Tangira ubusabe', 'ابدأ الطلب'),
    contactLabel: tri('Contact us', 'Twandikire', 'اتصل بنا'),
  },
};
