import { Tri, tri } from './client';

/**
 * Dawah landing-page content (admin-managed in Content → Dawah, and editable
 * in-context on the page itself in Edit Mode).
 *
 * Two kinds of copy live here:
 *
 *  · The Dawah **Learning** prose — the hero, the description, the course
 *    heading and the two catalogue cards. The words AROUND the catalogue, not
 *    the catalogue: courses and books are real records with their own tables and
 *    admin screens, never CMS copy.
 *
 *  · The **about** block — the informative sections that explain what Dawah is
 *    to a first-time visitor (what / why / principles / practices / FAQ / CTA).
 *    Plain text only; every field is one editable Tri.
 *
 * Kinyarwanda and Arabic fall back to English through `pick()` wherever a Tri is
 * left blank. The about block ships all three languages; the Learning prose
 * leaves Kinyarwanda blank until a translator fills it in.
 */

/** A titled card of prose — a principle, a practice, or a "why it matters" point. */
export interface DawahProseCard {
  title: Tri;
  body: Tri;
}

/** One question-and-answer in the About FAQ. */
export interface DawahFaqItem {
  q: Tri;
  a: Tri;
}

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
  /**
   * Heading and buttons for the "recent discussions" strip. The Q&A cards
   * themselves are live records (managed in the admin discussions module), not
   * CMS copy — only the surrounding words are editable here.
   */
  discussions: {
    title: Tri;
    subtitle: Tri;
    viewAll: Tri;
    askCta: Tri;
  };
  /**
   * The informative "what is Dawah" sections. Editable in-context like the rest,
   * but shipped in all three languages because this is teaching copy — a
   * first-time visitor on /rw should not read it in English.
   */
  about: {
    what: {
      eyebrow: Tri;
      title: Tri;
      lead: Tri;
      /** A Qur'anic invitation, rendered as a callout. Arabic on every locale. */
      verse: Tri;
      verseRef: Tri;
      p1: Tri;
      p2: Tri;
    };
    why: {
      eyebrow: Tri;
      title: Tri;
      subtitle: Tri;
      cards: {
        understanding: DawahProseCard;
        character: DawahProseCard;
        community: DawahProseCard;
      };
    };
    principles: {
      eyebrow: Tri;
      title: Tri;
      subtitle: Tri;
      items: {
        wisdom: DawahProseCard;
        compassion: DawahProseCard;
        knowledge: DawahProseCard;
        character: DawahProseCard;
        patience: DawahProseCard;
      };
    };
    practices: {
      eyebrow: Tri;
      title: Tri;
      subtitle: Tri;
      items: {
        example: DawahProseCard;
        learning: DawahProseCard;
        conversation: DawahProseCard;
        service: DawahProseCard;
      };
    };
    faq: {
      eyebrow: Tri;
      title: Tri;
      subtitle: Tri;
      items: {
        f1: DawahFaqItem;
        f2: DawahFaqItem;
        f3: DawahFaqItem;
        f4: DawahFaqItem;
        f5: DawahFaqItem;
      };
    };
    cta: {
      eyebrow: Tri;
      title: Tri;
      subtitle: Tri;
      primary: Tri;
      secondary: Tri;
    };
  };
}

