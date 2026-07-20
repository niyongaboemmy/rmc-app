import { Tri, tri } from './client';

/**
 * Funeral services page content (admin-managed in Content → Funeral Service).
 *
 * Prose and the hotline only. The lifecycle steps shown in the "what happens
 * next" timeline are NOT here: they are the same `funeral_steps` records a
 * request's status timeline uses, managed in Content → Funeral Request Steps.
 * Only the timeline's heading lives in this blob.
 */
export interface FuneralContent {
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
