import { Tri, tri } from './client';

/**
 * Funeral services page content (admin-managed in Content → Funeral Service).
 *
 * Every heading, blurb and button on the funeral pages, plus the sticky call bar.
 *
 * NOT here: the lifecycle steps shown in the "what happens next" timeline — those
 * are the same `funeral_steps` records a request's status timeline uses, managed in
 * Content → Funeral Request Steps, and only the timeline's HEADING lives in this
 * blob. Nor the cemeteries and transports, which are records under Admin → Funeral.
 */
export interface FuneralContent {
  /**
   * The page banner. The ayah itself is scripture and is NOT here — only the
   * reference line under it, which is a citation an editor might reformat.
   */
  hero: {
    title: Tri;
    subtitle: Tri;
    ayahRef: Tri;
  };
  /**
   * "How can we help?" — the heading over the two action cards, and the cards.
   *
   * Flat rather than nested per card: the admin form addresses fields as
   * group + key, and there are exactly two cards, fixed — their icons and links
   * live in the page, so this is a shape an admin grows only by a code change.
   */
  quick: {
    title: Tri;
    subtitle: Tri;
    reportTitle: Tri;
    reportDesc: Tri;
    cemeteryTitle: Tri;
    cemeteryDesc: Tri;
  };
  /** Heading over the mosque transport list; the mosques themselves are records. */
  transports: {
    title: Tri;
    subtitle: Tri;
  };
  /** The closing band. */
  cta: {
    title: Tri;
    subtitle: Tri;
    reportLabel: Tri;
    contactLabel: Tri;
  };
  /** Rich-text block (HTML from the admin editor) — sanitise before rendering. */
  description: {
    eyebrow: Tri;
    title: Tri;
    body: Tri;
  };
  /** Heading for the public step timeline; the steps themselves come from the API. */
  steps: {
    eyebrow: Tri;
    title: Tri;
    subtitle: Tri;
  };
  /**
   * The number the sticky call bar dials. `phone` is what a visitor reads,
   * `phoneHref` what the browser dials — kept apart so the display can carry
   * spaces and parentheses (same split as the Contact page).
   */
  hotline: {
    label: Tri;
    note: Tri;
    phone: string;
    phoneHref: string;
  };
}

