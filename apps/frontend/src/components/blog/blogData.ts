// Localized placeholder blog content — swap for a CMS/API feed later.
// Structural fields (slug, image, date) are shared; text is per-locale.
// ⚠️ Arabic/Kinyarwanda translations are best-effort — review before publishing.

export interface BlogPost {
  slug: string;
  image: string;
  date: string; // ISO date
  title: string;
  excerpt: string;
  summary: string;
  category: string;
  author: string;
  content: string[];
}

interface PostMeta {
  slug: string;
  image: string;
  date: string;
}

interface PostText {
  title: string;
  excerpt: string;
  summary: string;
  category: string;
  author: string;
  content: string[];
}

// Shared structure — ordered most-recent first.
const META: PostMeta[] = [
  {
    slug: 'free-translated-quran-initiative',
    image: 'https://drive.google.com/thumbnail?id=1y0QOLz--4XxIthJh7sViyl7KU7XFbd2t&sz=w1600',
    date: '2026-06-05',
  },
  {
    slug: 'ramadan-2026-community-iftars',
    image: 'https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large',
    date: '2026-05-20',
  },
  {
    slug: 'adef-partnership-religious-literacy',
    image: 'https://drive.google.com/thumbnail?id=1-V1PRFYujv6JHscMzlBlLLayQA9REX7T&sz=w1600',
    date: '2026-05-02',
  },
  {
    slug: 'youth-leadership-camp-2026',
    image: 'https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large',
    date: '2026-04-18',
  },
  {
    slug: 'zakat-distribution-5000-families',
    image: 'https://lh3.googleusercontent.com/d/1JAOmqaWrQjILrZjGXVt9jP5EpjmR5PNr=w1600?authuser=0',
    date: '2026-04-01',
  },
];

