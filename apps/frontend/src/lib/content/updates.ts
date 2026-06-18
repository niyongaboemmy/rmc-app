import { Tri, tri } from './client';

/** One slide in the Welcome carousel (Updates & Programs). */
export interface UpdateSlide {
  badge: Tri;
  title: Tri;
  description: Tri;
  cta: Tri;
  ctaHref: string;
  /** lucide icon name, resolved to a component on the landing side. */
  icon: string;
  image: string;
  imageAlt: string;
  statValue: string;
  statLabel: Tri;
}

export interface UpdatesContent {
  heading: Tri;
  items: UpdateSlide[];
}

/** Seeded from the live landing (WelcomeCarouselSection SLIDES) — English canonical. */
export const UPDATES_DEFAULT: UpdatesContent = {
  heading: tri('Updates & Programs', "Amakuru n'Gahunda", 'المستجدات والبرامج'),
  items: [
    {
      badge: tri('Scholarships 2025', "Buruse z'Amashuri 2025", 'المنح الدراسية 2025'),
      title: tri(
        'Apply for the RMC Education Scholarship Program',
        "Saba Gahunda ya Buruse y'Uburezi ya RMC",
        'قدّم طلبك لبرنامج المنح الدراسية التعليمية للمجتمع الإسلامي الرواندي',
      ),
      description: tri(
        "Full and partial scholarships for Muslim students across Rwanda — primary, secondary, and university levels. Applications close June 30th.",
        "Buruse zuzuye n'iz'igice ku banyeshuri b'Abayisilamu mu Rwanda hose — mu mashuri abanza, ayisumbuye, na kaminuza. Gusaba birangira ku itariki ya 30 Kamena.",
        'منح دراسية كاملة وجزئية للطلاب المسلمين في جميع أنحاء رواندا — للمرحلة الابتدائية والثانوية والجامعية. يُغلق باب التقديم في 30 يونيو.',
      ),
      cta: tri('Apply Now', 'Saba Nonaha', 'قدّم الآن'),
      ctaHref: '/services',
      icon: 'GraduationCap',
      image:
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=900&auto=format&fit=crop',
      imageAlt: 'Graduation caps thrown in celebration',
      statValue: '500+',
      statLabel: tri('Scholarships awarded', 'Buruse zatanzwe', 'منح دراسية مُنحت'),
    },
    {
      badge: tri('Community Programs', "Gahunda z'Umuryango", 'برامج المجتمع'),
      title: tri(
        'Join Our Social Development Initiatives Across Rwanda',
        "Jya muri Gahunda Zacu z'Iterambere Rusange mu Rwanda Hose",
        'انضم إلى مبادراتنا للتنمية الاجتماعية في جميع أنحاء رواندا',
      ),
      description: tri(
        'Microfinance support, vocational training, health outreach, and youth empowerment projects spanning all five provinces. Together we build stronger communities.',
        "Inkunga y'imari iciriritse, amahugurwa y'imyuga, serivisi z'ubuzima, n'imishinga yo guteza imbere urubyiruko mu ntara zose eshanu. Hamwe twubaka imiryango ikomeye.",
        'دعم التمويل الأصغر، والتدريب المهني، وحملات الرعاية الصحية، ومشاريع تمكين الشباب التي تشمل المقاطعات الخمس جميعها. معًا نبني مجتمعات أقوى.',
      ),
      cta: tri('Learn More', 'Menya Byinshi', 'اعرف المزيد'),
      ctaHref: '/about',
      icon: 'Users',
      image:
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=900&auto=format&fit=crop',
      imageAlt: 'Community members gathered together',
      statValue: '12,500+',
      statLabel: tri('Community members', 'Abagize umuryango', 'أعضاء المجتمع'),
    },
    {
      badge: tri('Support Our Mission', 'Shyigikira Intego Yacu', 'ادعم رسالتنا'),
      title: tri(
        'Make a Difference — Donate to the Muslim Community',
        "Gira Icyo Uhindura — Tanga Inkunga ku Muryango w'Abayisilamu",
        'اصنع فرقًا — تبرّع للمجتمع المسلم',
      ),
      description: tri(
        'Your donation supports mosques, schools, orphans, and social programs across Rwanda. Every contribution, big or small, builds a stronger ummah.',
        "Inkunga yawe ifasha imisigiti, amashuri, imfubyi, na gahunda z'imibereho myiza mu Rwanda hose. Buri muganda, waba munini cyangwa muto, wubaka umat ukomeye.",
        'تبرّعك يدعم المساجد والمدارس والأيتام والبرامج الاجتماعية في جميع أنحاء رواندا. كل مساهمة، كبيرة كانت أم صغيرة، تبني أمة أقوى.',
      ),
      cta: tri('Donate Now', 'Tanga Nonaha', 'تبرّع الآن'),
      ctaHref: '/donate',
      icon: 'Heart',
      image:
        'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=900&auto=format&fit=crop',
      imageAlt: 'Hands giving a charitable donation',
      statValue: '5,000+',
      statLabel: tri('Families supported', 'Imiryango yafashijwe', 'أسر تم دعمها'),
    },
    {
      badge: tri('International Affairs', 'Imibanire Mpuzamahanga', 'الشؤون الدولية'),
      title: tri(
        'Global Islamic Cooperation & Partnerships',
        "Ubufatanye n'Imikoranire y'Abayisilamu ku Rwego rw'Isi",
        'التعاون والشراكات الإسلامية العالمية',
      ),
      description: tri(
        'RMC collaborates with international Islamic organizations, embassies, and NGOs to bring scholarships, resources, and global support to the Rwandan Muslim community.',
        "RMC ifatanya n'imiryango y'Abayisilamu mpuzamahanga, ambasade, n'imiryango itari iya Leta, kugira ngo izane buruse, ibikoresho, n'inkunga mpuzamahanga ku muryango w'Abayisilamu bo mu Rwanda.",
        'يتعاون المجتمع الإسلامي الرواندي مع المنظمات الإسلامية الدولية والسفارات والمنظمات غير الحكومية لتوفير المنح الدراسية والموارد والدعم العالمي للمجتمع المسلم الرواندي.',
      ),
      cta: tri('Discover More', 'Sobanukirwa Byinshi', 'اكتشف المزيد'),
      ctaHref: '/about',
      icon: 'Globe',
      image:
        'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=900&auto=format&fit=crop',
      imageAlt: 'International partnership handshake',
      statValue: '20+',
      statLabel: tri('Global partners', 'Abafatanyabikorwa ku isi', 'شركاء عالميون'),
    },
  ],
};
