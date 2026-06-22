import { Tri, tri } from './client';

/** One animated counter in the Stats / Community Impact section. */
export interface StatItem {
  value: number;
  suffix: string;
  /** lucide icon name, resolved to a component on the landing side. */
  icon: string;
  label: Tri;
}

export interface StatsContent {
  eyebrow: Tri;
  title: Tri;
  titleAccent: Tri;
  subtitle: Tri;
  items: StatItem[];
}

/** Seeded from the live landing (StatsSection) — English canonical. */
export const STATS_DEFAULT: StatsContent = {
  eyebrow: tri('Community Impact', "Ingaruka ku Muryango", 'أثر المجتمع'),
  title: tri('RMC In', 'RMC mu', 'RMC في'),
  titleAccent: tri('Statistics', 'Mibare', 'الأرقام'),
  subtitle: tri('Serving the Muslim community across Rwanda', "Dukorera umuryango w'Abayisilamu mu Rwanda hose", 'نخدم المجتمع المسلم في جميع أنحاء رواندا'),
  items: [
    { value: 1000000, suffix: '+', icon: 'Users', label: tri('Muslims', 'Abayisilamu', 'مسلمون') },
    { value: 14, suffix: '+', icon: 'GraduationCap', label: tri('Schools', 'Amashuri', 'مدارس') },
    { value: 640, suffix: '+', icon: 'Building2', label: tri('Masjids', 'Imisigiti', 'مساجد') },
  ],
};
