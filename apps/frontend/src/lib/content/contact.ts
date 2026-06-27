import { Tri, tri } from './client';

/**
 * Contact page content (admin-managed in Content → Contact Page).
 *
 * The phone/email values are plain strings (not translated); everything else is
 * a `Tri` so the page renders in the active locale and falls back to English.
 * The follow-us channels are NOT here — they are shared with the homepage Social
 * Media section and managed in Content → Social Media.
 */
export interface ContactContent {
  // Hero
  title: Tri;
  subtitle: Tri;
  // "Get in Touch" card
  communicationTitle: Tri;
  communicationSubtitle: Tri;
  // Contact details
  address: Tri;
  phone: string;
  phoneHref: string;
  email: string;
  email2: string;
  hours: Tri;
  socialTitle: Tri;
  // Find a mosque
  findMosqueTitle: Tri;
  findMosqueSubtitle: Tri;
}

/** Seeded from the live Contact page (hardcoded values + i18n translations). */
export const CONTACT_DEFAULT: ContactContent = {
  title: tri('Contact Us', 'Twunganire', 'اتصل بنا'),
  subtitle: tri(
    'Get in touch with the Rwanda Muslim Community',
    "Tunga amabwiriza y'Umuryango w'Abasilamu bo mu Rwanda",
    'تواصل مع المجتمع الإسلامي الرواندي',
  ),
  communicationTitle: tri('Get in Touch', 'Twandikire', 'تواصل معنا'),
  communicationSubtitle: tri(
    "Reach us directly or send a message — we'll respond as soon as we can.",
    'Twandikire mu buryo butaziguye cyangwa wohereze ubutumwa — tuzakwitaba vuba bishoboka.',
    'تواصل معنا مباشرةً أو أرسل رسالة — وسنرد عليك في أقرب وقت ممكن.',
  ),
  address: tri('Kigali, Rwanda — RMC Head Office'),
  phone: '(+250) 788 308 436',
  phoneHref: 'tel:+250788308436',
  email: 'rwandamuslimc@gmail.com',
  email2: 'islamrwanda18@gmail.com',
  hours: tri(
    'Mon – Fri, 8:00 AM – 5:00 PM',
    'Kuwa mbere – Kuwa gatanu, 8:00 – 17:00',
    'الإثنين – الجمعة، 8:00 صباحاً – 5:00 مساءً',
  ),
  socialTitle: tri('Follow Us', 'Dukurikire', 'تابعنا'),
  findMosqueTitle: tri(
    'Find a Mosque Near You',
    'Shaka Umusigiti Uri Hafi Yawe',
    'ابحث عن مسجد قريب منك',
  ),
  findMosqueSubtitle: tri(
    'Tap a province on the map to zoom in, or search for a mosque by name.',
    'Kanda intara ku ikarita kugira ngo wegere, cyangwa ushakishe umusigiti ukoresheje izina.',
    'انقر على مقاطعة في الخريطة للتكبير، أو ابحث عن مسجد بالاسم.',
  ),
};
