import { Tri, tri } from './client';

/**
 * "Welcome to Islam" page (`/[locale]/new-muslim`).
 *
 * Every word below the hero used to be a hardcoded trilingual object inside the
 * page component. It now lives here as one CMS section so a super-admin can edit
 * the whole page in-context in Edit Mode — same model as the Dawah landing page.
 * The hero itself stays on its own `new-muslim-hero` section (see page-heroes).
 *
 * Both collections (`steps.items`, `duas.items`) are ARRAYS, so read them through
 * the helpers at the bottom rather than through the index-merged content — see
 * the note on `newMuslimSteps`.
 */

/** Centered eyebrow / title / subtitle block above each section. */
export interface NewMuslimHeading {
  eyebrow: Tri;
  title: Tri;
  subtitle: Tri;
}

/** One card in "Your first steps as a Muslim". */
export interface NewMuslimStep {
  id: string;
  /** Lucide icon name — resolved to a component by `newMuslimIcons`. */
  icon: string;
  title: Tri;
  description: Tri;
}

/** One supplication card. Arabic + transliteration are language-independent. */
export interface NewMuslimDua {
  id: string;
  arabic: string;
  transliteration: string;
  meaning: Tri;
}

export interface NewMuslimContent {
  steps: NewMuslimHeading & { items: NewMuslimStep[] };
  duas: NewMuslimHeading & { items: NewMuslimDua[] };
  /**
   * The nearest-mosque finder — heading only.
   *
   * The map's own button and badge labels used to live here as CMS copy. The section
   * now renders the SHARED MosqueFinder, which carries its own labels, so editable
   * fields here would have driven nothing.
   */
  nearby: NewMuslimHeading;
  /** "Register & get a mentor" — heading, field placeholders and result states. */
  mentor: NewMuslimHeading & {
    namePlaceholder: Tri;
    emailPlaceholder: Tri;
    phonePlaceholder: Tri;
    messagePlaceholder: Tri;
    submitLabel: Tri;
    successTitle: Tri;
    successBody: Tri;
    errorText: Tri;
  };
}

