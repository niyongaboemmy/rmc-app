import axios from 'axios';
import { Tri, tri } from './client';

export type SocialPlatform = 'facebook' | 'twitter' | 'instagram' | 'youtube';

/** One social post in the feed. */
export interface SocialPost {
  platform: SocialPlatform;
  handle: string;
  content: Tri;
  likes: string;
  comments: string;
  date: string;
  image?: string;
  /** Permalink to the original post (live posts only). */
  url?: string;
  /** ISO timestamp for live posts — drives an accurate "x ago" label. */
  publishedAt?: string;
}

/** One "follow us" channel button. */
export interface SocialChannel {
  /** Channel id, mapped to an icon/colors on the landing side. */
  key: 'facebook' | 'twitter' | 'instagram' | 'youtube';
  label: string;
  followers: string;
  href: string;
}

export interface SocialContent {
  eyebrow: Tri;
  title: Tri;
  subtitle: Tri;
  channels: SocialChannel[];
  posts: SocialPost[];
}

/** Seeded from the live landing (SocialMediaSection) — English canonical. */
export const SOCIAL_DEFAULT: SocialContent = {
  eyebrow: tri('Social Media', "Imbuga nkoranyambaga", 'وسائل التواصل الاجتماعي'),
  title: tri('Latest on Social Media', "Ibyacu bishya ku mbuga nkoranyambaga", 'أحدث ما لدينا على وسائل التواصل الاجتماعي'),
  subtitle: tri(
    'Follow RMC on social media to stay updated with the latest news, events, and community stories.',
    "Kurikira RMC ku mbuga nkoranyambaga kugira ngo uhore umenya amakuru mashya, ibikorwa, n'inkuru z'umuryango.",
    'تابع المجتمع الإسلامي الرواندي على وسائل التواصل الاجتماعي لتبقى على اطلاع بأحدث الأخبار والفعاليات وقصص المجتمع.',
  ),
  channels: [
    { key: 'facebook', label: 'Facebook', followers: '24.5K', href: '#' },
    { key: 'twitter', label: 'Twitter / X', followers: '12.8K', href: '#' },
    { key: 'instagram', label: 'Instagram', followers: '18.2K', href: '#' },
    { key: 'youtube', label: 'YouTube', followers: '8.4K', href: '#' },
  ],
  posts: [
    {
      platform: 'facebook',
      handle: 'Rwanda Muslim Community',
      content: tri(
        'Alhamdulillah! Our annual Eid celebration brought together over 10,000 Muslims at Amahoro Stadium. May Allah accept our prayers and strengthen our community. 🤲 #EidMubarak #RwandaMuslims',
        "Alhamdulillah! Umunsi mukuru wa Eid wa buri mwaka wahuje Abayisilamu barenga 10,000 kuri sitade Amahoro. Allah yakire amasengesho yacu kandi akomeze umuryango wacu. 🤲 #EidMubarak #RwandaMuslims",
        'الحمد لله! جمع احتفالنا السنوي بعيد الفطر أكثر من 10,000 مسلم في ملعب أماهورو. تقبل الله صلواتنا وقوّى مجتمعنا. 🤲 #EidMubarak #RwandaMuslims',
      ),
      likes: '1.2K',
      comments: '234',
      date: '2h ago',
      image:
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop',
    },
    {
      platform: 'twitter',
      handle: '@RMC_Rwanda',
      content: tri(
        "REMINDER 📢 Scholarship applications for the 2025/2026 academic year close on June 30th. Apply now at our website. All Muslim students from Rwanda are eligible. Don't miss your chance! #RMCScholarship",
        "URWIBUTSO 📢 Gusaba buruse y'umwaka w'amashuri wa 2025/2026 bifunga ku ya 30 Kamena. Saba ubu kuri urubuga rwacu. Abanyeshuri bose b'Abayisilamu bo mu Rwanda barabyemerewe. Ntukabure amahirwe yawe! #RMCScholarship",
        'تذكير 📢 يُغلق التقديم على المنح الدراسية للعام الدراسي 2025/2026 في 30 يونيو. قدّم الآن عبر موقعنا. جميع الطلاب المسلمين من رواندا مؤهلون. لا تفوّت فرصتك! #RMCScholarship',
      ),
      likes: '847',
      comments: '156',
      date: '5h ago',
    },
    {
      platform: 'instagram',
      handle: '@rmc_rwanda',
      content: tri(
        'Our Ramadan food drive was a huge success! Together we distributed 5,000 food packages to families in need across all 5 provinces. JazakAllahu Khairan to all volunteers and donors! ❤️',
        "Igikorwa cyacu cyo gutanga ibiribwa muri Ramadan cyagenze neza cyane! Hamwe twatanze ibyfunyiko 5,000 by'ibiribwa ku miryango ikennye mu ntara zose 5. JazakAllahu Khairan ku bakorerabushake bose n'abaterankunga! ❤️",
        'حملتنا لتوزيع الطعام في رمضان حققت نجاحًا كبيرًا! وزّعنا معًا 5,000 طرد غذائي على الأسر المحتاجة في جميع المقاطعات الخمس. جزاكم الله خيرًا لكل المتطوعين والمتبرعين! ❤️',
      ),
      likes: '2.3K',
      comments: '412',
      date: '1d ago',
      image:
        'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=600&auto=format&fit=crop',
    },
  ],
};

// ─── Live feed (backend `SocialModule`) ─────────────────────────────────────────
// The backend polls the real RMC accounts on a schedule and caches the latest
// posts. The landing section prefers this live feed and falls back to the
// admin-managed content above when nothing is configured or the fetch fails.

/** Raw post shape returned by `GET /social/feed`. */
export interface LiveSocialPost {
  platform: SocialPlatform;
  handle: string;
  text: string;
  image?: string;
  url: string;
  likes: number;
  comments: number;
  publishedAt: string;
}

export interface LiveSocialChannel {
  key: SocialPlatform;
  label: string;
  followers: number;
  href: string;
}

export interface SocialFeed {
  posts: LiveSocialPost[];
  channels: LiveSocialChannel[];
  fetchedAt: string | null;
  configured: boolean;
}

const feedHttp = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
});

/** Fetch the cached live feed. Returns null on any error (caller keeps defaults). */
export async function getSocialFeed(): Promise<SocialFeed | null> {
  try {
    const res = await feedHttp.get<{ data: SocialFeed }>('/social/feed');
    return res.data.data;
  } catch {
    return null;
  }
}

/** Compact count formatting: 1234 → "1.2K", 2_500_000 → "2.5M". */
export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

/** Relative "x ago" label from an ISO timestamp. */
export function timeAgo(iso: string | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

/** Map a live post into the render model used by the section's PostCard. */
export function toRenderPost(p: LiveSocialPost): SocialPost {
  return {
    platform: p.platform,
    handle: p.handle,
    // No translations for live content — store as English so pick() falls back.
    content: tri(p.text),
    likes: formatCount(p.likes),
    comments: formatCount(p.comments),
    date: timeAgo(p.publishedAt),
    image: p.image,
    url: p.url,
    publishedAt: p.publishedAt,
  };
}