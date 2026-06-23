import { fileUrl } from '../api';
import { Tri, tri, pick } from './client';

/**
 * Blog / Posts content store.
 *
 * The public `/blog` list and `/blog/[slug]` detail pages render from posts
 * managed in Admin → Content → Blog & Posts. Each post's text lives in all
 * three languages (`Tri`); structural fields (slug, image, date) are shared.
 *
 * `image` holds EITHER a full external URL / site-relative path (e.g. the
 * seeded Drive/Twitter photos) OR a file-server object key produced by the
 * admin uploader — `resolveBlogImage()` turns both into a usable `<Image>` src.
 *
 * `body` is the article text: paragraphs separated by a blank line. The detail
 * page splits it back into paragraphs on render.
 */

export type BlogStatus = 'draft' | 'published';

export interface BlogPostItem {
  /** URL slug — not translated, unique across posts. */
  slug: string;
  /** File-server key, full URL, or site-relative path. */
  image: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Only `published` posts appear on the public site. */
  status: BlogStatus;
  title: Tri;
  excerpt: Tri;
  summary: Tri;
  category: Tri;
  author: Tri;
  /** Article body — paragraphs separated by blank lines. */
  body: Tri;
}

export interface BlogContent {
  posts: BlogPostItem[];
}

/** Build a body `Tri` from per-language paragraph arrays. */
function body(en: string[], rw: string[], ar: string[]): Tri {
  return { en: en.join('\n\n'), rw: rw.join('\n\n'), ar: ar.join('\n\n') };
}

/**
 * Seeded from the original hardcoded blog data — English canonical, with
 * best-effort Kinyarwanda / Arabic translations. Admins edit these in the CMS.
 */
