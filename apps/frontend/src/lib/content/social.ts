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
    { key: 'twitter', label: 'X / Twitter', followers: '', href: 'https://x.com/islamrwanda' },
    { key: 'instagram', label: 'Instagram', followers: '18.2K', href: '#' },
    { key: 'youtube', label: 'YouTube', followers: '', href: 'https://www.youtube.com/@islamrwanda6069' },
  ],
  // Curated X / Twitter highlights (admin-editable in Content → Social Media).
  // Shown in the home "Latest on X" column when the live feed is unavailable —
  // seeded with real @islamrwanda posts. Replace/add via the admin editor.
  posts: [
    {
      platform: 'twitter',
      handle: 'Rwanda Muslim Community',
      content: tri(
        `Ubutumwa bwa Nyakubahwa Mufti w'uRwanda busoza Igisibo gitagatifu cy'Ukwezi kwa #Ramadhan1446_2025`,
      ),
      likes: '160',
      comments: '1',
      date: 'Mar 2025',
      image:
        'https://pbs.twimg.com/ext_tw_video_thumb/1906115841759854592/pu/img/bTXK8oUaoKF3TdL3.jpg',
      url: 'https://twitter.com/islamrwanda/status/1906116453440385383',
    },
    {
      platform: 'twitter',
      handle: 'Rwanda Muslim Community',
      content: tri(
        `The Leadership of #RMC wishes to inform all Muslims and general public that Wednesday 10th April is #EidAlFitr2024 festive. Eid prayers at National level will be held at Kigali Pele Stadium from 6:30am; His Eminence the @MuftiRwanda Sheikh Salim HITIMANA will lead the prayers.`,
      ),
      likes: '159',
      comments: '4',
      date: 'Apr 2024',
      image: 'https://pbs.twimg.com/media/GKqvMeeWkAAvPyF.jpg',
      url: 'https://twitter.com/islamrwanda/status/1777425647033335921',
    },
    {
      platform: 'twitter',
      handle: 'Rwanda Muslim Community',
      content: tri(
        `🚨Breaking:🚨\nThe Leadership of Rwanda Muslim Community has announced that Friday 21st April, 2023 is EID AL FITR (Festival of Fast-Breaking) day marking the end of the month of #Ramadhan. #EidMubarak2023`,
      ),
      likes: '141',
      comments: '5',
      date: 'Apr 2023',
      image: 'https://pbs.twimg.com/media/FuK02LsWIAEqQre.jpg',
      url: 'https://twitter.com/islamrwanda/status/1649079264774332418',
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
  // Never let a slow feed stall the section — fall back to curated content.
  timeout: 8000,
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