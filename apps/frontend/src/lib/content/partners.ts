import { Tri, tri } from './client';

/** One partner logo/card in the Partners section. */
export interface PartnerItem {
  /** Brand name — not translated. */
  name: string;
  sector: Tri;
  /** Short descriptive note shown in the partner detail modal (per language). */
  description?: Tri;
  /** Logo path or URL (e.g. /partners/adef.png). */
  logo: string;
  website?: string;
}

export interface PartnersContent {
  eyebrow: Tri;
  title: Tri;
  lede: Tri;
  footerNote: Tri;
  contactEmail: string;
  items: PartnerItem[];
}

/** Seeded from the live landing (PartnersSection) — English canonical. */
export const PARTNERS_DEFAULT: PartnersContent = {
  eyebrow: tri('Working Together', 'Dukorera Hamwe', 'نعمل معًا'),
  title: tri('Our Partners', 'Abafatanyabikorwa Bacu', 'شركاؤنا'),
  lede: tri(
    'RMC works alongside leading international and regional organizations to educate, uplift, and serve the Muslim community of Rwanda.',
    "RMC ikorana n'imiryango ikomeye y'amahanga n'iy'akarere mu kwigisha, guteza imbere, no gufasha umuryango w'Abayisilamu wo mu Rwanda.",
    'يعمل المجتمع الإسلامي الرواندي جنبًا إلى جنب مع منظمات دولية وإقليمية رائدة لتعليم المجتمع المسلم في رواندا والنهوض به وخدمته.',
  ),
  footerNote: tri(
    'Interested in partnering with RMC?',
    'Wifuza gufatanya na RMC?',
    'هل ترغب في الشراكة مع المجتمع الإسلامي الرواندي؟',
  ),
  contactEmail: 'info@rwandamuslim.org',
  items: [
    {
      name: 'ADEF',
      sector: tri('Education Foundation', "Ikigega cy'Uburezi", 'مؤسسة تعليمية'),
      description: tri(
        'An education-focused foundation partnering with RMC to expand schools, scholarships and learning resources for the Muslim community of Rwanda.',
      ),
      logo: '/partners/adef.png',
    },
    {
      name: 'Direct Aid',
      sector: tri('Social & Education', "Imibereho Myiza n'Uburezi", 'الشؤون الاجتماعية والتعليم'),
      description: tri(
        'A leading international relief and development organisation supporting social welfare, education and healthcare programmes across Africa, including Rwanda.',
      ),
      logo: '/partners/direct-aid.png',
      website: 'https://direct-aid.org/',
    },
    {
      name: 'IERA',
      sector: tri('Dawah', 'Kwamamaza Idini', 'الدعوة'),
      description: tri(
        "A global da'wah organisation dedicated to sharing the message of Islam through peaceful outreach, education and support for new Muslims.",
      ),
      logo: '/partners/iera.png',
      website: 'https://iera.org/',
    },
    {
      name: 'WAMY',
      sector: tri('Youth Development', "Iterambere ry'Urubyiruko", 'تنمية الشباب'),
      description: tri(
        'The World Assembly of Muslim Youth — empowering young Muslims worldwide through education, leadership development and humanitarian work.',
      ),
      logo: '/partners/wamy.jpg',
      website: 'https://www.wamy.co.uk/',
    },
  ],
};