export const BLOG_DEFAULT: BlogContent = {
  posts: [
    {
      slug: 'free-translated-quran-initiative',
      image: 'https://drive.google.com/thumbnail?id=1y0QOLz--4XxIthJh7sViyl7KU7XFbd2t&sz=w1600',
      date: '2026-06-05',
      status: 'published',
      title: tri(
        'RMC Launches Free Translated Qur’an Initiative',
        'RMC Yatangije Gahunda ya Qur’an Yahinduwe Itangwa ku Buntu',
        'المجتمع الإسلامي الرواندي يطلق مبادرة القرآن المترجم المجاني',
      ),
      excerpt: tri(
        'Free translated Qur’an copies now reach communities across Rwanda.',
        'Kopi za Qur’an yahinduwe zitangwa ku buntu zigeze ku baturage mu Rwanda hose.',
        'نسخ مجانية من القرآن المترجم تصل الآن إلى المجتمعات في جميع أنحاء رواندا.',
      ),
      summary: tri(
        'A new community programme makes the translated Holy Qur’an available free of charge to the public, expanding access to religious resources across Rwanda.',
        'Gahunda nshya y’abaturage ituma Qur’an Ntagatifu yahinduwe iboneka ku buntu ku baturage, yagura uburyo bwo kubona ibikoresho by’idini mu Rwanda hose.',
        'برنامج مجتمعي جديد يتيح القرآن الكريم المترجم مجاناً للجمهور، موسّعاً الوصول إلى الموارد الدينية في جميع أنحاء رواندا.',
      ),
      category: tri('Community Support', 'Gufasha Abaturage', 'الدعم المجتمعي'),
      author: tri('RMC Communications', 'Itsinda ry’Itumanaho rya RMC', 'إدارة الاتصال في RMC'),
      body: body(
        [
          'The Rwanda Muslim Community has launched a nationwide initiative to make the translated Holy Qur’an available free of charge to the public, removing cost as a barrier to religious learning.',
          'Copies will be distributed through mosques and community centres in every province, with priority given to schools, new Muslims, and families in need.',
          'The programme reflects RMC’s wider mission of community support — offering religious resources openly and ensuring that guidance from the Qur’an reaches everyone who seeks it.',
        ],
        [
          'Umuryango w’Abasilamu bo mu Rwanda watangije gahunda y’igihugu yo gutuma Qur’an Ntagatifu yahinduwe iboneka ku buntu ku baturage, ivanaho ikibazo cy’ikiguzi mu kwiga idini.',
          'Kopi zizatangwa binyuze mu misigiti n’ibigo by’abaturage muri buri ntara, hashyirwa imbere amashuri, abasilamu bashya, n’imiryango ikennye.',
          'Iyi gahunda igaragaza intego ya RMC yo gufasha abaturage — gutanga ibikoresho by’idini ku mugaragaro no kwemeza ko ubuyobozi bwa Qur’an bugera kuri buri wese ubushaka.',
        ],
        [
          'أطلق المجتمع الإسلامي الرواندي مبادرة وطنية لإتاحة القرآن الكريم المترجم مجاناً للجمهور، رافعاً عائق التكلفة أمام التعلّم الديني.',
          'ستُوزَّع النسخ عبر المساجد والمراكز المجتمعية في كل مقاطعة، مع إعطاء الأولوية للمدارس والمسلمين الجدد والأسر المحتاجة.',
          'تعكس المبادرة رسالة RMC الأوسع في الدعم المجتمعي — تقديم الموارد الدينية بشكل مفتوح وضمان وصول هداية القرآن إلى كل من يطلبها.',
        ],
      ),
    },
    {
      slug: 'ramadan-2026-community-iftars',
      image: 'https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large',
      date: '2026-05-20',
      status: 'published',
      title: tri(
        'Ramadan 2026: Community Iftars Across All Provinces',
        'Ramadhan 2026: Ifuturu Rusange mu Ntara Zose',
        'رمضان 2026: موائد إفطار جماعية في جميع المقاطعات',
      ),
      excerpt: tri(
        'Thousands shared iftars and prayers across every province this Ramadan.',
        'Ibihumbi basangiye ifuturu n’amasengesho muri buri ntara muri uyu Ramadhan.',
        'آلاف تشاركوا الإفطار والصلاة في كل مقاطعة هذا الرمضان.',
      ),
      summary: tri(
        'Thousands gathered for shared iftars, Taraweeh prayers, and food distribution throughout the holy month in every province of Rwanda.',
        'Ibihumbi by’abantu bahuriye hamwe ku ifuturu rusange, amasengesho ya Taraweeh, no gutanga ibiribwa mu kwezi kwera muri buri ntara y’u Rwanda.',
        'تجمّع الآلاف لموائد الإفطار الجماعية وصلاة التراويح وتوزيع الطعام طوال الشهر الفضيل في كل مقاطعة من رواندا.',
      ),
      category: tri('Religious Events', 'Imihango y’Idini', 'المناسبات الدينية'),
      author: tri('RMC Communications', 'Itsinda ry’Itumanaho rya RMC', 'إدارة الاتصال في RMC'),
      body: body(
        [
          'Ramadan 2026 brought communities together across all five provinces of Rwanda for shared iftars, nightly Taraweeh prayers, and the distribution of food to those in need.',
          'Local mosques coordinated volunteers and donations, ensuring that no family went without a meal during the holy month.',
          'The season reaffirmed the spirit of unity and generosity at the heart of the community’s religious life.',
        ],
        [
          'Ramadhan 2026 yahuje abaturage mu ntara zose eshanu z’u Rwanda binyuze mu ifuturu rusange, amasengesho ya Taraweeh ya buri joro, no gutanga ibiribwa ku bakeneye.',
          'Imisigiti yo mu turere yahuje abakorerabushake n’impano, yemeza ko nta muryango wabuze ifunguro mu kwezi kwera.',
          'Iki gihe cyongeye gushimangira umwuka w’ubumwe n’ubuntu uri ku isonga ry’ubuzima bw’idini bw’abaturage.',
        ],
        [
          'جمع رمضان 2026 المجتمعات معاً في المقاطعات الخمس جميعها بموائد إفطار جماعية، وصلاة تراويح ليلية، وتوزيع الطعام على المحتاجين.',
          'نسّقت المساجد المحلية المتطوعين والتبرعات، مؤكدةً ألا تبقى أي أسرة بلا طعام خلال الشهر الفضيل.',
          'وأكّد الموسم من جديد روح الوحدة والكرم في صميم الحياة الدينية للمجتمع.',
        ],
      ),
    },
    {
      slug: 'adef-partnership-religious-literacy',
      image: 'https://drive.google.com/thumbnail?id=1-V1PRFYujv6JHscMzlBlLLayQA9REX7T&sz=w1600',
      date: '2026-05-02',
      status: 'published',
      title: tri(
        'New Partnership with ADEF to Boost Religious Literacy',
        'Ubufatanye Bushya na ADEF bwo Guteza Imbere Ubumenyi bw’Idini',
        'شراكة جديدة مع مؤسسة ADEF لتعزيز المعرفة الدينية',
      ),
      excerpt: tri(
        'RMC partners with ADEF to advance religious literacy nationwide.',
        'RMC ifatanya na ADEF mu guteza imbere ubumenyi bw’idini mu gihugu hose.',
        'يتعاون المجتمع الإسلامي الرواندي مع ADEF للنهوض بالمعرفة الدينية على المستوى الوطني.',
      ),
      summary: tri(
        'The Africa Development and Education Foundation joins RMC to strengthen religious literacy and educational advancement nationwide.',
        'Africa Development and Education Foundation (ADEF) yifatanije na RMC mu guteza imbere ubumenyi bw’idini n’iterambere ry’uburezi mu gihugu hose.',
        'تنضمّ مؤسسة إفريقيا للتنمية والتعليم (ADEF) إلى RMC لتعزيز المعرفة الدينية والنهوض التعليمي على المستوى الوطني.',
      ),
      category: tri('Education & Learning', 'Uburezi no Kwiga', 'التعليم والتعلّم'),
      author: tri('RMC Communications', 'Itsinda ry’Itumanaho rya RMC', 'إدارة الاتصال في RMC'),
      body: body(
        [
          'RMC has entered a new partnership with the Africa Development and Education Foundation (ADEF) to advance religious literacy and education across the country.',
          'The collaboration will support teacher training, learning materials, and scholarships, building on RMC’s vision of educational advancement.',
          'Together, the organisations aim to strengthen both religious and secular learning for the next generation.',
        ],
        [
          'RMC yinjiye mu bufatanye bushya na Africa Development and Education Foundation (ADEF) mu guteza imbere ubumenyi bw’idini n’uburezi mu gihugu hose.',
          'Ubu bufatanye buzashyigikira guhugura abarimu, ibikoresho byo kwiga, na buruse, bushingiye ku cyerekezo cya RMC cy’iterambere ry’uburezi.',
          'Hamwe, iyi miryango igamije gukomeza uburezi bw’idini n’ubw’isi ku gisekuru gizaza.',
        ],
        [
          'دخل المجتمع الإسلامي الرواندي في شراكة جديدة مع مؤسسة إفريقيا للتنمية والتعليم (ADEF) للنهوض بالمعرفة الدينية والتعليم في جميع أنحاء البلاد.',
          'سيدعم التعاون تدريب المعلمين والمواد التعليمية والمنح الدراسية، انطلاقاً من رؤية RMC للنهوض التعليمي.',
          'وتهدف المنظمتان معاً إلى تعزيز التعليم الديني والعلماني للجيل القادم.',
        ],
      ),
    },
    {
      slug: 'youth-leadership-camp-2026',
      image: 'https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large',
      date: '2026-04-18',
      status: 'published',
      title: tri(
        'Annual Youth Leadership Camp Returns This Summer',
        'Inkambi y’Ubuyobozi y’Urubyiruko ya Buri Mwaka Iragaruka iyi Mpeshyi',
        'مخيم القيادة السنوي للشباب يعود هذا الصيف',
      ),
      excerpt: tri(
        'Young Muslims gather this summer for leadership training and seminars.',
        'Urubyiruko rw’Abasilamu ruteranira hamwe iyi mpeshyi ku mahugurwa y’ubuyobozi n’inama.',
        'يجتمع الشباب المسلم هذا الصيف للتدريب القيادي والندوات.',
      ),
      summary: tri(
        'Young Muslims from across the country come together for leadership training, seminars, and community-building activities.',
        'Urubyiruko rw’Abasilamu ruturutse mu gihugu hose ruteranira hamwe ku mahugurwa y’ubuyobozi, inama, n’ibikorwa byo kubaka abaturage.',
        'يجتمع الشباب المسلم من جميع أنحاء البلاد للتدريب القيادي والندوات وأنشطة بناء المجتمع.',
      ),
      category: tri('Youth Programs', 'Porogaramu z’Urubyiruko', 'برامج الشباب'),
      author: tri('RMC Communications', 'Itsinda ry’Itumanaho rya RMC', 'إدارة الاتصال في RMC'),
      body: body(
        [
          'The annual Youth Leadership Camp returns this summer, gathering young Muslims from across Rwanda for training, seminars, and community-building activities.',
          'Participants will develop leadership skills, deepen their faith, and form lasting connections with peers from every province.',
          'The camp is part of RMC’s ongoing commitment to empowering the next generation of the ummah.',
        ],
        [
          'Inkambi y’ubuyobozi y’urubyiruko ya buri mwaka iragaruka iyi mpeshyi, iteranya urubyiruko rw’Abasilamu ruturutse mu Rwanda hose ku mahugurwa, inama, n’ibikorwa byo kubaka abaturage.',
          'Abitabira bazatera imbere ubushobozi bw’ubuyobozi, bakomeze ukwemera kwabo, kandi bagire imishyikirano irambye n’abandi bo muri buri ntara.',
          'Iyi nkambi ni igice cy’umuhati uhoraho wa RMC wo guteza imbere igisekuru gizaza cya Ummah.',
        ],
        [
          'يعود مخيم القيادة السنوي للشباب هذا الصيف، جامعاً الشباب المسلم من جميع أنحاء رواندا للتدريب والندوات وأنشطة بناء المجتمع.',
          'سيطوّر المشاركون مهارات القيادة، ويعمّقون إيمانهم، ويكوّنون علاقات دائمة مع أقرانهم من كل مقاطعة.',
          'يأتي المخيم ضمن التزام RMC المستمر بتمكين الجيل القادم من الأمة.',
        ],
      ),
    },
    {
      slug: 'zakat-distribution-5000-families',
      image: 'https://lh3.googleusercontent.com/d/1JAOmqaWrQjILrZjGXVt9jP5EpjmR5PNr=w1600?authuser=0',
      date: '2026-04-01',
      status: 'published',
      title: tri(
        'Zakat Distribution Reaches 5,000 Families Nationwide',
        'Itangwa rya Zakat Rigeze ku Miryango 5,000 mu Gihugu Hose',
        'توزيع الزكاة يصل إلى 5,000 أسرة على المستوى الوطني',
      ),
      excerpt: tri(
        'This year’s Zakat drive supported 5,000 families across the country.',
        'Gahunda ya Zakat y’uyu mwaka yafashije imiryango 5,000 mu gihugu hose.',
        'حملة الزكاة هذا العام دعمت 5,000 أسرة في جميع أنحاء البلاد.',
      ),
      summary: tri(
        'Transparent collection and distribution of Zakat and Sadaqah delivered essential support to thousands of families in need this year.',
        'Gukusanya no gutanga Zakat na Sadaqah ku buryo bunoze byatanze ubufasha bw’ingenzi ku miryango ibihumbi ikennye uyu mwaka.',
        'وفّر الجمع والتوزيع الشفاف للزكاة والصدقات دعماً أساسياً لآلاف الأسر المحتاجة هذا العام.',
      ),
      category: tri('Community Services', 'Serivisi z’Abaturage', 'الخدمات المجتمعية'),
      author: tri('RMC Communications', 'Itsinda ry’Itumanaho rya RMC', 'إدارة الاتصال في RMC'),
      body: body(
        [
          'This year’s Zakat and Sadaqah drive reached 5,000 families nationwide, delivering essential support to vulnerable members of the community.',
          'RMC maintained a transparent process for collecting and distributing funds, ensuring contributions reached those who needed them most.',
          'The effort underscores the community’s dedication to social welfare and mutual care.',
        ],
        [
          'Gahunda ya Zakat na Sadaqah y’uyu mwaka yageze ku miryango 5,000 mu gihugu hose, itanga ubufasha bw’ingenzi ku baturage bafite intege nke.',
          'RMC yakomeje uburyo bunoze bwo gukusanya no gutanga amafaranga, yemeza ko impano zigera ku babikeneye cyane.',
          'Uyu muhati ugaragaza ukwitanga kw’abaturage mu kwita ku mibereho myiza no gufashanya.',
        ],
        [
          'وصلت حملة الزكاة والصدقات هذا العام إلى 5,000 أسرة على المستوى الوطني، مقدّمةً دعماً أساسياً للفئات الضعيفة في المجتمع.',
          'حافظ RMC على عملية شفافة لجمع الأموال وتوزيعها، ضماناً لوصول التبرعات إلى من هم في أمسّ الحاجة إليها.',
          'يبرز هذا الجهد تفاني المجتمع في الرعاية الاجتماعية والتكافل.',
        ],
      ),
    },
  ],
};

