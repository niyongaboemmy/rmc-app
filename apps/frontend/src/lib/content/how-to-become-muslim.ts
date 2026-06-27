import { Tri, tri } from './client';

/** A single resource link in the "How to Become a Muslim" section. */
export interface HowLink {
  /** lucide icon name, resolved to a component on the landing side. */
  icon: string;
  title: Tri;
  description: Tri;
  /**
   * Destination. An absolute URL (https://…) opens in a new tab; an in-app
   * path like "/schools" stays in the same tab (the locale prefix is added
   * automatically).
   */
  href: string;
}

/**
 * "How to Become a Muslim" homepage section (single record): an intro, the
 * Shahada to read, and a set of resource links to continue the journey.
 */
export interface HowToBecomeMuslimContent {
  eyebrow: Tri;
  title: Tri;
  titleAccent: Tri;
  lede: Tri;

  /** The Shahada — words to read. */
  shahadaLabel: Tri;
  shahadaArabic: string;
  shahadaTransliteration: string;
  shahadaTranslation: Tri;

  linksHeading: Tri;
  links: HowLink[];
}

/** Seeded defaults — English canonical; used until something is saved in admin. */
export const HOW_TO_BECOME_MUSLIM_DEFAULT: HowToBecomeMuslimContent = {
  eyebrow: tri('Embrace Islam', 'Yakira Islam', 'اعتناق الإسلام'),
  title: tri('How to Become a', 'Uko Waba', 'كيف تصبح'),
  titleAccent: tri('Muslim', 'Umuyisilamu', 'مسلماً'),
  lede: tri(
    'Becoming a Muslim is simple and beautiful. Read the words below, then use the links to start learning and find support near you.',
    "Kuba Umuyisilamu biroroshye kandi birabeza. Soma amagambo ari hano hepfo, hanyuma ukoreshe ihuza kugira ngo utangire kwiga ubone n'ubufasha buri hafi yawe.",
    'الدخول في الإسلام بسيطٌ وجميل. اقرأ الكلمات أدناه، ثم استخدم الروابط لتبدأ التعلّم وتجد الدعم القريب منك.',
  ),

  shahadaLabel: tri(
    'The Shahada — Declaration of Faith',
    "Shahada — Ubuhamya bw'Ukwemera",
    'الشهادة',
  ),
  shahadaArabic:
    'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ',
  shahadaTransliteration:
    'Ash-hadu an la ilaha illa-llah, wa ash-hadu anna Muhammadan rasulu-llah',
  shahadaTranslation: tri(
    '"I bear witness that there is no god but Allah, and I bear witness that Muhammad is the Messenger of Allah."',
    '"Mpamya ko nta yindi mana itari Allah, kandi mpamya ko Muhammad ari Intumwa ya Allah."',
    '"أشهد أن لا إله إلا الله، وأشهد أن محمداً رسول الله."',
  ),

  linksHeading: tri('Continue Your Journey', 'Komeza Urugendo Rwawe', 'تابع رحلتك'),
  links: [
    {
      icon: 'BookOpen',
      title: tri('Learn about Islam', 'Iga ku Isilamu', 'تعلّم عن الإسلام'),
      description: tri(
        'Explore the faith at your own pace with Ijwi Islam — free lessons, answers to common questions, and guidance for new Muslims.',
        "Menya idini ku buryo bwawe ukoresheje Ijwi Islam — amasomo y'ubuntu, ibisubizo ku bibazo bisanzwe, n'ubuyobozi ku Bayisilamu bashya.",
        'استكشف الدين على مهلك مع «إجوي إسلام» — دروس مجانية، وإجابات عن الأسئلة الشائعة، وإرشاد للمسلمين الجدد.',
      ),
      href: 'https://ijwi-islam.org/',
    },
    {
      icon: 'GraduationCap',
      title: tri('Find a school near you', 'Shaka ishuri riri hafi yawe', 'ابحث عن مدرسة قريبة منك'),
      description: tri(
        'Locate the nearest Islamic school or mosque to study under a teacher, ask your questions, and keep learning alongside fellow believers.',
        "Shaka ishuri ry'Abayisilamu cyangwa umusigiti uri hafi yawe wige uyobowe n'umwarimu, ubaze ibibazo byawe, ukomeze kwiga uri kumwe n'abandi bemera.",
        'ابحث عن أقرب مدرسة إسلامية أو مسجد لتتعلّم على يد معلّم، وتطرح أسئلتك، وتواصل التعلّم مع إخوانك المؤمنين.',
      ),
      href: '/schools',
    },
  ],
};
