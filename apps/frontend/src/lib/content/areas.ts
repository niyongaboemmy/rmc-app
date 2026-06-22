import { Tri, tri } from './client';

/** One "pillar" card in the Areas of Intervention section. */
export interface AreaItem {
  /** lucide icon name, resolved to a component on the landing side. */
  icon: string;
  title: Tri;
  description: Tri;
  slug: string;
  richContent?: Tri;
  imageKey?: string;
}

export interface AreasContent {
  eyebrow: Tri;
  title: Tri;
  titleAccent: Tri;
  lede: Tri;
  items: AreaItem[];
}

/** Seeded from the live landing (AreasOfInterventionSection) — English canonical. */
export const AREAS_DEFAULT: AreasContent = {
  eyebrow: tri('Our Impact', "Ingaruka zacu", 'أثرنا'),
  title: tri('Areas of', "Inzego z'", 'مجالات'),
  titleAccent: tri('Intervention', 'Ibikorwa', 'التدخل'),
  lede: tri(
    'RMC works across four strategic pillars to uplift, educate, and connect the Muslim community of Rwanda — from local mosques to global partnerships.',
    "RMC ikorera mu nkingi enye z'ingenzi mu guteza imbere, kwigisha no guhuza umuryango w'Abayisilamu wo mu Rwanda — kuva mu misigiti yo mu turere kugeza ku bufatanye mpuzamahanga.",
    'يعمل المجتمع الإسلامي الرواندي عبر أربع ركائز استراتيجية للنهوض بالمجتمع المسلم في رواندا وتعليمه وربطه — من المساجد المحلية إلى الشراكات العالمية.',
  ),
  items: [
    {
      icon: 'BookOpen',
      slug: 'dawah',
      title: tri('Dawah', "Kwamamaza Idini", 'الدعوة'),
      description: tri(
        'Spreading the true teachings of Islam through peaceful outreach and guidance.',
        "Gukwirakwiza inyigisho z'ukuri za Isilamu binyuze mu kugera ku bantu mu mahoro no kuyobora.",
        'نشر تعاليم الإسلام الصحيحة من خلال الدعوة السلمية والإرشاد.',
      ),
    },
    {
      icon: 'Heart',
      slug: 'social-development',
      title: tri('Socio Development', "Iterambere ry'Imibereho", 'التنمية الاجتماعية'),
      description: tri(
        'Empowering communities through health, poverty alleviation, and welfare initiatives.',
        "Guha imbaraga abaturage binyuze mu buzima, kurwanya ubukene, n'ibikorwa byo guteza imbere imibereho.",
        'تمكين المجتمعات من خلال الصحة ومكافحة الفقر ومبادرات الرعاية الاجتماعية.',
      ),
    },
    {
      icon: 'GraduationCap',
      slug: 'education',
      title: tri('Education', 'Uburezi', 'التعليم'),
      description: tri(
        'Providing quality secular and Islamic education to the youth across the nation.',
        "Gutanga uburezi bw'isi n'ubwa Isilamu bufite ireme ku rubyiruko mu gihugu hose.",
        'توفير تعليم عام وإسلامي عالي الجودة للشباب في جميع أنحاء البلاد.',
      ),
    },
    {
      icon: 'Globe',
      slug: 'foreign-affairs',
      title: tri('Foreign Affairs', "Imibanire n'Amahanga", 'الشؤون الخارجية'),
      description: tri(
        'Building and maintaining strong international relations and partnerships.',
        "Kubaka no kubungabunga imibanire n'ubufatanye mpuzamahanga bukomeye.",
        'بناء علاقات وشراكات دولية قوية والحفاظ عليها.',
      ),
    },
  ],
};