/**
 * Seeded copy. The Learning prose leaves Kinyarwanda blank (`tri()`'s second
 * argument) so `pick()` falls back to English on /rw until a Kinyarwanda speaker
 * fills it in through Content → Dawah. The about block ships all three.
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
  discussions: {
    title: tri('Discussions', 'Ibiganiro', 'النقاشات'),
    subtitle: tri(
      'Ask the community, and read what RMC scholars have answered.',
      'Baza umuryango, kandi usome ibyo inzobere za RMC zasubije.',
      'اسأل المجتمع، واقرأ إجابات علماء المجتمع الرواندي المسلم.',
    ),
    viewAll: tri('View all discussions', 'Reba ibiganiro byose', 'عرض جميع المناقشات'),
    askCta: tri('Ask a question', 'Baza ikibazo', 'اطرح سؤالاً'),
  },
  about: {
    what: {
      eyebrow: tri('What is Dawah?', 'Dawah ni iki?', 'ما هي الدعوة؟'),
      title: tri(
        'An invitation, offered with kindness',
        'Ubutumire butangwa mu kinyabupfura',
        'دعوةٌ تُقدَّم بلُطف',
      ),
      lead: tri(
        'The word dawah (دعوة) means “invitation” or “calling.” In Islam, it is the act of gently inviting others — and reminding ourselves — to know God and to live with goodness, mercy, and justice.',
        'Ijambo «dawah» (دعوة) risobanura «gutumira» cyangwa «guhamagara». Muri Islamu, ni ugutumira abandi mu kinyabupfura — no kwibutsa twe ubwacu — kumenya Imana no kubaho mu buryo bwiza, bw’impuhwe n’ubutabera.',
        'كلمة «الدعوة» (دعوة) تعني النداء أو الدعوة إلى الشيء. وفي الإسلام هي دعوة الآخرين بلُطف — وتذكير أنفسنا — إلى معرفة الله والعيش بالخير والرحمة والعدل.',
      ),
      verse: tri(
        '“Invite to the way of your Lord with wisdom and good instruction, and speak to them in the best manner.”',
        '«Tumira abantu mu nzira y’Umwami wawe ubigiranye ubwenge n’inama nziza, uvugane na bo mu buryo bwiza kurushaho.»',
        '«ادْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ الْحَسَنَةِ وَجَادِلْهُم بِالَّتِي هِيَ أَحْسَنُ»',
      ),
      verseRef: tri('Qur’an 16:125', 'Qur’an 16:125', 'القرآن ١٦:١٢٥'),
      p1: tri(
        'Dawah is never about pressure or winning an argument. It is sharing something you value while fully respecting the other person’s freedom to think and choose for themselves.',
        'Dawah ntabwo ari uguhata cyangwa gutsinda impaka; ni ugusangira ikintu uha agaciro wubaha uburenganzira bw’undi bwo gutekereza no guhitamo ku giti cye.',
        'الدعوة ليست ضغطًا ولا انتصارًا في جدال، بل مشاركةُ ما تؤمن بقيمته مع احترامٍ كاملٍ لحرية الآخر في التفكير والاختيار بنفسه.',
      ),
      p2: tri(
        'At its heart, dawah is as much about how you live as what you say. A kept promise, an honest deal, a patient answer and a helping hand can speak louder than any words.',
        'Mu by’ukuri, dawah iri mu buryo ubaho nk’uko iri no mu byo uvuga. Isezerano ryubahirijwe, ubucuruzi bunyakuri, igisubizo cy’ubwihangane, n’ukuboko gufasha bishobora kuvuga kurusha amagambo yose.',
        'وجوهر الدعوة في كيفية عيشك بقدر ما هو في كلامك؛ فالوعد المحفوظ، والمعاملة الصادقة، والجواب الصبور، واليد التي تُعين قد تكون أبلغ من كل كلام.',
      ),
    },
    why: {
      eyebrow: tri('Why it matters', 'Impamvu ari ingirakamaro', 'لماذا تهمّ'),
      title: tri(
        'More than words — a way of life',
        'Birenze amagambo — ni uburyo bwo kubaho',
        'أكثر من كلمات — إنها منهج حياة',
      ),
      subtitle: tri(
        'Dawah shapes the person who offers it and strengthens the community around them.',
        'Dawah ihindura uwuyitanga kandi igakomeza umuryango umukikije.',
        'الدعوة تصوغ صاحبها وتقوّي المجتمع من حوله.',
      ),
      cards: {
        understanding: {
          title: tri('It builds understanding', 'Yubaka ukumvikana', 'تبني التفاهم'),
          body: tri(
            'In a diverse society, dawah opens honest, respectful conversation. It replaces suspicion with familiarity and helps neighbours know one another as they truly are.',
            'Mu muryango urimo abantu batandukanye, dawah ifungura ikiganiro cy’ukuri n’icyubahiro. Isimbuza urukeka ubumenyanyi, kandi ituma abaturanyi bamenyana uko bameze koko.',
            'في مجتمع متنوّع، تفتح الدعوة حوارًا صادقًا محترمًا، فتحلّ الألفة محلّ الريبة وتعرّف الجيران بعضهم ببعض على حقيقتهم.',
          ),
        },
        character: {
          title: tri('It strengthens character', 'Ikomeza imico', 'تقوّي الأخلاق'),
          body: tri(
            'Inviting others to good keeps us accountable to it first. Practising patience, honesty and compassion for the sake of others quietly shapes who we become.',
            'Gutumira abandi ku byiza bituma natwe tubibazwa mbere. Gukora ubwihangane, ukuri n’impuhwe ku bw’abandi bihindura icyo tuzaba mu ituze.',
            'دعوة الآخرين إلى الخير تجعلنا أول المحاسَبين عليه؛ فممارسة الصبر والصدق والرحمة من أجل الغير تصوغ من نكون في صمت.',
          ),
        },
        community: {
          title: tri('It serves the community', 'Ikorera umuryango', 'تخدم المجتمع'),
          body: tri(
            'Dawah is lived through service — feeding the hungry, teaching the young and standing for justice — leaving the community better than we found it.',
            'Dawah ibaho mu murimo — kugaburira ushonje, kwigisha abato, no guharanira ubutabera — tugasiga umuryango umeze neza kurusha uko twawusanze.',
            'الدعوة تُعاش بالخدمة — إطعام الجائع، وتعليم الصغير، ونصرة العدل — فنترك المجتمع أفضل مما وجدناه.',
          ),
        },
      },
    },
    principles: {
      eyebrow: tri('Core principles', 'Amahame shingiro', 'المبادئ الأساسية'),
      title: tri('The values that guide it', 'Indangagaciro ziyiyobora', 'القيم التي توجّهها'),
      subtitle: tri(
        'Dawah done well rests on timeless values that keep it sincere, gentle and true.',
        'Dawah nziza ishingiye ku ndangagaciro zihoraho zituma iba inyakuri, yoroheje kandi y’ukuri.',
        'الدعوة الحسنة تقوم على قيم راسخة تجعلها صادقة لطيفة صحيحة.',
      ),
      items: {
        wisdom: {
          title: tri('Wisdom', 'Ubwenge', 'الحكمة'),
          body: tri(
            'Meeting people where they are — choosing the right word, the right moment and the right tone for each person.',
            'Guhura n’abantu aho bageze — guhitamo ijambo rikwiye, igihe gikwiye, n’ijwi rikwiye kuri buri muntu.',
            'مخاطبة الناس على قدر حالهم — اختيار الكلمة المناسبة، واللحظة المناسبة، والأسلوب المناسب لكل شخص.',
          ),
        },
        compassion: {
          title: tri('Compassion', 'Impuhwe', 'الرحمة'),
          body: tri(
            'Caring genuinely for the wellbeing of others, in this life and the next, without judgement or harshness.',
            'Kwitaho by’ukuri imibereho myiza y’abandi, muri iyi si n’iyo izaza, nta gucira urubanza cyangwa ubukana.',
            'الحرص الصادق على خير الآخرين في الدنيا والآخرة، دون حكمٍ قاسٍ أو غلظة.',
          ),
        },
        knowledge: {
          title: tri('Knowledge', 'Ubumenyi', 'العلم'),
          body: tri(
            'Speaking from understanding rather than assumption — and having the humility to say “I don’t know.”',
            'Kuvuga ushingiye ku kumva atari ku bwikeka — kandi ukagira ukwicisha bugufi kwo kuvuga: «Simbizi.»',
            'الكلام عن فهمٍ لا عن ظن — مع تواضع من يقول: «لا أعلم».',
          ),
        },
        character: {
          title: tri('Good character', 'Imico myiza', 'حُسن الخُلق'),
          body: tri(
            'Living the message first. Honesty, humility and kindness are the most convincing invitation of all.',
            'Kubanza kubaho ubutumwa; ukuri, ukwicisha bugufi n’ineza ni bwo butumire bwemeza kurusha ubundi bwose.',
            'أن تعيش الرسالة أولًا؛ فالصدق والتواضع واللطف أبلغ دعوة على الإطلاق.',
          ),
        },
        patience: {
          title: tri('Patience', 'Ubwihangane', 'الصبر'),
          body: tri(
            'Guidance takes time. We plant, water and leave the outcome to God, never forcing a result.',
            'Kuyoborwa bisaba igihe; dutera, tuvomerera, tugasiga igisubizo ku Mana, nta guhatira umusaruro.',
            'الهداية تحتاج وقتًا؛ نزرع ونسقي ونترك النتيجة لله، دون إكراهٍ على ثمرة.',
          ),
        },
      },
    },
    practices: {
      eyebrow: tri('In practice', 'Mu bikorwa', 'في الممارسة'),
      title: tri('How Dawah is lived', 'Uko dawah ibaho', 'كيف تُعاش الدعوة'),
      subtitle: tri(
        'There is no single method. These are some of the ways Muslims share and embody it every day.',
        'Nta buryo bumwe gusa; dore bumwe mu buryo Abayisilamu bayisangiza kandi bakayigaragaza buri munsi.',
        'لا طريقة واحدة لها؛ هذه بعض ما يشارك به المسلمون ويجسّدونه كل يوم.',
      ),
      items: {
        example: {
          title: tri('By example', 'Ku rugero', 'بالقدوة'),
          body: tri(
            'The most powerful dawah is a life well lived — reliable, generous and calm — so that goodness is seen before it is ever heard.',
            'Dawah ikomeye cyane ni ubuzima bwiza — bwizewe, butanga, butuje — ku buryo icyiza kibonwa mbere yo kumvikana.',
            'أقوى دعوة حياةٌ حسنة — موثوقة، كريمة، هادئة — فيُرى الخير قبل أن يُسمع.',
          ),
        },
        learning: {
          title: tri('Through learning & teaching', 'Binyuze mu kwiga no kwigisha', 'بالتعلّم والتعليم'),
          body: tri(
            'Studying the deen and sharing it clearly, from a simple conversation to a structured course, so understanding grows on firm ground.',
            'Kwiga idini no kurisangiza mu buryo busobanutse, kuva ku kiganiro cyoroshye kugeza ku isomo ritunganijwe, kugira ngo ukumva gukurire ku rufatiro rukomeye.',
            'دراسة الدين ومشاركته بوضوح، من حديثٍ بسيط إلى دورةٍ منظّمة، لينمو الفهم على أساسٍ متين.',
          ),
        },
        conversation: {
          title: tri('Through conversation', 'Binyuze mu kiganiro', 'بالحوار'),
          body: tri(
            'Listening first, answering questions with respect and welcoming honest dialogue across faiths and backgrounds.',
            'Kubanza kumva, gusubiza ibibazo wubaha, no kwakira ikiganiro cy’ukuri hagati y’amadini n’inkomoko zitandukanye.',
            'الإنصات أولًا، والإجابة عن الأسئلة باحترام، والترحيب بالحوار الصادق عبر الأديان والخلفيات.',
          ),
        },
        service: {
          title: tri('Through service', 'Binyuze mu murimo', 'بالخدمة'),
          body: tri(
            'Meeting real needs with charity, mentorship and support — because compassion in action speaks to every heart.',
            'Kuzuza ibyifuzo nyakuri binyuze mu buntu, ubujyanama n’inkunga — kuko impuhwe mu bikorwa zivugana na buri mutima.',
            'تلبية الحاجات الحقيقية بالصدقة والإرشاد والدعم — فالرحمة في الفعل تخاطب كل قلب.',
          ),
        },
      },
    },
    faq: {
      eyebrow: tri('Questions', 'Ibibazo', 'أسئلة'),
      title: tri('Common questions', 'Ibibazo bikunze kubazwa', 'أسئلة شائعة'),
      subtitle: tri(
        'A few things people often ask about dawah.',
        'Bimwe mu byo abantu bakunze kubaza kuri dawah.',
        'بعض ما يسأل عنه الناس كثيرًا حول الدعوة.',
      ),
      items: {
        f1: {
          q: tri(
            'Is dawah about converting people?',
            'Dawah igamije guhindura idini ry’abantu?',
            'هل الدعوة تهدف إلى تغيير دين الناس؟',
          ),
          a: tri(
            'No. Dawah means sincerely sharing and inviting; guidance itself rests with God alone. The goal is understanding and goodwill, never coercion — “There is no compulsion in religion.” (Qur’an 2:256)',
            'Oya. Dawah ni ugusangira no gutumira by’ukuri; kuyobora ubwabyo biri mu maboko y’Imana yonyine. Intego ni ukumvikana n’ineza, atari agahato — «Nta gahato mu idini.» (Qur’an 2:256)',
            'لا؛ الدعوة مشاركةٌ صادقة ودعوةٌ بلُطف، أما الهداية فبيد الله وحده. الغاية هي التفاهم وحُسن النية لا الإكراه — «لَا إِكْرَاهَ فِي الدِّينِ». (القرآن ٢:٢٥٦)',
          ),
        },
        f2: {
          q: tri(
            'Do I need to be a scholar to take part?',
            'Ese ngomba kuba umuhanga kugira ngo mpagarare?',
            'هل يلزم أن أكون عالِمًا لأشارك؟',
          ),
          a: tri(
            'Not at all. Everyone can practise dawah through good character, honesty and kindness. Share what you know clearly, and it is always fine to say “I’m not sure — let me find out.”',
            'Nta na gato. Buri wese ashobora gukora dawah binyuze mu mico myiza, ukuri n’ineza. Sangiza ibyo uzi mu buryo busobanutse, kandi nta kibazo kuvuga: «Simbyizeye — reka mbanze nshakishe.»',
            'أبدًا؛ يستطيع الجميع ممارسة الدعوة بحُسن الخُلق والصدق واللطف. شارك ما تعرفه بوضوح، ولا حرج أن تقول: «لستُ متأكدًا، دعني أبحث».',
          ),
        },
        f3: {
          q: tri('Is dawah only for Muslims?', 'Dawah ni iy’Abayisilamu gusa?', 'هل الدعوة للمسلمين فقط؟'),
          a: tri(
            'Its lessons — patience, service and respectful dialogue — reach everyone. Muslims also practise dawah among themselves, encouraging one another toward good.',
            'Amasomo yayo — ubwihangane, umurimo n’ikiganiro cy’icyubahiro — ageza kuri bose. Abayisilamu bakora dawah no hagati yabo, bashishikariza bagenzi babo ibyiza.',
            'دروسها — الصبر والخدمة والحوار المحترم — تصل إلى الجميع، ويمارس المسلمون الدعوة فيما بينهم أيضًا، يحثّ بعضهم بعضًا على الخير.',
          ),
        },
        f4: {
          q: tri(
            'How is dawah different from preaching?',
            'Dawah itandukaniye he no kwamamaza?',
            'ما الفرق بين الدعوة والوعظ؟',
          ),
          a: tri(
            'Dawah is an invitation, not a lecture. It values listening, wisdom and respect for the other person’s freedom to choose as much as the message itself.',
            'Dawah ni ubutumire, atari inyigisho. Iha agaciro kumva, ubwenge n’icyubahiro cy’uburenganzira bw’undi bwo guhitamo, nk’uko iha agaciro ubutumwa ubwabwo.',
            'الدعوة دعوةٌ لا محاضرة؛ تُقدّر الإنصات والحكمة واحترام حرية الآخر في الاختيار بقدر ما تُقدّر الرسالة نفسها.',
          ),
        },
        f5: {
          q: tri('How can I get involved with RMC?', 'Nagira uruhare mu RMC nte?', 'كيف أشارك مع RMC؟'),
          a: tri(
            'Start with our courses and library to learn, join the discussions to ask and answer questions, or contact us to take part in community programs.',
            'Tangira ku masomo yacu n’isomero kugira ngo wige, ujye mu biganiro kugira ngo ubaze usubize, cyangwa uduhamagare kugira ngo ugire uruhare muri gahunda z’umuryango.',
            'ابدأ بدوراتنا ومكتبتنا للتعلّم، وانضم إلى النقاشات لتسأل وتجيب، أو تواصل معنا للمشاركة في برامج المجتمع.',
          ),
        },
      },
    },
    cta: {
      eyebrow: tri('Get involved', 'Gira uruhare', 'شارك معنا'),
      title: tri('Start your journey today', 'Tangira urugendo rwawe uyu munsi', 'ابدأ رحلتك اليوم'),
      subtitle: tri(
        'Learn at your own pace, ask your questions and take part in the life of the community.',
        'Iga ku muvuduko wawe, baza ibibazo byawe, kandi ugire uruhare mu buzima bw’umuryango.',
        'تعلّم وفق وتيرتك، واطرح أسئلتك، وكن جزءًا من حياة المجتمع.',
      ),
      primary: tri('Explore courses', 'Reba amasomo', 'استكشف الدورات'),
      secondary: tri('Contact us', 'Twandikire', 'تواصل معنا'),
    },
  },
};
