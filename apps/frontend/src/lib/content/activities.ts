import { Tri, tri } from './client';

export type BadgeTone = 'green' | 'gold' | 'neutral';

/** A past activity (with photo gallery + impact figures). */
export interface ActivityItem {
  category: Tri;
  tone: BadgeTone;
  title: Tri;
  excerpt: Tri;
  /** Human-readable date, e.g. "June 4, 2026". */
  date: string;
  image: string;
  gallery: string[];
  peopleHelped: number;
  budgetUsed: number;
}

/** An upcoming event (with fundraising progress). */
export interface EventItem {
  title: Tri;
  /** ISO date "YYYY-MM-DD". */
  date: string;
  time: string;
  location: string;
  type: Tri;
  tone: BadgeTone;
  goalAmount: number;
  raisedAmount: number;
}

export interface ActivitiesContent {
  eyebrow: Tri;
  title: Tri;
  lede: Tri;
  activitiesHeading: Tri;
  eventsHeading: Tri;
  activities: ActivityItem[];
  events: EventItem[];
}

/* Full-resolution Unsplash URLs for the gallery viewer — mirrors the
   `hi()` helper + IMG_* ids in components/activities/data.ts verbatim. */
const hi = (id: string) => `https://images.unsplash.com/${id}?q=80&w=1280&auto=format&fit=crop`;
const IMG_EDU = 'photo-1541339907198-e08756dedf3f';
const IMG_AID = 'photo-1532629345422-7515f3d16bb6';
const IMG_CONF = 'photo-1521791136064-7986c2920216';

/**
 * Seeded VERBATIM from the live landing data (components/activities/data.ts) —
 * English canonical (rw/ar left empty until translated). Numbers, dates, and
 * URLs are kept exact so the store can fully replace the static arrays.
 */
