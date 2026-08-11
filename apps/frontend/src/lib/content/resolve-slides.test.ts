import { hasLinkedSlides, resolveSlides } from './resolve-slides';
import { tri, pick } from './client';
import type { UpdateSlide } from './updates';
import type { ScholarshipProgram } from '@/lib/scholarshipApi';

// Deadline copy is clock-dependent, and the interesting cases sit on calendar
// boundaries — "closes today" for a deadline tonight, "closed" for one that
// lapsed this morning. Pin the clock so those never depend on when CI runs.
const NOW = new Date(2026, 7, 3, 10, 0, 0); // Mon 3 Aug 2026, 10:00 local

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

/** A deadline at a local wall-clock offset from the pinned "now". */
const at = (days: number, hour = 10) =>
  new Date(2026, 7, 3 + days, hour, 0, 0).toISOString();

function makeProgram(over: Partial<ScholarshipProgram> = {}): ScholarshipProgram {
  return {
    id: 'prog-1',
    slug: 'secondary-bursary-2026',
    title: 'Secondary Bursary 2026',
    description: 'Full bursaries for secondary students.',
    titleI18n: null,
    descriptionI18n: null,
    eligibilityI18n: null,
    benefitsI18n: null,
    requiredDocuments: [],
    attachments: [],
    level: 'secondary',
    amount: null,
    slots: null,
    referenceNumber: null,
    opensAt: null,
    deadline: at(5), // Sat 8 Aug → "in 5 days"
    status: 'published',
    isOpen: true,
    ...over,
  };
}

function makeSlide(over: Partial<UpdateSlide> = {}): UpdateSlide {
  return {
    badge: tri('Scholarships', 'Buruse', 'المنح'),
    title: tri('Authored title', 'Umutwe wanditse', 'عنوان مكتوب'),
    description: tri(
      'Full and partial scholarships for Muslim students.',
      'Buruse zuzuye n’iz’igice ku banyeshuri.',
      'منح دراسية كاملة وجزئية للطلاب.',
    ),
    cta: tri('Apply Now', 'Saba Nonaha', 'قدّم الآن'),
    ctaHref: '/services',
    icon: 'GraduationCap',
    image: 'https://example.com/a.jpg',
    imageAlt: 'alt',
    statValue: '500+',
    statLabel: tri('Scholarships awarded'),
    ...over,
  };
}

const link = (programId = 'prog-1') =>
  ({ type: 'scholarship-program', programId }) as const;

describe('hasLinkedSlides', () => {
  it('is false for authored-only slides', () => {
    expect(hasLinkedSlides([makeSlide(), makeSlide()])).toBe(false);
  });

  it('is true when any slide carries a source', () => {
    expect(hasLinkedSlides([makeSlide(), makeSlide({ source: link() })])).toBe(true);
  });
});

