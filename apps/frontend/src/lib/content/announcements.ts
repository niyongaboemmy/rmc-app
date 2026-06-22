import { Tri, tri } from './client';

export type AnnouncementPriority = 'normal' | 'high' | 'urgent';

export type AnnouncementType = 'announcement' | 'tender';

/** One announcement card. */
export interface AnnouncementItem {
  title: Tri;
  content: Tri;
  priority: AnnouncementPriority;
  type: AnnouncementType;
  /** ISO timestamp. */
  publishAt: string;
  /** ISO timestamp — deadline for tenders. */
  expiresAt?: string;
}

export interface AnnouncementsContent {
  title: Tri;
  subtitle: Tri;
  items: AnnouncementItem[];
}

/**
 * Seeded from the live landing fallback (AnnouncementsSection DUMMY) — English
 * canonical. The Announcements wiring step finalizes the body text verbatim.
 */
export const ANNOUNCEMENTS_DEFAULT: AnnouncementsContent = {
  title: tri('Announcements', 'Amatangazo', 'الإعلانات'),
  subtitle: tri('Latest news & updates', "Amakuru n'ibishya bigezweho", 'أحدث الأخبار والمستجدات'),
  items: [
    {
      title: tri(
        'Eid al-Adha Prayer Schedule Announced',
        "Gahunda y'amasengesho ya Idi El-Adiha yatangajwe",
        'الإعلان عن جدول صلاة عيد الأضحى',
      ),
      content: tri(
        'Eid prayers will be held at Amahoro National Stadium and all district masjids on Eid morning. Please arrive 30 minutes early.',
        "Amasengesho ya Idi azaberera ku Kibuga cy'imikino cya Amahoro no mu misigiti yose y'uturere mu gitondo cya Idi. Mwitabire iminota 30 mbere y'igihe.",
        'تُقام صلاة العيد في ملعب أماهورو الوطني وفي جميع مساجد المقاطعات صباح يوم العيد. يُرجى الحضور قبل الموعد بثلاثين دقيقة.',
      ),
      priority: 'high',
      type: 'announcement',
      publishAt: '2026-06-12T08:00:00Z',
    },
    {
      title: tri(
        'Free Community Health Camp This Weekend',
        "Inkambi y'ubuvuzi y'ubuntu mu muryango muri iki cyumweru",
        'مخيم صحي مجاني للمجتمع نهاية هذا الأسبوع',
      ),
      content: tri(
        'Free medical check-ups, consultations, and medication will be available at the Grand Mosque of Kigali this Saturday and Sunday.',
        "Isuzuma ry'ubuvuzi, inama z'abaganga, n'imiti by'ubuntu bizaboneka ku Musigiti Mukuru wa Kigali kuwa gatandatu no ku cyumweru.",
        'تتوفر الفحوصات الطبية والاستشارات والأدوية مجانًا في المسجد الكبير بكيغالي يومي السبت والأحد.',
      ),
      priority: 'urgent',
      type: 'announcement',
      publishAt: '2026-06-10T09:00:00Z',
    },
    {
      title: tri(
        'RMC Scholarship Applications Now Open',
        "Gusaba buruse za RMC byafunguwe",
        'فتح باب التقديم لمنح المجتمع الإسلامي الرواندي',
      ),
      content: tri(
        'Full and partial scholarships for Muslim students across Rwanda are open for the 2026/27 academic year. Apply before June 30th.',
        "Buruse zuzuye n'izindi zigice ku banyeshuri b'Abayisilamu mu Rwanda hose zafunguwe ku mwaka w'amashuri wa 2026/27. Saba mbere ya tariki ya 30 Kamena.",
        'باب التقديم مفتوح لمنح دراسية كاملة وجزئية للطلاب المسلمين في جميع أنحاء رواندا للعام الدراسي 2026/27. قدّم طلبك قبل الثلاثين من يونيو.',
      ),
      priority: 'normal',
      type: 'announcement',
      publishAt: '2026-06-06T10:00:00Z',
    },
    {
      title: tri(
        "Weekly Qur'an Classes Resume at District Masjids",
        "Amasomo ya buri cyumweru ya Qurani aratangira mu misigiti y'uturere",
        'استئناف دروس القرآن الأسبوعية في مساجد المقاطعات',
      ),
      content: tri(
        "Qur'an memorization and Tajweed classes for all ages resume this week. Register at your local mosque.",
        "Amasomo yo kwiga Qurani ku mutwe na Tajiwidi ku bantu b'imyaka yose aratangira muri iki cyumweru. Iyandikishe ku musigiti wo aho utuye.",
        'تُستأنف دروس حفظ القرآن والتجويد لجميع الأعمار هذا الأسبوع. سجّل في مسجد حيّك.',
      ),
      priority: 'normal',
      type: 'announcement',
      publishAt: '2026-06-02T07:30:00Z',
    },
  ],
};
