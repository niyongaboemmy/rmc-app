import { fileUrl } from '../api';
import { Tri, tri } from './client';

/**
 * Hajj service page content (admin-managed in Content → Hajj Service).
 *
 * The prose blocks only — the requirements checklist is a reorderable collection
 * with its own table, managed in Content → Hajj Requirements.
 *
 * The Talbiyah itself is not here: it is scripture, fixed in the component, not
 * copy for an admin to reword.
 */
export interface HajjContent {
  hero: {
    /** Rendered under the Arabic Talbiyah as its meaning. */
    talbiyahMeaning: Tri;
    eyebrow: Tri;
    title: Tri;
    subtitle: Tri;
  };
  about: {
    eyebrow: Tri;
    title: Tri;
    description: Tri;
    /** The gold callout that nudges the visitor to register. */
    incentive: Tri;
    cta: Tri;
    /**
     * Either an absolute URL (the seeded stock photo) or a file-server key from
     * an admin upload. Resolve it with `hajjPhotoSrc` rather than reading it raw.
     */
    photoUrl: string;
    photoAlt: Tri;
  };
  /**
   * Free-form block between the About section and the checklist. `body` holds
   * HTML written in the admin rich-text editor, so it must be sanitised before
   * it is rendered.
   */
  description: {
    eyebrow: Tri;
    title: Tri;
    body: Tri;
  };
  requirements: {
    eyebrow: Tri;
    title: Tri;
    subtitle: Tri;
  };
}

/**
 * Resolve the About photo to a renderable src.
 *
 * The field holds an absolute URL when it points at a stock/hosted image, or a
 * file-server key when an admin uploaded one — this tells the two apart. Falls
 * back to the seeded photo so a cleared field never renders a broken image.
 */
export function hajjPhotoSrc(photo: string | undefined): string {
  const value = photo?.trim();
  if (!value) return HAJJ_DEFAULT.about.photoUrl;
  return /^https?:\/\//i.test(value) ? value : fileUrl(value);
}