describe('resolveSlides', () => {
  it('returns the same array when nothing is linked, without touching programs', () => {
    const items = [makeSlide(), makeSlide()];
    expect(resolveSlides(items, [])).toBe(items);
  });

  it('takes title and link from the program and appends the deadline', () => {
    const [slide] = resolveSlides([makeSlide({ source: link() })], [makeProgram()]);

    expect(pick(slide.title, 'en')).toBe('Secondary Bursary 2026');
    expect(slide.ctaHref).toBe('/services/scholarship/secondary-bursary-2026');
    expect(pick(slide.description, 'en')).toBe(
      'Full and partial scholarships for Muslim students. Applications close in 5 days.',
    );
  });

  it('leaves badge, image, icon, and the stat pair authored', () => {
    const authored = makeSlide({ source: link() });
    const [slide] = resolveSlides([authored], [makeProgram()]);

    expect(slide.badge).toEqual(authored.badge);
    expect(slide.image).toBe(authored.image);
    expect(slide.icon).toBe(authored.icon);
    expect(slide.statValue).toBe('500+');
    expect(slide.statLabel).toEqual(authored.statLabel);
  });

  it('prefers the trilingual program title', () => {
    const program = makeProgram({
      titleI18n: { en: 'Bursary', rw: 'Buruse', ar: 'منحة' },
    });
    const [slide] = resolveSlides([makeSlide({ source: link() })], [program]);

    expect(pick(slide.title, 'rw')).toBe('Buruse');
    expect(pick(slide.title, 'ar')).toBe('منحة');
  });

  it('falls back to the flat title when the trilingual one is blank', () => {
    const program = makeProgram({ titleI18n: { en: '  ', rw: '', ar: '' } });
    const [slide] = resolveSlides([makeSlide({ source: link() })], [program]);

    expect(pick(slide.title, 'en')).toBe('Secondary Bursary 2026');
  });

  it('appends the clause in each translated language', () => {
    const [slide] = resolveSlides([makeSlide({ source: link() })], [makeProgram()]);

    expect(pick(slide.description, 'rw')).toBe(
      'Buruse zuzuye n’iz’igice ku banyeshuri. Gusaba birangira mu minsi 5.',
    );
    expect(pick(slide.description, 'ar')).toContain('يُغلق باب التقديم خلال 5 أيام.');
  });

  it('leaves an untranslated description empty so it still falls back to English', () => {
    const slide = makeSlide({
      source: link(),
      description: { en: 'English body.', rw: '', ar: '' },
    });
    const [resolved] = resolveSlides([slide], [makeProgram()]);

    // Not "Gusaba birangira mu minsi 5." on its own — the reader gets the full
    // English sentence plus its clause instead of a bare orphaned deadline.
    expect(resolved.description.rw).toBe('');
    expect(pick(resolved.description, 'rw')).toBe(
      'English body. Applications close in 5 days.',
    );
  });

  describe('deadline states', () => {
    const descriptionFor = (over: Partial<ScholarshipProgram>) =>
      pick(resolveSlides([makeSlide({ source: link() })], [makeProgram(over)])[0].description, 'en');

    it('reads "today" for a deadline still to come tonight', () => {
      expect(descriptionFor({ deadline: at(0, 23) })).toContain('close today.');
    });

    it('reads "tomorrow" for a deadline on the next calendar day', () => {
      // Only 3 hours out, but it is a different date — "tomorrow", not "today".
      expect(descriptionFor({ deadline: at(1, 13) })).toContain('close tomorrow.');
    });

    it('counts calendar days, not elapsed hours', () => {
      // 4 days + 23 hours away. Ceiling the raw gap would say 5.
      expect(descriptionFor({ deadline: at(5, 9) })).toContain('close in 5 days.');
    });

    it('reads closed once the deadline has passed', () => {
      expect(descriptionFor({ deadline: at(-2) })).toContain('are now closed.');
    });

    it('reads closed for a deadline that lapsed earlier the same day', () => {
      // The scholarships board ceils the gap and still shows "Closes today"
      // here. A homepage banner must not keep inviting applications.
      expect(descriptionFor({ deadline: at(0, 9) })).toContain('are now closed.');
    });

    it('lets an explicit closed status outrank a future deadline', () => {
      expect(descriptionFor({ status: 'closed', deadline: at(30) })).toContain(
        'are now closed.',
      );
    });

    it('says nothing at all when the program has no deadline', () => {
      expect(descriptionFor({ deadline: null })).toBe(
        'Full and partial scholarships for Muslim students.',
      );
    });

    it('says nothing when the deadline is unparseable', () => {
      expect(descriptionFor({ deadline: 'not-a-date' })).toBe(
        'Full and partial scholarships for Muslim students.',
      );
    });
  });

  describe('fallbacks', () => {
    it('keeps the authored slide when the program is not in the list', () => {
      const authored = makeSlide({ source: link('missing') });
      const [slide] = resolveSlides([authored], [makeProgram()]);

      expect(slide).toBe(authored);
    });

    it('keeps the authored slide when the program list is empty', () => {
      const authored = makeSlide({ source: link() });
      expect(resolveSlides([authored], [])[0]).toBe(authored);
    });

    it('keeps the authored link when the program has no slug', () => {
      const [slide] = resolveSlides(
        [makeSlide({ source: link() })],
        [makeProgram({ slug: null })],
      );

      expect(slide.ctaHref).toBe('/services');
    });

    it('resolves only the linked slide, leaving its neighbours identical', () => {
      const plain = makeSlide({ title: tri('Donate') });
      const [a, b] = resolveSlides([plain, makeSlide({ source: link() })], [makeProgram()]);

      expect(a).toBe(plain);
      expect(pick(b.title, 'en')).toBe('Secondary Bursary 2026');
    });
  });
});
