import { Tri, tri } from './client';

/** Hero section — background slideshow + welcome copy + CTAs. */
export interface HeroContent {
  /** Arabic greeting eyebrow (not translated). */
  salam: string;
  headline: Tri;
  subtitle: Tri;
  primaryCta: Tri;
  primaryHref: string;
  secondaryCta: Tri;
  secondaryHref: string;
  /** Background image URLs for the crossfading slideshow. */
  slides: string[];
}

/** Seeded from the live landing (HeroSection) — English canonical. */
export const HERO_DEFAULT: HeroContent = {
  salam: 'السَّلَامُ عَلَيْكُمْ',
  headline: tri(
    'Welcome to the Rwanda Muslim Community',
    "Murakaza neza mu Muryango w'Abayisilamu bo mu Rwanda",
    'مرحبًا بكم في المجتمع الإسلامي الرواندي',
  ),
  subtitle: tri(
    'Faith, knowledge, and service — uniting and uplifting the Muslim community across Rwanda.',
    "Ukwemera, ubumenyi no gufasha — guhuza no guteza imbere umuryango w'Abayisilamu mu Rwanda hose.",
    'إيمانٌ وعِلمٌ وخدمة — نوحّد المجتمع المسلم في رواندا ونرتقي به.',
  ),
  primaryCta: tri('Request a Service', 'Saba serivisi', 'اطلب خدمة'),
  primaryHref: '/services',
  secondaryCta: tri('Trends', 'Ibikorwa', 'آخر الأنشطة'),
  secondaryHref: '/activities',
  slides: [
    'https://pbs.twimg.com/media/HEQLxPtaUAADjH2?format=jpg&name=large',
    'https://pbs.twimg.com/media/HESeGQZWAAAvdtq?format=jpg&name=large',
  ],
};