const TEXT: Record<string, Record<string, PostText>> = {
  en: {
    'free-translated-quran-initiative': {
      title: 'RMC Launches Free Translated Qur’an Initiative',
      excerpt: 'Free translated Qur’an copies now reach communities across Rwanda.',
      summary:
        'A new community programme makes the translated Holy Qur’an available free of charge to the public, expanding access to religious resources across Rwanda.',
      category: 'Community Support',
      author: 'RMC Communications',
      content: [
        'The Rwanda Muslim Community has launched a nationwide initiative to make the translated Holy Qur’an available free of charge to the public, removing cost as a barrier to religious learning.',
        'Copies will be distributed through mosques and community centres in every province, with priority given to schools, new Muslims, and families in need.',
        'The programme reflects RMC’s wider mission of community support — offering religious resources openly and ensuring that guidance from the Qur’an reaches everyone who seeks it.',
      ],
    },
    'ramadan-2026-community-iftars': {
      title: 'Ramadan 2026: Community Iftars Across All Provinces',
      excerpt: 'Thousands shared iftars and prayers across every province this Ramadan.',
      summary:
        'Thousands gathered for shared iftars, Taraweeh prayers, and food distribution throughout the holy month in every province of Rwanda.',
      category: 'Religious Events',
      author: 'RMC Communications',
      content: [
        'Ramadan 2026 brought communities together across all five provinces of Rwanda for shared iftars, nightly Taraweeh prayers, and the distribution of food to those in need.',
        'Local mosques coordinated volunteers and donations, ensuring that no family went without a meal during the holy month.',
        'The season reaffirmed the spirit of unity and generosity at the heart of the community’s religious life.',
      ],
    },
    'adef-partnership-religious-literacy': {
      title: 'New Partnership with ADEF to Boost Religious Literacy',
      excerpt: 'RMC partners with ADEF to advance religious literacy nationwide.',
      summary:
        'The Africa Development and Education Foundation joins RMC to strengthen religious literacy and educational advancement nationwide.',
      category: 'Education & Learning',
      author: 'RMC Communications',
      content: [
        'RMC has entered a new partnership with the Africa Development and Education Foundation (ADEF) to advance religious literacy and education across the country.',
        'The collaboration will support teacher training, learning materials, and scholarships, building on RMC’s vision of educational advancement.',
        'Together, the organisations aim to strengthen both religious and secular learning for the next generation.',
      ],
    },
    'youth-leadership-camp-2026': {
      title: 'Annual Youth Leadership Camp Returns This Summer',
      excerpt: 'Young Muslims gather this summer for leadership training and seminars.',
      summary:
        'Young Muslims from across the country come together for leadership training, seminars, and community-building activities.',
      category: 'Youth Programs',
      author: 'RMC Communications',
      content: [
        'The annual Youth Leadership Camp returns this summer, gathering young Muslims from across Rwanda for training, seminars, and community-building activities.',
        'Participants will develop leadership skills, deepen their faith, and form lasting connections with peers from every province.',
        'The camp is part of RMC’s ongoing commitment to empowering the next generation of the ummah.',
      ],
    },
    'zakat-distribution-5000-families': {
      title: 'Zakat Distribution Reaches 5,000 Families Nationwide',
      excerpt: 'This year’s Zakat drive supported 5,000 families across the country.',
      summary:
        'Transparent collection and distribution of Zakat and Sadaqah delivered essential support to thousands of families in need this year.',
      category: 'Community Services',
      author: 'RMC Communications',
      content: [
        'This year’s Zakat and Sadaqah drive reached 5,000 families nationwide, delivering essential support to vulnerable members of the community.',
        'RMC maintained a transparent process for collecting and distributing funds, ensuring contributions reached those who needed them most.',
        'The effort underscores the community’s dedication to social welfare and mutual care.',
      ],
    },
  },

  ar: {
    'free-translated-quran-initiative': {
      title: 'المجتمع الإسلامي الرواندي يطلق مبادرة القرآن المترجم المجاني',
      excerpt: 'نسخ مجانية من القرآن المترجم تصل الآن إلى المجتمعات في جميع أنحاء رواندا.',
      summary:
        'برنامج مجتمعي جديد يتيح القرآن الكريم المترجم مجاناً للجمهور، موسّعاً الوصول إلى الموارد الدينية في جميع أنحاء رواندا.',
      category: 'الدعم المجتمعي',
      author: 'إدارة الاتصال في RMC',
      content: [
        'أطلق المجتمع الإسلامي الرواندي مبادرة وطنية لإتاحة القرآن الكريم المترجم مجاناً للجمهور، رافعاً عائق التكلفة أمام التعلّم الديني.',
        'ستُوزَّع النسخ عبر المساجد والمراكز المجتمعية في كل مقاطعة، مع إعطاء الأولوية للمدارس والمسلمين الجدد والأسر المحتاجة.',
        'تعكس المبادرة رسالة RMC الأوسع في الدعم المجتمعي — تقديم الموارد الدينية بشكل مفتوح وضمان وصول هداية القرآن إلى كل من يطلبها.',
      ],
    },
    'ramadan-2026-community-iftars': {
      title: 'رمضان 2026: موائد إفطار جماعية في جميع المقاطعات',
      excerpt: 'آلاف تشاركوا الإفطار والصلاة في كل مقاطعة هذا الرمضان.',
      summary:
        'تجمّع الآلاف لموائد الإفطار الجماعية وصلاة التراويح وتوزيع الطعام طوال الشهر الفضيل في كل مقاطعة من رواندا.',
      category: 'المناسبات الدينية',
      author: 'إدارة الاتصال في RMC',
      content: [
        'جمع رمضان 2026 المجتمعات معاً في المقاطعات الخمس جميعها بموائد إفطار جماعية، وصلاة تراويح ليلية، وتوزيع الطعام على المحتاجين.',
        'نسّقت المساجد المحلية المتطوعين والتبرعات، مؤكدةً ألا تبقى أي أسرة بلا طعام خلال الشهر الفضيل.',
        'وأكّد الموسم من جديد روح الوحدة والكرم في صميم الحياة الدينية للمجتمع.',
      ],
    },
    'adef-partnership-religious-literacy': {
      title: 'شراكة جديدة مع مؤسسة ADEF لتعزيز المعرفة الدينية',
      excerpt: 'يتعاون المجتمع الإسلامي الرواندي مع ADEF للنهوض بالمعرفة الدينية على المستوى الوطني.',
      summary:
        'تنضمّ مؤسسة إفريقيا للتنمية والتعليم (ADEF) إلى RMC لتعزيز المعرفة الدينية والنهوض التعليمي على المستوى الوطني.',
      category: 'التعليم والتعلّم',
      author: 'إدارة الاتصال في RMC',
      content: [
        'دخل المجتمع الإسلامي الرواندي في شراكة جديدة مع مؤسسة إفريقيا للتنمية والتعليم (ADEF) للنهوض بالمعرفة الدينية والتعليم في جميع أنحاء البلاد.',
        'سيدعم التعاون تدريب المعلمين والمواد التعليمية والمنح الدراسية، انطلاقاً من رؤية RMC للنهوض التعليمي.',
        'وتهدف المنظمتان معاً إلى تعزيز التعليم الديني والعلماني للجيل القادم.',
      ],
    },
    'youth-leadership-camp-2026': {
      title: 'مخيم القيادة السنوي للشباب يعود هذا الصيف',
      excerpt: 'يجتمع الشباب المسلم هذا الصيف للتدريب القيادي والندوات.',
      summary:
        'يجتمع الشباب المسلم من جميع أنحاء البلاد للتدريب القيادي والندوات وأنشطة بناء المجتمع.',
      category: 'برامج الشباب',
      author: 'إدارة الاتصال في RMC',
      content: [
        'يعود مخيم القيادة السنوي للشباب هذا الصيف، جامعاً الشباب المسلم من جميع أنحاء رواندا للتدريب والندوات وأنشطة بناء المجتمع.',
        'سيطوّر المشاركون مهارات القيادة، ويعمّقون إيمانهم، ويكوّنون علاقات دائمة مع أقرانهم من كل مقاطعة.',
        'يأتي المخيم ضمن التزام RMC المستمر بتمكين الجيل القادم من الأمة.',
      ],
    },
    'zakat-distribution-5000-families': {
      title: 'توزيع الزكاة يصل إلى 5,000 أسرة على المستوى الوطني',
      excerpt: 'حملة الزكاة هذا العام دعمت 5,000 أسرة في جميع أنحاء البلاد.',
      summary:
        'وفّر الجمع والتوزيع الشفاف للزكاة والصدقات دعماً أساسياً لآلاف الأسر المحتاجة هذا العام.',
      category: 'الخدمات المجتمعية',
      author: 'إدارة الاتصال في RMC',
      content: [
        'وصلت حملة الزكاة والصدقات هذا العام إلى 5,000 أسرة على المستوى الوطني، مقدّمةً دعماً أساسياً للفئات الضعيفة في المجتمع.',
        'حافظ RMC على عملية شفافة لجمع الأموال وتوزيعها، ضماناً لوصول التبرعات إلى من هم في أمسّ الحاجة إليها.',
        'يبرز هذا الجهد تفاني المجتمع في الرعاية الاجتماعية والتكافل.',
      ],
    },
  },

  rw: {
    'free-translated-quran-initiative': {
      title: 'RMC Yatangije Gahunda ya Qur’an Yahinduwe Itangwa ku Buntu',
      excerpt: 'Kopi za Qur’an yahinduwe zitangwa ku buntu zigeze ku baturage mu Rwanda hose.',
      summary:
        'Gahunda nshya y’abaturage ituma Qur’an Ntagatifu yahinduwe iboneka ku buntu ku baturage, yagura uburyo bwo kubona ibikoresho by’idini mu Rwanda hose.',
      category: 'Gufasha Abaturage',
      author: 'Itsinda ry’Itumanaho rya RMC',
      content: [
        'Umuryango w’Abasilamu bo mu Rwanda watangije gahunda y’igihugu yo gutuma Qur’an Ntagatifu yahinduwe iboneka ku buntu ku baturage, ivanaho ikibazo cy’ikiguzi mu kwiga idini.',
        'Kopi zizatangwa binyuze mu misigiti n’ibigo by’abaturage muri buri ntara, hashyirwa imbere amashuri, abasilamu bashya, n’imiryango ikennye.',
        'Iyi gahunda igaragaza intego ya RMC yo gufasha abaturage — gutanga ibikoresho by’idini ku mugaragaro no kwemeza ko ubuyobozi bwa Qur’an bugera kuri buri wese ubushaka.',
      ],
    },
    'ramadan-2026-community-iftars': {
      title: 'Ramadhan 2026: Ifuturu Rusange mu Ntara Zose',
      excerpt: 'Ibihumbi basangiye ifuturu n’amasengesho muri buri ntara muri uyu Ramadhan.',
      summary:
        'Ibihumbi by’abantu bahuriye hamwe ku ifuturu rusange, amasengesho ya Taraweeh, no gutanga ibiribwa mu kwezi kwera muri buri ntara y’u Rwanda.',
      category: 'Imihango y’Idini',
      author: 'Itsinda ry’Itumanaho rya RMC',
      content: [
        'Ramadhan 2026 yahuje abaturage mu ntara zose eshanu z’u Rwanda binyuze mu ifuturu rusange, amasengesho ya Taraweeh ya buri joro, no gutanga ibiribwa ku bakeneye.',
        'Imisigiti yo mu turere yahuje abakorerabushake n’impano, yemeza ko nta muryango wabuze ifunguro mu kwezi kwera.',
        'Iki gihe cyongeye gushimangira umwuka w’ubumwe n’ubuntu uri ku isonga ry’ubuzima bw’idini bw’abaturage.',
      ],
    },
    'adef-partnership-religious-literacy': {
      title: 'Ubufatanye Bushya na ADEF bwo Guteza Imbere Ubumenyi bw’Idini',
      excerpt: 'RMC ifatanya na ADEF mu guteza imbere ubumenyi bw’idini mu gihugu hose.',
      summary:
        'Africa Development and Education Foundation (ADEF) yifatanije na RMC mu guteza imbere ubumenyi bw’idini n’iterambere ry’uburezi mu gihugu hose.',
      category: 'Uburezi no Kwiga',
      author: 'Itsinda ry’Itumanaho rya RMC',
      content: [
        'RMC yinjiye mu bufatanye bushya na Africa Development and Education Foundation (ADEF) mu guteza imbere ubumenyi bw’idini n’uburezi mu gihugu hose.',
        'Ubu bufatanye buzashyigikira guhugura abarimu, ibikoresho byo kwiga, na buruse, bushingiye ku cyerekezo cya RMC cy’iterambere ry’uburezi.',
        'Hamwe, iyi miryango igamije gukomeza uburezi bw’idini n’ubw’isi ku gisekuru gizaza.',
      ],
    },
    'youth-leadership-camp-2026': {
      title: 'Inkambi y’Ubuyobozi y’Urubyiruko ya Buri Mwaka Iragaruka iyi Mpeshyi',
      excerpt: 'Urubyiruko rw’Abasilamu ruteranira hamwe iyi mpeshyi ku mahugurwa y’ubuyobozi n’inama.',
      summary:
        'Urubyiruko rw’Abasilamu ruturutse mu gihugu hose ruteranira hamwe ku mahugurwa y’ubuyobozi, inama, n’ibikorwa byo kubaka abaturage.',
      category: 'Porogaramu z’Urubyiruko',
      author: 'Itsinda ry’Itumanaho rya RMC',
      content: [
        'Inkambi y’ubuyobozi y’urubyiruko ya buri mwaka iragaruka iyi mpeshyi, iteranya urubyiruko rw’Abasilamu ruturutse mu Rwanda hose ku mahugurwa, inama, n’ibikorwa byo kubaka abaturage.',
        'Abitabira bazatera imbere ubushobozi bw’ubuyobozi, bakomeze ukwemera kwabo, kandi bagire imishyikirano irambye n’abandi bo muri buri ntara.',
        'Iyi nkambi ni igice cy’umuhati uhoraho wa RMC wo guteza imbere igisekuru gizaza cya Ummah.',
      ],
    },
    'zakat-distribution-5000-families': {
      title: 'Itangwa rya Zakat Rigeze ku Miryango 5,000 mu Gihugu Hose',
      excerpt: 'Gahunda ya Zakat y’uyu mwaka yafashije imiryango 5,000 mu gihugu hose.',
      summary:
        'Gukusanya no gutanga Zakat na Sadaqah ku buryo bunoze byatanze ubufasha bw’ingenzi ku miryango ibihumbi ikennye uyu mwaka.',
      category: 'Serivisi z’Abaturage',
      author: 'Itsinda ry’Itumanaho rya RMC',
      content: [
        'Gahunda ya Zakat na Sadaqah y’uyu mwaka yageze ku miryango 5,000 mu gihugu hose, itanga ubufasha bw’ingenzi ku baturage bafite intege nke.',
        'RMC yakomeje uburyo bunoze bwo gukusanya no gutanga amafaranga, yemeza ko impano zigera ku babikeneye cyane.',
        'Uyu muhati ugaragaza ukwitanga kw’abaturage mu kwita ku mibereho myiza no gufashanya.',
      ],
    },
  },
};

/** All known slugs (shared across locales). */
export const SLUGS = META.map((m) => m.slug);

/** Localized posts for a given locale (falls back to English text). */
export function getPosts(locale: string): BlogPost[] {
  const text = TEXT[locale] ?? TEXT.en;
  return META.map((m) => ({ ...m, ...(text[m.slug] ?? TEXT.en[m.slug]) }));
}

/** A single localized post by slug. */
export function getPost(locale: string, slug: string): BlogPost | undefined {
  return getPosts(locale).find((p) => p.slug === slug);
}

/** Estimated reading time in minutes (min 1), ~200 words/min over title + body. */
export function readingMinutes(post: BlogPost): number {
  const words = [post.title, ...(post.content ?? [post.summary])]
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
