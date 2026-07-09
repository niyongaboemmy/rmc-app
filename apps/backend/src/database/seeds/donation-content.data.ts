/* AUTO-GENERATED seed content for donation categories & sub-funds.
   Extracted from the donate i18n namespace (en/rw/ar) + donateData.ts icons/images.
   Used by 02b-donation-content.seed.ts. Safe to edit, but normally regenerated. */

export interface TriText {
  en: string;
  rw: string;
  ar: string;
}
export interface TriList {
  en: string[];
  rw: string[];
  ar: string[];
}

export interface SeedSubFund {
  key: string;
  image: string;
  campaignSlug: string | null;
  sortOrder: number;
  label: TriText;
  long: TriText;
  impact: TriText;
  examples: TriList;
}
export interface SeedCategory {
  key: string;
  icon: string;
  tone: string;
  image: string;
  sortOrder: number;
  title: TriText;
  desc: TriText;
  long: TriText;
  impact: TriText;
  subfunds: SeedSubFund[];
}

export const DONATION_CONTENT: SeedCategory[] = [
  {
    key: 'school',
    icon: 'GraduationCap',
    tone: 'green',
    image:
      'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop',
    sortOrder: 0,
    title: {
      en: 'School Related',
      rw: 'Uburezi',
      ar: 'التعليم',
    },
    desc: {
      en: 'Scholarships, books & Islamic education.',
      rw: "Buruse, ibitabo n'uburezi bw'Islamu.",
      ar: 'المنح الدراسية والكتب والتعليم الإسلامي.',
    },
    long: {
      en: "Open the doors of knowledge for the next generation — from Qur'an classes to university scholarships for talented students who cannot afford the fees.",
      rw: "Fungurira ubumenyi abana b'ejo — kuva mu masomo ya Qur'an kugeza kuri buruse za kaminuza ku banyeshuri b'inararibonye badashobora kwishyura.",
      ar: 'افتح أبواب العلم للجيل القادم — من حلقات القرآن إلى المنح الجامعية للطلاب النابغين الذين لا يقدرون على الرسوم.',
    },
    impact: {
      en: 'RWF 18M deployed · 2,000+ students reached',
      rw: 'RWF 18M yatanzwe · abanyeshuri barenga 2,000 bagezweho',
      ar: '18 مليون فرنك رواندي مُنفقة · أكثر من 2,000 طالب مستفيد',
    },
    subfunds: [
      {
        key: 'scholarship',
        image:
          'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop',
        campaignSlug: null,
        sortOrder: 0,
        label: {
          en: 'Scholarship Fund',
          rw: 'Ikigega cya Buruse',
          ar: 'صندوق المنح الدراسية',
        },
        long: {
          en: 'Full and partial scholarships for bright students from low-income families, covering the cost of staying in school through to graduation.',
          rw: "Buruse zuzuye n'iz'igice ku banyeshuri b'inararibonye baturuka mu miryango ikennye, zishyura uko bakomeza amashuri kugeza barangije.",
          ar: 'منح كاملة وجزئية للطلاب النابغين من الأسر محدودة الدخل، تغطّي تكاليف بقائهم في الدراسة حتى التخرّج.',
        },
        impact: {
          en: '200+ students sponsored',
          rw: 'abanyeshuri barenga 200 bafashijwe',
          ar: 'أكثر من 200 طالب مكفول',
        },
        examples: {
          en: ['Tuition', 'Exam fees', 'Stipends'],
          rw: ["Amafaranga y'ishuri", "Amafaranga y'ibizamini", 'Inkunga'],
          ar: ['الرسوم الدراسية', 'رسوم الامتحانات', 'مصروف شهري'],
        },
      },
      {
        key: 'madrassa',
        image:
          'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=600&auto=format&fit=crop',
        campaignSlug: null,
        sortOrder: 1,
        label: {
          en: 'Madrassa & Books',
          rw: "Madrassa n'Ibitabo",
          ar: 'المدارس القرآنية والكتب',
        },
        long: {
          en: "Equip Qur'an schools across the provinces with the books and materials children need to learn to read and memorise the Qur'an.",
          rw: "Guha amashuri ya Qur'an mu ntara zose ibitabo n'ibikoresho abana bakeneye kugira ngo bige gusoma no kwiga Qur'an ku mutwe.",
          ar: 'تجهيز مدارس تحفيظ القرآن في جميع المقاطعات بالكتب والمواد التي يحتاجها الأطفال لتعلّم القراءة وحفظ القرآن.',
        },
        impact: {
          en: '30 madrassas supplied',
          rw: "amashuri 30 ya Qur'an yahawe ibikoresho",
          ar: '30 مدرسة قرآنية مُجهّزة',
        },
        examples: {
          en: ["Qur'ans", 'Textbooks', 'Teaching aids'],
          rw: ["Qur'an", 'Ibitabo', 'Ibikoresho byo kwigisha'],
          ar: ['مصاحف', 'كتب دراسية', 'وسائل تعليمية'],
        },
      },
      {
        key: 'teachers',
        image:
          'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=600&auto=format&fit=crop',
        campaignSlug: null,
        sortOrder: 2,
        label: {
          en: 'Teacher Support',
          rw: 'Gufasha Abarimu',
          ar: 'دعم المعلّمين',
        },
        long: {
          en: "Stipends and training for the teachers and du'āt who dedicate their lives to educating the community.",
          rw: "Inkunga n'amahugurwa ku barimu n'abacengezamatwara batanga ubuzima bwabo mu kwigisha umuryango.",
          ar: 'مكافآت وتدريب للمعلّمين والدُّعاة الذين يكرّسون حياتهم لتعليم المجتمع.',
        },
        impact: {
          en: '85 educators supported',
          rw: 'abarimu 85 bashyigikiwe',
          ar: '85 معلّمًا مدعومًا',
        },
        examples: {
          en: ['Salaries', 'Training', 'Materials'],
          rw: ['Imishahara', 'Amahugurwa', 'Ibikoresho'],
          ar: ['رواتب', 'تدريب', 'مواد'],
        },
      },
    ],
  },
  {
    key: 'charity',
    icon: 'HandHeart',
    tone: 'green',
    image:
      'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=600&auto=format&fit=crop',
    sortOrder: 1,
    title: {
      en: 'Charity',
      rw: 'Impuhwe',
      ar: 'الصدقة',
    },
    desc: {
      en: 'Feeding the hungry & supporting the poor.',
      rw: 'Kugaburira abashonji no gufasha abakene.',
      ar: 'إطعام الجائعين ومساندة الفقراء.',
    },
    long: {
      en: 'Direct relief for the most vulnerable — food parcels for struggling families, care for orphans, and medical aid for those who would otherwise go without.',
      rw: "Ubufasha butaziguye ku bakeneye cyane — imfungurwa ku miryango ikennye, kwita ku mfubyi, n'ubuvuzi ku batabona uko bivuza.",
      ar: 'إغاثة مباشرة لأشدّ الناس حاجة — طرود غذائية للأسر المتعثّرة، ورعاية للأيتام، ومساعدات طبية لمن لا يجدون العلاج.',
    },
    impact: {
      en: '5,000 families fed last Ramadan',
      rw: 'imiryango 5,000 yagaburiwe muri Ramadhan ishize',
      ar: '5,000 أسرة أُطعمت في رمضان الماضي',
    },
    subfunds: [
      {
        key: 'foodbank',
        image:
          'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=600&auto=format&fit=crop',
        campaignSlug: null,
        sortOrder: 0,
        label: {
          en: 'Food Bank',
          rw: "Ikigega cy'Ibiribwa",
          ar: 'بنك الطعام',
        },
        long: {
          en: 'Monthly food parcels of staple goods for families facing hardship, with extra support during Ramadan.',
          rw: "Imifuka y'ibiribwa by'ibanze buri kwezi ku miryango ifite ingorane, hamwe n'inkunga yiyongera muri Ramadhan.",
          ar: 'طرود غذائية شهرية من المواد الأساسية للأسر التي تواجه ضائقة، مع دعم إضافي خلال رمضان.',
        },
        impact: {
          en: '5,000 families fed',
          rw: 'imiryango 5,000 yagaburiwe',
          ar: '5,000 أسرة أُطعمت',
        },
        examples: {
          en: ['Rice', 'Oil', 'Flour', 'Dates'],
          rw: ['Umuceri', 'Amavuta', 'Ifu', 'Imitende'],
          ar: ['أرز', 'زيت', 'دقيق', 'تمر'],
        },
      },
      {
        key: 'orphans',
        image:
          'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=600&auto=format&fit=crop',
        campaignSlug: null,
        sortOrder: 1,
        label: {
          en: 'Orphan Sponsorship',
          rw: 'Kurera Imfubyi',
          ar: 'كفالة الأيتام',
        },
        long: {
          en: "Sponsor an orphan's essential needs so they can grow up with dignity, nourishment and an education.",
          rw: "Tera inkunga ibikenewe by'ingenzi ku mfubyi kugira ngo ikure ifite agaciro, ifunguro n'uburezi.",
          ar: 'اكفل احتياجات يتيم الأساسية ليكبر بكرامة وغذاء وتعليم.',
        },
        impact: {
          en: '300 orphans cared for',
          rw: 'imfubyi 300 zitabwaho',
          ar: '300 يتيم تُرعى شؤونهم',
        },
        examples: {
          en: ['Food', 'Clothing', 'Schooling'],
          rw: ['Ibiribwa', 'Imyenda', 'Amashuri'],
          ar: ['طعام', 'ملابس', 'تعليم'],
        },
      },
      {
        key: 'medical',
        image:
          'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=600&auto=format&fit=crop',
        campaignSlug: null,
        sortOrder: 2,
        label: {
          en: 'Medical Aid',
          rw: 'Ubufasha mu Buvuzi',
          ar: 'المساعدات الطبية',
        },
        long: {
          en: 'Cover the cost of consultations, medicine and urgent treatment for those who cannot afford care.',
          rw: "Kwishyura ibiganiro by'ubuvuzi, imiti n'ubuvuzi bwihutirwa ku batabona uko bivuza.",
          ar: 'تغطية تكاليف الاستشارات والأدوية والعلاج العاجل لمن لا يقدرون على الرعاية الصحية.',
        },
        impact: {
          en: '1,200 treatments funded',
          rw: 'indwara 1,200 zafashijwe kuvurwa',
          ar: '1,200 حالة علاجية مُموّلة',
        },
        examples: {
          en: ['Medicine', 'Consultations', 'Surgery'],
          rw: ['Imiti', 'Ibiganiro', 'Kubagwa'],
          ar: ['أدوية', 'استشارات', 'عمليات'],
        },
      },
    ],
  },
  {
    key: 'religious',
    icon: 'BookOpen',
    tone: 'gold',
    image:
      'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?q=80&w=600&auto=format&fit=crop',
    sortOrder: 2,
    title: {
      en: 'Religious',
      rw: "Iby'idini",
      ar: 'الشؤون الدينية',
    },
    desc: {
      en: 'Masjid upkeep & community worship.',
      rw: "Kubungabunga imisigiti no gusenga kw'umuryango.",
      ar: 'صيانة المساجد وعبادة المجتمع.',
    },
    long: {
      en: "Sustain the houses of Allah and those who serve them — mosque maintenance, support for imams, and Qur'ans placed in the hands of the community.",
      rw: "Shyigikira amazu y'Imana n'abayakorera — kubungabunga imisigiti, gufasha ba imamu, no gushyira Qur'an mu maboko y'umuryango.",
      ar: 'ادعم بيوت الله ومن يخدمونها — صيانة المساجد، ودعم الأئمّة، وتوفير المصاحف بين أيدي المجتمع.',
    },
    impact: {
      en: '40 mosques maintained · 120 imams trained',
      rw: 'imisigiti 40 yabungabunzwe · ba imamu 120 batojwe',
      ar: '40 مسجدًا تُصان · 120 إمامًا تدرّبوا',
    },
    subfunds: [
      {
        key: 'masjid',
        image:
          'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?q=80&w=600&auto=format&fit=crop',
        campaignSlug: null,
        sortOrder: 0,
        label: {
          en: 'Masjid Maintenance',
          rw: 'Kubungabunga Imisigiti',
          ar: 'صيانة المساجد',
        },
        long: {
          en: 'Keep mosques clean, lit and in good repair — from utility bills to roofing and wudu facilities.',
          rw: "Gukomeza imisigiti isukuye, ifite urumuri kandi iri mu mimerere myiza — kuva ku matereza kugeza ku gisenge n'ahantu ho gukora wudhu.",
          ar: 'حفاظ على نظافة المساجد وإنارتها وحسن حالها — من فواتير المرافق إلى الأسقف ومرافق الوضوء.',
        },
        impact: {
          en: '40 mosques maintained',
          rw: 'imisigiti 40 ibungabunzwe',
          ar: '40 مسجدًا تُصان',
        },
        examples: {
          en: ['Repairs', 'Utilities', 'Cleaning'],
          rw: ['Gusana', "Amazi n'amashanyarazi", 'Isuku'],
          ar: ['إصلاحات', 'مرافق', 'نظافة'],
        },
      },
      {
        key: 'imam',
        image:
          'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=600&auto=format&fit=crop',
        campaignSlug: null,
        sortOrder: 1,
        label: {
          en: 'Imam Support',
          rw: 'Gufasha ba Imamu',
          ar: 'دعم الأئمّة',
        },
        long: {
          en: 'Stipends, training and outreach support for the imams who lead prayer and serve their communities.',
          rw: "Inkunga, amahugurwa n'ubufasha mu butumwa ku ba imamu bayobora amasengesho bakanakorera imiryango yabo.",
          ar: 'مكافآت وتدريب ودعم دعوي للأئمّة الذين يؤمّون الصلاة ويخدمون مجتمعاتهم.',
        },
        impact: {
          en: '120 imams supported',
          rw: 'ba imamu 120 bashyigikiwe',
          ar: '120 إمامًا مدعومًا',
        },
        examples: {
          en: ['Stipends', 'Training', 'Outreach'],
          rw: ['Inkunga', 'Amahugurwa', 'Ubutumwa'],
          ar: ['مكافآت', 'تدريب', 'دعوة'],
        },
      },
      {
        key: 'quran',
        image:
          'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=600&auto=format&fit=crop',
        campaignSlug: null,
        sortOrder: 2,
        label: {
          en: "Qur'an Distribution",
          rw: "Gukwirakwiza Qur'an",
          ar: 'توزيع المصاحف',
        },
        long: {
          en: 'Print and distribute mushafs so every household and mosque has access to the Book of Allah.',
          rw: "Gucapa no gukwirakwiza Qur'an kugira ngo buri rugo na buri musigiti bibone igitabo cy'Imana.",
          ar: 'طباعة وتوزيع المصاحف ليكون لكل بيت ومسجد نصيب من كتاب الله.',
        },
        impact: {
          en: '10,000 mushafs distributed',
          rw: "Qur'an 10,000 zakwirakwijwe",
          ar: '10,000 مصحف وُزّع',
        },
        examples: {
          en: ['Printing', 'Distribution', 'Audio copies'],
          rw: ['Gucapa', 'Gukwirakwiza', "Kopi z'amajwi"],
          ar: ['طباعة', 'توزيع', 'نسخ صوتية'],
        },
      },
    ],
  },
  {
    key: 'events',
    icon: 'CalendarDays',
    tone: 'gold',
    image:
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=600&auto=format&fit=crop',
    sortOrder: 3,
    title: {
      en: 'Events',
      rw: 'Ibirori',
      ar: 'الفعاليات',
    },
    desc: {
      en: 'Qiyam, iftars, youth camps & more.',
      rw: "Qiyam, ifutari, amakambi y'urubyiruko n'ibindi.",
      ar: 'قيام، إفطارات، مخيّمات شبابية وأكثر.',
    },
    long: {
      en: 'Bring the ummah together — fund the gatherings that strengthen faith and community, from Eid celebrations to youth camps and national competitions.',
      rw: "Huza umuryango (ummah) — terera inkunga amahuriro akomeza ukwemera n'umuryango, kuva mu birori bya Idi kugeza ku makambi y'urubyiruko n'amarushanwa y'igihugu.",
      ar: 'اجمع الأمّة — مَوِّل اللقاءات التي تقوّي الإيمان والمجتمع، من احتفالات العيد إلى المخيّمات الشبابية والمسابقات الوطنية.',
    },
    impact: {
      en: 'RWF 84M raised across active campaigns',
      rw: 'RWF 84M yakusanyijwe mu bikorwa biriho',
      ar: '84 مليون فرنك رواندي جُمعت عبر الحملات النشطة',
    },
    subfunds: [
      {
        key: 'e1',
        image:
          'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?q=80&w=600&auto=format&fit=crop',
        campaignSlug: 'e1',
        sortOrder: 0,
        label: {
          en: 'Eid al-Adha National Celebration',
          rw: "Umunsi Mukuru wa Idi al-Adha ku Rwego rw'Igihugu",
          ar: 'احتفال عيد الأضحى الوطني',
        },
        long: {
          en: 'Host the national Eid al-Adha celebration — prayer, qurbani and a shared meal that brings thousands of believers together.',
          rw: "Kwakira umunsi mukuru wa Idi al-Adha ku rwego rw'igihugu — amasengesho, igitambo n'ifunguro rusange bihuza ibihumbi by'abemera.",
          ar: 'استضافة احتفال عيد الأضحى الوطني — صلاة وأضاحٍ ووجبة مشتركة تجمع آلاف المؤمنين.',
        },
        impact: {
          en: '',
          rw: '',
          ar: '',
        },
        examples: {
          en: ['Venue', 'Qurbani', 'Catering'],
          rw: ['Ahabera', 'Igitambo', 'Ibiryo'],
          ar: ['المكان', 'الأضاحي', 'الضيافة'],
        },
      },
      {
        key: 'e2',
        image:
          'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop',
        campaignSlug: 'e2',
        sortOrder: 1,
        label: {
          en: 'RMC Annual Scholarship Awards Ceremony',
          rw: 'Umuhango wa RMC wo Guha Buruse buri Mwaka',
          ar: 'حفل جوائز المنح السنوي لـ RMC',
        },
        long: {
          en: 'Celebrate and fund the next cohort of RMC scholars at the annual awards ceremony, recognising academic excellence.',
          rw: 'Kwizihiza no gutera inkunga itsinda rishya ry’abanyeshuri ba RMC mu muhango wa buri mwaka wo guha ibihembo, dushimira ubuhanga mu masomo.',
          ar: 'احتفِ بالدفعة القادمة من طلاب RMC وادعمهم في حفل الجوائز السنوي تكريمًا للتفوّق الأكاديمي.',
        },
        impact: {
          en: '',
          rw: '',
          ar: '',
        },
        examples: {
          en: ['Awards', 'Scholarships', 'Ceremony'],
          rw: ['Ibihembo', 'Buruse', 'Umuhango'],
          ar: ['جوائز', 'منح', 'حفل'],
        },
      },
      {
        key: 'e3',
        image:
          'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=600&auto=format&fit=crop',
        campaignSlug: 'e3',
        sortOrder: 2,
        label: {
          en: 'Muslim Women Leadership Summit',
          rw: "Inama y'Ubuyobozi bw'Abagore b'Abayisilamu",
          ar: 'قمّة القيادة للمرأة المسلمة',
        },
        long: {
          en: 'Empower Muslim women through a leadership summit of workshops, mentorship and networking across the country.',
          rw: "Guha imbaraga abagore b'Abayisilamu binyuze mu nama y'ubuyobozi irimo amahugurwa, uburezi n'iyubakwa ry'urusobe mu gihugu hose.",
          ar: 'تمكين المرأة المسلمة عبر قمّة قيادية من ورش العمل والإرشاد وبناء الشبكات في أنحاء البلاد.',
        },
        impact: {
          en: '',
          rw: '',
          ar: '',
        },
        examples: {
          en: ['Workshops', 'Speakers', 'Logistics'],
          rw: ['Amahugurwa', 'Abavugizi', 'Imitunganyirize'],
          ar: ['ورش عمل', 'متحدّثون', 'تنظيم'],
        },
      },
      {
        key: 'e4',
        image:
          'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=600&auto=format&fit=crop',
        campaignSlug: 'e4',
        sortOrder: 3,
        label: {
          en: "Qur'an Recitation Competition — National Finals",
          rw: "Irushanwa ryo Gusoma Qur'an — Fainali z'Igihugu",
          ar: 'مسابقة تلاوة القرآن — النهائيات الوطنية',
        },
        long: {
          en: "Stage the national finals of the Qur'an recitation competition, honouring the huffāz of Rwanda.",
          rw: "Gukora fainali z'igihugu z'irushanwa ryo gusoma Qur'an, dushimira abazi Qur'an ku mutwe bo mu Rwanda.",
          ar: 'إقامة النهائيات الوطنية لمسابقة تلاوة القرآن تكريمًا لحفّاظ رواندا.',
        },
        impact: {
          en: '',
          rw: '',
          ar: '',
        },
        examples: {
          en: ['Prizes', 'Judging', 'Venue'],
          rw: ['Ibihembo', 'Abacamanza', 'Ahabera'],
          ar: ['جوائز', 'تحكيم', 'المكان'],
        },
      },
      {
        key: 'e5',
        image:
          'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=600&auto=format&fit=crop',
        campaignSlug: 'e5',
        sortOrder: 4,
        label: {
          en: 'RMC General Assembly Meeting',
          rw: 'Inteko Rusange ya RMC',
          ar: 'اجتماع الجمعية العامة لـ RMC',
        },
        long: {
          en: "Support the running of RMC's General Assembly — the governance gathering that steers the community's work.",
          rw: "Gushyigikira iterana ry'Inteko Rusange ya RMC — ihuriro ry'imiyoborere riyobora imirimo y'umuryango.",
          ar: 'دعم انعقاد الجمعية العامة لـ RMC — اللقاء الإداري الذي يوجّه عمل المجتمع.',
        },
        impact: {
          en: '',
          rw: '',
          ar: '',
        },
        examples: {
          en: ['Venue', 'Travel', 'Materials'],
          rw: ['Ahabera', 'Ingendo', 'Ibikoresho'],
          ar: ['المكان', 'السفر', 'المواد'],
        },
      },
    ],
  },
];