/** Seeded from the copy that used to be hardcoded in the page component. */
export const NEW_MUSLIM_DEFAULT: NewMuslimContent = {
  steps: {
    eyebrow: tri("What's Next", 'Ibikurikira', 'الخطوات التالية'),
    title: tri(
      'Your first steps as a Muslim',
      "Intambwe zawe za mbere nk'Umuyisilamu",
      'خطواتك الأولى كمسلم',
    ),
    subtitle: tri(
      'Take them in whatever order suits you. Nothing here is a test — every step is a beginning.',
      "Uzikurikize uko bikunogeye. Nta kizamini kiri hano — buri ntambwe ni intangiriro.",
      'خُذها بالترتيب الذي يناسبك. لا اختبار هنا — كل خطوة هي بداية.',
    ),
    items: [
      {
        id: 'step-salah',
        icon: 'GraduationCap',
        title: tri('Learn to pray (Salah)', 'Wige gusenga (Swala)', 'تعلّم الصلاة'),
        description: tri(
          "The five daily prayers are the heart of a Muslim's day. Learn the wudu (ablution) and the prayer movements step by step.",
          "Amasengesho atanu ya buri munsi ni umutima w'umunsi w'Umuyisilamu. Wige iyuhagira (wudu) n'uko gusenga bigenda buhoro buhoro.",
          'الصلوات الخمس هي قلب يوم المسلم. تعلّم الوضوء وحركات الصلاة خطوة بخطوة.',
        ),
      },
      {
        id: 'step-quran',
        icon: 'BookOpen',
        title: tri("Start with the Qur'an", "Tangira na Qur'an", 'ابدأ بالقرآن'),
        description: tri(
          'Begin learning the short surahs and the meaning of what you recite. A teacher will help you read the Arabic.',
          "Tangira kwiga surah ngufi n'icyo zisobanura. Umwarimu azagufasha gusoma icyarabu.",
          'ابدأ بتعلّم السور القصيرة ومعاني ما تقرأ. سيساعدك المعلّم على قراءة العربية.',
        ),
      },
      {
        id: 'step-mosque',
        icon: 'MapPin',
        title: tri('Join your nearest mosque', 'Jya mu musigiti uri hafi', 'انضم إلى أقرب مسجد'),
        description: tri(
          'Community is a gift. Visit the nearest mosque or Islamic school to pray, ask questions, and find brothers and sisters.',
          "Umuryango ni impano. Sura umusigiti cyangwa ishuri ry'Abayisilamu riri hafi usenge, ubaze, ubone abavandimwe.",
          'الجماعة نعمة. زُر أقرب مسجد أو مدرسة إسلامية للصلاة وطرح الأسئلة ولقاء الإخوة والأخوات.',
        ),
      },
      {
        id: 'step-pace',
        icon: 'HandHeart',
        title: tri('Take it one day at a time', 'Genda buhoro buhoro', 'تقدّم خطوة بخطوة'),
        description: tri(
          'You do not need to learn everything at once. Allah is Most Merciful — sincerity and small consistent steps are what matter.',
          "Ntugomba kwiga byose icyarimwe. Allah ni Nyirimbabazi — ubunyangamugayo n'intambwe nto zihoraho ni byo by'ingenzi.",
          'لا حاجة لتتعلّم كل شيء دفعة واحدة. الله أرحم الراحمين — الإخلاص والخطوات الصغيرة الثابتة هي المهمة.',
        ),
      },
    ],
  },

  duas: {
    eyebrow: tri('Supplications', 'Amasengesho', 'أدعية'),
    title: tri('Duas to begin with', 'Amasengesho yo gutangirana', 'أدعية للبداية'),
    subtitle: tri(
      'Short words you can carry with you from the very first day.',
      "Amagambo magufi ushobora kugendana kuva ku munsi wa mbere.",
      'كلمات قصيرة ترافقك من اليوم الأول.',
    ),
    items: [
      {
        id: 'dua-bismillah',
        arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        transliteration: 'Bismillah ir-Rahman ir-Rahim',
        meaning: tri(
          'In the name of Allah, the Most Gracious, the Most Merciful.',
          'Mu izina rya Allah, Nyirimpuhwe, Nyirimbabazi.',
          'بسم الله الرحمن الرحيم.',
        ),
      },
      {
        id: 'dua-ilm',
        arabic: 'رَبِّ زِدْنِي عِلْمًا',
        transliteration: "Rabbi zidni 'ilma",
        meaning: tri(
          'My Lord, increase me in knowledge.',
          'Nyagasani wanjye, nyongerera ubumenyi.',
          'ربِّ زدني علماً.',
        ),
      },
    ],
  },

  nearby: {
    eyebrow: tri('Community', 'Umuryango', 'المجتمع'),
    title: tri(
      'Find a mosque near you',
      'Shaka umusigiti hafi yawe',
      'ابحث عن مسجد قريب منك',
    ),
    // Names the button the shared finder actually shows. This used to read 'Tap "Find
    // schools near me"', which no longer exists anywhere on the page.
    subtitle: tri(
      'Search by name or province, or tap "Find near me" to see the closest mosque — with directions from where you are.',
      "Shakisha ukoresheje izina cyangwa intara, cyangwa ukande \"Shakisha hafi yanjye\" urebe umusigiti uri hafi — ubone n'inzira uhereye aho uri.",
      'ابحث بالاسم أو المقاطعة، أو اضغط "ابحث بالقرب مني" لعرض أقرب مسجد — مع الاتجاهات من موقعك.',
    ),
  },

  mentor: {
    eyebrow: tri('Support', 'Ubufasha', 'الدعم'),
    title: tri('Register & get a mentor', 'Iyandikishe ubone umuyobozi', 'سجّل واحصل على مرشد'),
    subtitle: tri(
      'Leave your details and our team will personally guide you on your first steps.',
      "Siga amakuru yawe, itsinda ryacu rizagufasha ku giti cyawe mu ntambwe zawe za mbere.",
      'اترك بياناتك وسيرشدك فريقنا شخصياً في خطواتك الأولى.',
    ),
    namePlaceholder: tri('Full name', 'Amazina yombi', 'الاسم الكامل'),
    emailPlaceholder: tri('Email address', 'Aderesi imeyili', 'البريد الإلكتروني'),
    phonePlaceholder: tri('Phone (optional)', 'Telefone (si itegeko)', 'الهاتف (اختياري)'),
    messagePlaceholder: tri(
      "Anything you'd like us to know? (optional)",
      'Hari icyo wifuza ko tumenya? (si itegeko)',
      'هل من شيء تودّ إخبارنا به؟ (اختياري)',
    ),
    submitLabel: tri('Send & connect me', 'Ohereza unyhuze', 'أرسل وتواصل معي'),
    successTitle: tri('May Allah bless you!', 'Allah aguhe umugisha!', 'بارك الله فيك!'),
    successBody: tri(
      'We have received your details. A member of our community will reach out to welcome and support you very soon.',
      'Twakiriye amakuru yawe. Umwe mu bagize umuryango wacu azaguhamagara akwakire kandi agufashe vuba.',
      'لقد استلمنا بياناتك. سيتواصل معك أحد أعضاء مجتمعنا قريباً للترحيب بك ودعمك.',
    ),
    errorText: tri(
      'Something went wrong. Please try again.',
      'Hari ikitagenze neza. Ongera ugerageze.',
      'حدث خطأ ما. حاول مرة أخرى.',
    ),
  },
};

/* ── Collection readers ──────────────────────────────────────────────────────
 * `mergeContent` walks arrays BY INDEX, which is right for headings and wrong
 * for collections: a deleted card would inherit the seeded card that used to sit
 * at its index and reappear on the page. These two take the UNMERGED saved blob
 * (or the live edit draft) and fall back to the seed only when nothing is saved
 * at all — the same idiom as `hajjSteps`.
 */

export function newMuslimSteps(saved: unknown): NewMuslimStep[] {
  const items = (saved as NewMuslimContent | null)?.steps?.items;
  if (!Array.isArray(items)) return NEW_MUSLIM_DEFAULT.steps.items;
  return items.map((item, i) => ({
    id: item?.id || `step-${i}`,
    icon: item?.icon || '',
    title: item?.title ?? tri(''),
    description: item?.description ?? tri(''),
  }));
}

export function newMuslimDuas(saved: unknown): NewMuslimDua[] {
  const items = (saved as NewMuslimContent | null)?.duas?.items;
  if (!Array.isArray(items)) return NEW_MUSLIM_DEFAULT.duas.items;
  return items.map((item, i) => ({
    id: item?.id || `dua-${i}`,
    arabic: item?.arabic ?? '',
    transliteration: item?.transliteration ?? '',
    meaning: item?.meaning ?? tri(''),
  }));
}