/** Seeded so the page reads well before an admin has edited anything. */
export const FUNERAL_DEFAULT: FuneralContent = {
  hero: {
    title: tri('Funeral Services', "Serivisi y'Umuryango w'Abapfuye", 'خدمات الجنازة'),
    subtitle: tri(
      'Coordination of Islamic burial rites, imam assignment, and logistics support for families.',
      'Gutegura gushyingura mu Islamimu, guha Imam, no gufasha imiryango.',
      'تنسيق مراسم الدفن الإسلامية وتعيين الإمام ودعم اللوجستيات للعائلات.',
    ),
    ayahRef: tri('Qur’an 2:156', 'Qur’an 2:156', 'القرآن ٢:١٥٦'),
  },
  quick: {
    title: tri('How can we help?', 'Twabafasha dute?', 'كيف يمكننا مساعدتك؟'),
    subtitle: tri(
      'From reporting a death to burial, RMC walks with you at every step — with dignity and care.',
      'Kuva ku kumenyekanisha urupfu kugeza ku ishyingura, RMC iri kumwe namwe muri buri ntambwe, mu cyubahiro no mu rukundo.',
      'من الإبلاغ عن الوفاة إلى الدفن، يرافقكم مركز المجتمع المسلم في كل خطوة بكرامة ورعاية.',
    ),
    reportTitle: tri('Report a Death', 'Menyekanisha urupfu', 'الإبلاغ عن وفاة'),
    reportDesc: tri(
      'Notify RMC and begin the arrangements.',
      'Menyesha RMC utangire gutunganya ibikenewe.',
      'أبلغ المركز وابدأ الترتيبات.',
    ),
    cemeteryTitle: tri('Cemetery Information', 'Amakuru y’amarimbi', 'معلومات المقابر'),
    cemeteryDesc: tri(
      'Locations, capacity and contacts.',
      'Aho ari, ubushobozi n’abo kuvugana.',
      'المواقع والسعة وجهات الاتصال.',
    ),
  },
  transports: {
    title: tri(
      'Available transport means',
      'Uburyo bwo gutwara umurambo buhari',
      'وسائل النقل المتاحة',
    ),
    subtitle: tri(
      'Funeral transport offered by our mosques. Contact the one nearest you.',
      'Ubwikorezi bw’imihango y’umuziro butangwa n’imisigiti yacu. Hamagara uwo hafi yawe.',
      'نقل الجنازات الذي تقدمه مساجدنا. تواصل مع الأقرب إليك.',
    ),
  },
  cta: {
    title: tri('We are here for you', 'Turi kumwe namwe', 'نحن معكم'),
    subtitle: tri(
      'When a loved one passes, contact us at any hour. The community is ready to help.',
      'Iyo uwo mukunda yitabye Imana, twandikire igihe icyo ari cyo cyose. Umuryango witeguye kubafasha.',
      'عند وفاة عزيز، تواصلوا معنا في أي وقت. المجتمع مستعد للمساعدة.',
    ),
    reportLabel: tri('Report a Death', 'Menyekanisha urupfu', 'الإبلاغ عن وفاة'),
    contactLabel: tri('Call the committee', 'Hamagara komite', 'اتصل باللجنة'),
  },
  description: {
    eyebrow: tri('What we do', 'Icyo dukora', 'ما نقوم به'),
    title: tri(
      'We carry the burden with you',
      'Turasangira nawe umutwaro',
      'نحمل العبء معك',
    ),
    body: tri(
      '<p>When a member of our community passes away, the Rwanda Muslim Community takes care of the rites and the logistics so the family can grieve and pray. There is no charge for the service — it is a duty the community owes to its dead.</p><p>Our committee arranges the <strong>ghusl</strong> (the ritual washing), the <strong>kafan</strong> (the shrouding), the <strong>janāzah</strong> prayer at a mosque near you, transport of the body, and the burial in a Muslim cemetery. We also help the family with the paperwork the authorities require, and stay with them through the days that follow.</p><p>Report the death as soon as you can — Islamic burial is performed without delay, usually within a day, so an early call gives us the time to prepare everything properly.</p>',
      '<p>Iyo umwe mu bagize umuryango wacu yitabye Imana, Umuryango w’Abayisilamu bo mu Rwanda wita ku migenzo no ku miteguro yose, kugira ngo umuryango ubashe kwiheba no gusenga. Iyi serivisi ni ubuntu — ni inshingano umuryango ufitiye abapfuye be.</p><p>Komite yacu itegura <strong>ghusl</strong> (koga umurambo), <strong>kafan</strong> (kwambika umwenda), isengesho rya <strong>janāzah</strong> mu musigiti uri hafi yawe, gutwara umurambo, no gushyingura mu irimbi ry’Abayisilamu. Twanafasha umuryango mu nyandiko zisabwa n’inzego za Leta, tukaguma tuwuri hafi mu minsi ikurikira.</p><p>Menyesha urupfu vuba bishoboka — gushyingura mu Isilamu bikorwa nta gutinda, akenshi mu munsi umwe, bityo guhamagara hakiri kare bituma tubona umwanya wo gutegura neza byose.</p>',
      '<p>عندما يتوفى أحد أفراد مجتمعنا، يتولى مجتمع المسلمين في رواندا القيام بالمناسك والترتيبات كلها حتى تتفرغ الأسرة للحزن والدعاء. الخدمة مجانية — فهي واجب المجتمع تجاه موتاه.</p><p>تتولى لجنتنا <strong>الغُسل</strong> و<strong>التكفين</strong> وصلاة <strong>الجنازة</strong> في مسجد قريب منك، ونقل الجثمان، والدفن في مقبرة إسلامية. كما نساعد الأسرة في الأوراق التي تطلبها الجهات الرسمية، ونبقى معها في الأيام التالية.</p><p>أبلغ عن الوفاة في أسرع وقت — فالدفن في الإسلام يتم دون تأخير، غالبًا خلال يوم واحد، والاتصال المبكر يمنحنا الوقت لتجهيز كل شيء على الوجه الصحيح.</p>',
    ),
  },
  steps: {
    eyebrow: tri('What happens next', 'Ibikurikiraho', 'ما الذي يحدث بعد ذلك'),
    title: tri(
      'From your call to the burial',
      'Kuva uhamagaye kugeza ku ishyingura',
      'من اتصالك حتى الدفن',
    ),
    subtitle: tri(
      'Every request moves through these stages. You can follow yours at any time using the reference we send you.',
      'Buri busabe bunyura muri izi ntambwe. Ushobora gukurikirana ubwawe igihe cyose ukoresheje inomero tukoherereza.',
      'يمر كل طلب بهذه المراحل. يمكنك متابعة طلبك في أي وقت باستخدام الرقم المرجعي الذي نرسله إليك.',
    ),
  },
  hotline: {
    label: tri('Call the funeral committee', 'Hamagara komite y’imihango', 'اتصل بلجنة الجنائز'),
    note: tri('Available at any hour', 'Iboneka igihe cyose', 'متاح في أي ساعة'),
    phone: '(+250) 788 308 436',
    phoneHref: 'tel:+250788308436',
  },
};