export const ACTIVITIES_DEFAULT: ActivitiesContent = {
  eyebrow: tri('Activities & Events', 'Ibikorwa n’Ibirori', 'الأنشطة والفعاليات'),
  title: tri('Latest & Upcoming', 'Ibiheruka n’Ibizaza', 'الأحدث والقادم'),
  lede: tri(
    "Follow RMC's most recent activities and mark your calendar for the community events ahead.",
    "Kurikira ibikorwa biheruka bya RMC kandi wandike mu kalendari yawe ibirori by'umuryango bizaza.",
    'تابع أحدث أنشطة المجتمع الإسلامي الرواندي وسجّل في مفكرتك الفعاليات المجتمعية القادمة.',
  ),
  activitiesHeading: tri('Latest Activities', 'Ibikorwa Biheruka', 'أحدث الأنشطة'),
  eventsHeading: tri('Upcoming Events', 'Ibirori Bizaza', 'الفعاليات القادمة'),
  activities: [
    {
      category: tri('Education', 'Uburezi', 'التعليم'),
      tone: 'green',
      title: tri(
        'RMC Launches Digital Madrassa Across All Provinces',
        'RMC Yatangije Madarasa ya Digitale mu Ntara Zose',
        'المجتمع الإسلامي الرواندي يطلق المدرسة الرقمية في جميع المقاطعات',
      ),
      excerpt: tri(
        'A new online platform for Islamic education is now live nationwide, bringing structured Qur’an and Arabic lessons to over 2,000 children in its first month.',
        "Urubuga rushya rwo kuri interineti rw'uburezi bwa Kisilamu rumaze gukora mu gihugu hose, ruzana amasomo y'Ikorani n'Icyarabu ateguwe neza ku bana barenga 2,000 mu kwezi kwarwo kwa mbere.",
        'منصة إلكترونية جديدة للتعليم الإسلامي أصبحت متاحة الآن على مستوى البلاد، تقدّم دروسًا منظّمة في القرآن الكريم واللغة العربية لأكثر من 2,000 طفل في شهرها الأول.',
      ),
      date: 'June 4, 2026',
      image:
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=200&auto=format&fit=crop',
      gallery: [hi(IMG_EDU), hi(IMG_CONF), hi(IMG_AID)],
      peopleHelped: 2000,
      budgetUsed: 18_000_000,
    },
    {
      category: tri('Community', 'Umuryango', 'المجتمع'),
      tone: 'gold',
      title: tri(
        'Ramadan Food Distribution Reaches 5,000 Families',
        "Igaburwa ry'Ibiribwa bya Ramadhani Rigeze ku Miryango 5,000",
        'توزيع طعام رمضان يصل إلى 5,000 أسرة',
      ),
      excerpt: tri(
        'In partnership with local NGOs, RMC delivered food packages to 5,000 vulnerable families across Rwanda throughout the blessed month of Ramadan.',
        "Ku bufatanye n'imiryango itari iya Leta yo mu gihugu, RMC yatanze udufuka tw'ibiribwa ku miryango 5,000 ifite ubukene mu Rwanda hose mu gihe cy'ukwezi gutagatifu kwa Ramadhani.",
        'بالشراكة مع المنظمات غير الحكومية المحلية، قدّم المجتمع الإسلامي الرواندي طرودًا غذائية إلى 5,000 أسرة محتاجة في جميع أنحاء رواندا طوال شهر رمضان المبارك.',
      ),
      date: 'May 12, 2026',
      image:
        'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=200&auto=format&fit=crop',
      gallery: [hi(IMG_AID), hi(IMG_EDU), hi(IMG_CONF)],
      peopleHelped: 5000,
      budgetUsed: 45_000_000,
    },
    {
      category: tri('Leadership', 'Ubuyobozi', 'القيادة'),
      tone: 'neutral',
      title: tri(
        'Annual Imam Training Conference Held in Musanze',
        "Inama Ngarukamwaka yo Guhugura Abayimamu Yabereye i Musanze",
        'انعقاد المؤتمر السنوي لتدريب الأئمة في موسانزي',
      ),
      excerpt: tri(
        '120 imams from across Rwanda gathered for a three-day programme on community leadership, digital outreach, and pastoral care.',
        "Abayimamu 120 baturutse mu Rwanda hose bateranye mu gahunda y'iminsi itatu yerekeye ubuyobozi bw'umuryango, kugera ku bantu hifashishijwe ikoranabuhanga, no kwita ku bantu.",
        'اجتمع 120 إمامًا من جميع أنحاء رواندا في برنامج استمر ثلاثة أيام حول القيادة المجتمعية والتواصل الرقمي والرعاية الروحية.',
      ),
      date: 'April 18, 2026',
      image:
        'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=200&auto=format&fit=crop',
      gallery: [hi(IMG_CONF), hi(IMG_AID), hi(IMG_EDU)],
      peopleHelped: 120,
      budgetUsed: 8_500_000,
    },
  ],
  events: [
    {
      title: tri(
        'Eid al-Adha National Celebration',
        "Umunsi Mukuru wa Idi al-Adha ku Rwego rw'Igihugu",
        'الاحتفال الوطني بعيد الأضحى',
      ),
      date: '2026-06-20',
      time: '08:00 AM',
      location: 'Amahoro National Stadium, Kigali',
      type: tri('Religious', 'Iyobokamana', 'ديني'),
      tone: 'green',
      goalAmount: 30_000_000,
      raisedAmount: 22_000_000,
    },
    {
      title: tri(
        'RMC Annual Scholarship Awards Ceremony',
        "Umuhango Ngarukamwaka wa RMC wo Gutanga Buruse z'Amashuri",
        'حفل توزيع المنح الدراسية السنوي للمجتمع الإسلامي الرواندي',
      ),
      date: '2026-07-11',
      time: '10:00 AM',
      location: 'Kigali Convention Centre',
      type: tri('Education', 'Uburezi', 'التعليم'),
      tone: 'green',
      goalAmount: 50_000_000,
      raisedAmount: 38_000_000,
    },
    {
      title: tri(
        'Muslim Women Leadership Summit',
        "Inama Nkuru y'Ubuyobozi bw'Abagore b'Abayisilamu",
        'قمة القيادة للنساء المسلمات',
      ),
      date: '2026-08-08',
      time: '09:00 AM',
      location: 'Serena Hotel, Kigali',
      type: tri('Community', 'Umuryango', 'المجتمع'),
      tone: 'gold',
      goalAmount: 15_000_000,
      raisedAmount: 9_000_000,
    },
    {
      title: tri(
        'Qur’an Recitation Competition — National Finals',
        "Irushanwa ryo Gusoma Ikorani — Inzira za Nyuma ku Rwego rw'Igihugu",
        'مسابقة تلاوة القرآن الكريم — التصفيات النهائية الوطنية',
      ),
      date: '2026-09-26',
      time: '02:00 PM',
      location: 'Grand Mosque of Kigali',
      type: tri('Da’wah', 'Idawa', 'الدعوة'),
      tone: 'gold',
      goalAmount: 12_000_000,
      raisedAmount: 7_500_000,
    },
    {
      title: tri(
        'RMC General Assembly Meeting',
        "Inama Rusange ya RMC",
        'اجتماع الجمعية العمومية للمجتمع الإسلامي الرواندي',
      ),
      date: '2026-11-14',
      time: '09:00 AM',
      location: 'RMC Headquarters, Rebero',
      type: tri('Governance', 'Imiyoborere', 'الحوكمة'),
      tone: 'neutral',
      goalAmount: 8_000_000,
      raisedAmount: 8_000_000,
    },
  ],
};