/**
 * Canonical blog categories. Admins pick one from this list (rather than typing
 * free text) so category values stay consistent across posts and languages —
 * which keeps the public category tabs clean. Add or rename categories here.
 */
export const BLOG_CATEGORIES: Tri[] = [
  tri('Community Support', 'Gufasha Abaturage', 'الدعم المجتمعي'),
  tri('Religious Events', 'Imihango y’Idini', 'المناسبات الدينية'),
  tri('Education & Learning', 'Uburezi no Kwiga', 'التعليم والتعلّم'),
  tri('Youth Programs', 'Porogaramu z’Urubyiruko', 'برامج الشباب'),
  tri('Community Services', 'Serivisi z’Abaturage', 'الخدمات المجتمعية'),
];

/** Find a canonical category by its English name (the stable identity). */
export function findBlogCategory(en: string): Tri | undefined {
  return BLOG_CATEGORIES.find((c) => c.en === en);
}

/** An empty post for the admin "create" form. */
export const EMPTY_BLOG_POST: BlogPostItem = {
  slug: '',
  image: '',
  date: '',
  status: 'draft',
  title: tri(''),
  excerpt: tri(''),
  summary: tri(''),
  category: tri(''),
  author: tri('RMC Communications'),
  body: tri(''),
};

/**
 * Turn the stored `image` value into a usable `<Image>` src. Full URLs and
 * site-relative paths pass through; bare file-server keys are expanded.
 */
export function resolveBlogImage(image: string): string {
  if (!image) return '';
  if (/^https?:\/\//.test(image) || image.startsWith('/')) return image;
  return fileUrl(image);
}

/** Split a stored body `Tri` into trimmed, non-empty paragraphs for a locale. */
export function blogParagraphs(item: BlogPostItem, locale: string): string[] {
  return pick(item.body, locale)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Render a stored body `Tri` to HTML for a locale. Bodies authored with the
 * rich-text editor are already HTML and pass through untouched; legacy/seeded
 * plain-text bodies are converted to blank-line-separated paragraphs.
 */
export function blogBodyHtml(item: BlogPostItem, locale: string): string {
  const raw = pick(item.body, locale).trim();
  if (!raw) return '';
  // Rich-text editor output already contains HTML tags — render as-is.
  if (/<\/?[a-z][\s\S]*>/i.test(raw)) return raw;
  // Legacy plain text — wrap each paragraph, preserving single line breaks.
  return blogParagraphs(item, locale)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

/** Make a URL-safe slug from a title. */
export function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
