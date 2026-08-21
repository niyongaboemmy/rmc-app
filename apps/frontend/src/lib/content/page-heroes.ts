import { Tri, tri } from './client';

/**
 * Shared shape + seeds for the secondary-page HEROES (the `PageHero` banner at
 * the top of Tenders, Membership registration, New-Muslim, Services, Contact…).
 *
 * Each hero gets its OWN `site_content` section (`*-hero`) so inline edits never
 * clobber the rest of a page's content blob. Seeds mirror the strings these
 * pages previously read from their i18n bundles, so switching to the store is a
 * no-op for every visitor until an admin edits in place.
 *
 * `eyebrow` is optional per hero — pass an empty Tri (or omit rendering it) when
 * a hero shows no eyebrow pill.
 */
export interface HeroCopy {
  eyebrow: Tri;
  title: Tri;
  subtitle: Tri;
}

export const TENDERS_HERO_DEFAULT: HeroCopy = {
  eyebrow: tri('Business Opportunities', "Amahirwe y'Ubucuruzi", 'فرص الأعمال'),
  title: tri('Open Tenders', "Itangazo ry'Umushinga", 'المناقصات المفتوحة'),
  subtitle: tri(
    'Procurement and contracting opportunities published by Rwanda Muslim Community.',
    "Amahirwe yo gupiganira imishinga yakuwe na Sosiyete y'Abasilamu yo mu Rwanda.",
    'فرص المشتريات والتعاقدات الصادرة عن المجتمع الإسلامي الرواندي.',
  ),
};

export const REGISTER_HERO_DEFAULT: HeroCopy = {
  eyebrow: tri('Membership', "Ubuyobozi bw'Abanyamuryango", 'العضوية'),
  title: tri('Complete Member Profile', 'Uzuza Dosiye ya Nyirawo', 'استكمال ملف العضو'),
  subtitle: tri(
    'Fill in your details to submit your membership application',
    'Uzuza amakuru yawe kugira ngo usohoze ubusabe bwo kwiyandikisha',
    'أدخل بياناتك لتقديم طلب العضوية',
  ),
};

export const NEW_MUSLIM_HERO_DEFAULT: HeroCopy = {
  eyebrow: tri('Welcome to Islam', 'Murakaza neza muri Islam', 'مرحباً بك في الإسلام'),
  title: tri('Your Journey Begins Here', 'Urugendo Rwawe Rutangirira Hano', 'رحلتك تبدأ من هنا'),
  subtitle: tri(
    'Congratulations and welcome, dear brother or sister. Here is what comes next — and how the Rwanda Muslim Community is here to walk with you.',
    "Twishimiye kandi turagusuhuje, mwene wacu nkunda. Dore ibikurikira — n'uko Umuryango w'Abayisilamu bo mu Rwanda uri kumwe nawe.",
    'مبروك وأهلاً بك، أخي أو أختي العزيزة. إليك ما يأتي بعد ذلك — وكيف يقف المجتمع الإسلامي الرواندي معك.',
  ),
};

export const SERVICES_HERO_DEFAULT: HeroCopy = {
  eyebrow: tri('', '', ''),
  title: tri('Community Services', "Serivisi z'Umuryango", 'خدمات المجتمع'),
  subtitle: tri(
    'RMC offers 7 core services to support our community',
    "RMC itanga serivisi 7 z'ingenzi kuri abanyamuryango",
    'تقدم المجتمع الإسلامي الرواندي 7 خدمات أساسية لدعم مجتمعنا',
  ),
};

export const CONTACT_HERO_DEFAULT: HeroCopy = {
  eyebrow: tri('RMC', 'RMC', 'RMC'),
  title: tri('Contact Us', 'Twunganire', 'اتصل بنا'),
  subtitle: tri(
    'Get in touch with the Rwanda Muslim Community',
    "Tunga amabwiriza y'Umuryango w'Abasilamu bo mu Rwanda",
    'تواصل مع المجتمع الإسلامي الرواندي',
  ),
};