/** Seeded from the live Hajj page (its i18n copy + the hardcoded photo). */
export const HAJJ_DEFAULT: HajjContent = {
  hero: {
    talbiyahMeaning: tri(
      'Here I am, O Allah, here I am',
      'Ndi hano, Allah, ndi hano',
      'نداء التلبية',
    ),
    eyebrow: tri('Hajj Services', 'Serivisi za Hija', 'خدمات الحج'),
    title: tri(
      'Your Journey to Hajj Starts Here',
      'Urugendo rwawe rwa Hija rutangirira hano',
      'رحلتك إلى الحج تبدأ من هنا',
    ),
    subtitle: tri(
      'Guidance, registration, and support for pilgrims from our community — every step from preparation to departure.',
      'Ubuyobozi, kwiyandikisha, no gufasha abagenzi bo mu muryango wacu — intambwe zose kuva mu myiteguro kugeza ku kugenda.',
      'إرشاد وتسجيل ودعم لحجاج مجتمعنا — كل خطوة من الإعداد حتى المغادرة.',
    ),
  },
  about: {
    eyebrow: tri('About the pilgrimage', 'Ku bijyanye n’urugendo', 'عن الرحلة'),
    title: tri(
      'A journey of a lifetime, guided every step',
      'Urugendo rw’ubuzima, turagufasha mu ntambwe zose',
      'رحلة العمر، بإرشاد في كل خطوة',
    ),
    description: tri(
      'Hajj is the fifth pillar of Islam — a sacred journey every able Muslim aspires to make once in their lifetime. Our committee walks with you from your first inquiry to your safe return: registration, documentation, payments, travel, and support in the holy cities.',
      'Hija ni inkingi ya gatanu ya Isilamu — urugendo rwera buri Muslim ushoboye yifuza gukora rimwe mu buzima bwe. Komite yacu iragufasha kuva ku kibazo cyawe cya mbere kugeza usubiye amahoro: kwiyandikisha, inyandiko, ubwishyu, ingendo, no gufashwa mu mijyi yera.',
      'الحج هو الركن الخامس من أركان الإسلام — رحلة مقدسة يتطلع كل مسلم قادر إلى أدائها مرة في حياته. ترافقك لجنتنا من أول استفسار حتى عودتك بأمان: التسجيل والوثائق والمدفوعات والسفر والدعم في الأماكن المقدسة.',
    ),
    incentive: tri(
      'Places are limited each season and fill quickly. Begin your registration early to secure your spot and travel with the peace of mind of a trusted, community-led program.',
      'Imyanya iba mike buri gihe kandi yuzura vuba. Tangira kwiyandikisha hakiri kare kugira ngo wibonere umwanya, ugende utekanye n’ubufasha bw’umuryango wizewe.',
      'الأماكن محدودة كل موسم وتمتلئ بسرعة. ابدأ تسجيلك مبكرًا لتحجز مكانك وتسافر بطمأنينة مع برنامج موثوق يقوده المجتمع.',
    ),
    cta: tri('Register for Hajj', 'Iyandikishe kuri Hija', 'التسجيل للحج'),
    photoUrl: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200&q=80',
    photoAlt: tri(
      'Pilgrims at the Masjid al-Haram, Makkah',
      'Abagenzi kuri Masjid al-Haram, i Maka',
      'الحجاج في المسجد الحرام بمكة',
    ),
  },
  description: {
    eyebrow: tri('Good to know', 'Ibyiza kumenya', 'من الجيد معرفته'),
    title: tri(
      'About the Hajj programme',
      'Ku bijyanye na gahunda ya Hija',
      'عن برنامج الحج',
    ),
    body: tri(
      '<p>Our Hajj programme is organised by the Rwanda Muslim Community in coordination with the authorities of the Kingdom of Saudi Arabia. It covers your registration, documentation, flights, accommodation in Makkah and Madinah, and guidance from experienced pilgrims throughout the journey.</p><p>Before you register, please read the requirements below carefully. Applications that are missing a document or a payment proof cannot be processed, and places are confirmed in the order complete applications are received.</p>',
      '<p>Gahunda yacu ya Hija itegurwa n’Umuryango w’Abayisilamu bo mu Rwanda ku bufatanye n’inzego z’Ubwami bwa Arabiya Sawudite. Ikubiyemo kwiyandikisha, inyandiko, indege, aho kuba i Maka n’i Madina, no kuyoborwa n’abanyamwuga mu rugendo rwose.</p><p>Mbere yo kwiyandikisha, soma witonze ibisabwa bikurikira. Ubusabe budafite inyandiko cyangwa icyemezo cy’ubwishyu ntibushobora gutunganywa, kandi imyanya itangwa hakurikijwe uko ubusabe bwuzuye bwakiriwe.</p>',
      '<p>ينظّم برنامج الحج لدينا مجتمعُ المسلمين في رواندا بالتنسيق مع الجهات المختصة في المملكة العربية السعودية. ويشمل التسجيل والوثائق والرحلات الجوية والإقامة في مكة والمدينة والإرشاد طوال الرحلة.</p><p>قبل التسجيل، يُرجى قراءة المتطلبات أدناه بعناية. لا يمكن معالجة الطلبات الناقصة في الوثائق أو إثبات الدفع، وتُؤكَّد الأماكن حسب ترتيب استلام الطلبات المكتملة.</p>',
    ),
  },
  requirements: {
    eyebrow: tri('Get Ready', 'Iteguye', 'استعد'),
    title: tri('Hajj Requirements', 'Ibisabwa bya Hija', 'متطلبات الحج'),
    subtitle: tri(
      'What you need to prepare before you can register and travel.',
      'Ibyo ukeneye gutegura mbere yo kwiyandikisha no kugenda.',
      'ما تحتاج إلى تجهيزه قبل التسجيل والسفر.',
    ),
  },
};
