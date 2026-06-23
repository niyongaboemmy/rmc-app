import { Tri, tri } from './client';

/** One step in the "How to Become a Muslim" journey. */
export interface HowStep {
  /** lucide icon name, resolved to a component on the landing side. */
  icon: string;
  title: Tri;
  description: Tri;
}

/**
 * "How to Become a Muslim" homepage section (single record).
 *
 * The intro video is stored per language (`videoEn/Rw/Ar`). Each value is
 * either a full URL or a file-server key — the landing side resolves both and
 * falls back to the English video when a language has none.
 */
export interface HowToBecomeMuslimContent {
  eyebrow: Tri;
  title: Tri;
  titleAccent: Tri;
  lede: Tri;

  /** Per-language intro clip (file-server key or absolute URL). EN is the fallback. */
  videoEn: string;
  videoRw: string;
  videoAr: string;
  /** Poster shown before the muted clip autoplays (key or URL). */
  videoPoster: string;

  /** The Shahada — words to read. */
  shahadaLabel: Tri;
  shahadaArabic: string;
  shahadaTransliteration: string;
  shahadaTranslation: Tri;

  stepsHeading: Tri;
  steps: HowStep[];

  /** Shown after the core steps — "Have you taken your Shahada?" */
  completionPrompt: Tri;
  completionSubtext: Tri;
  whatNextCta: Tri;
  /** Route opened by the "What's Next" button (relative to the locale). */
  whatNextHref: string;

  /** The "find the nearest school" block that carries the map. */
  schoolHeading: Tri;
  schoolDescription: Tri;
}

/** Seeded defaults — English canonical; used until something is saved in admin. */
export const HOW_TO_BECOME_MUSLIM_DEFAULT: HowToBecomeMuslimContent = {
  eyebrow: tri('Embrace Islam', 'Yakira Islam', 'اعتناق الإسلام'),
  title: tri('How to Become a', 'Uko Waba', 'كيف تصبح'),
  titleAccent: tri('Muslim', 'Umuyisilamu', 'مسلماً'),
  lede: tri(
    'Becoming a Muslim is simple and beautiful. Watch, read the words below, and follow the steps — your journey begins with a single sincere testimony.',
    "Kuba Umuyisilamu biroroshye kandi birabeza. Reba, soma amagambo ari hano hepfo, kandi ukurikize intambwe — urugendo rwawe rutangirana n'ubuhamya bumwe nyabwo.",
    'الدخول في الإسلام بسيطٌ وجميل. شاهد، واقرأ الكلمات أدناه، واتبع الخطوات — رحلتك تبدأ بشهادة صادقة واحدة.',
  ),

  videoEn: '',
  videoRw: '',
  videoAr: '',
  videoPoster: '/logo.webp',

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

  stepsHeading: tri('The Steps to Follow', 'Intambwe zo Gukurikiza', 'الخطوات المتّبعة'),
  steps: [
    {
      icon: 'Heart',
      title: tri('Believe with the heart', "Kwizera n'umutima", 'الإيمان بالقلب'),
      description: tri(
        'Hold a sincere conviction that there is no god worthy of worship except Allah, and that Muhammad ﷺ is His final messenger.',
        "Kugira ukwemera gukomeye ko nta yindi mana ikwiye gusengwa itari Allah, kandi ko Muhammad ﷺ ari intumwa ye ya nyuma.",
        'اعتقادٌ صادق بأنه لا إله يستحق العبادة إلا الله، وأن محمداً ﷺ رسوله الأخير.',
      ),
    },
    {
      icon: 'MessageSquareQuote',
      title: tri('Declare the Shahada', 'Kuvuga Shahada', 'النطق بالشهادة'),
      description: tri(
        'Say the testimony of faith aloud and with intention. It is best pronounced before witnesses, but Allah hears you wherever you are.',
        "Vuga ubuhamya bw'ukwemera mu ijwi riranguruye n'umugambi. Ni byiza kubivuga imbere y'abahamya, ariko Allah arakumva aho uri hose.",
        'انطق بشهادة الإيمان جهراً وبنية صادقة. ويُستحب أن تكون أمام شهود، والله يسمعك أينما كنت.',
      ),
    },
    {
      icon: 'Droplets',
      title: tri('Purify with Ghusl', 'Kwiyuhagira (Ghusl)', 'الاغتسال'),
      description: tri(
        'Take a full ritual bath (ghusl) as a fresh start — a symbol of leaving the past behind and beginning life cleansed.',
        "Iyuhagire wese (ghusl) nk'intangiriro nshya — ikimenyetso cyo gusiga ibyahise inyuma no gutangira ubuzima wejejwe.",
        'اغتسل غُسلاً كاملاً كبداية جديدة — رمزٌ لترك الماضي والبدء بحياة نقية.',
      ),
    },
    {
      icon: 'Sparkles',
      title: tri('Learn & live the faith', 'Kwiga no kubaho ukwemera', 'تعلّم وعِش الإيمان'),
      description: tri(
        'Begin the five daily prayers, learn the pillars step by step, and join a welcoming community to grow in knowledge and practice.',
        "Tangira amasengesho atanu ya buri munsi, wige inkingi buhoro buhoro, kandi winjire mu muryango wakwakira mu kwiyongera mu bumenyi no mu bikorwa.",
        'ابدأ بالصلوات الخمس، وتعلّم الأركان خطوة بخطوة، وانضم إلى مجتمع يرحّب بك لتنمو في العلم والعمل.',
      ),
    },
  ],

  completionPrompt: tri(
    'Have you just taken your Shahada?',
    'Waba umaze kuvuga Shahada yawe?',
    'هل نطقت بالشهادة للتو؟',
  ),
  completionSubtext: tri(
    'Welcome to Islam, our brother or sister. We would love to support you on your journey.',
    'Murakaza neza muri Islam, mwene wacu. Twifuza kugufasha mu rugendo rwawe.',
    'مرحباً بك في الإسلام، أخانا أو أختنا. يسعدنا أن ندعمك في رحلتك.',
  ),
  whatNextCta: tri("What's Next?", 'Ni iki Gikurikira?', 'ما الخطوة التالية؟'),
  whatNextHref: '/new-muslim',

  schoolHeading: tri('Find the nearest school', 'Shaka ishuri riri hafi', 'ابحث عن أقرب مدرسة'),
  schoolDescription: tri(
    'Locate the nearest Islamic school or mosque to study under a teacher, ask your questions, and keep learning alongside fellow believers.',
    "Shaka ishuri ry'Abayisilamu cyangwa umusigiti uri hafi yawe wige uyobowe n'umwarimu, ubaze ibibazo byawe, ukomeze kwiga uri kumwe n'abandi bemera.",
    'ابحث عن أقرب مدرسة إسلامية أو مسجد لتتعلّم على يد معلّم، وتطرح أسئلتك، وتواصل التعلّم مع إخوانك المؤمنين.',
  ),
};
