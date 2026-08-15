import { mergeContent, pick, tri, type Tri } from './client';

interface Section {
  headline: Tri;
  cta: Tri;
  imageKey: string;
  items: { title: Tri; href: string }[];
}

const DEFAULTS: Section = {
  headline: tri(
    'Welcome to the Rwanda Muslim Community',
    "Murakaza neza mu Muryango w'Abayisilamu bo mu Rwanda",
    'مرحبًا بكم في المجتمع الإسلامي الرواندي',
  ),
  cta: tri('Request a Service', 'Saba serivisi', 'اطلب خدمة'),
  imageKey: 'seeded/hero.jpg',
  items: [{ title: tri('Education', 'Uburezi', 'التعليم'), href: '/education' }],
};

describe('mergeContent', () => {
  it('keeps defaults for keys the saved blob does not carry', () => {
    const merged = mergeContent(DEFAULTS, { headline: { rw: 'Murakaza nezaaaa' } });

    expect(merged.headline.rw).toBe('Murakaza nezaaaa');
    // Untouched siblings and whole untouched sections survive.
    expect(merged.headline.en).toBe(DEFAULTS.headline.en);
    expect(merged.cta.rw).toBe('Saba serivisi');
    expect(merged.imageKey).toBe('seeded/hero.jpg');
  });

  it('honours a cleared translation instead of restoring the seeded one', () => {
    // The bug this guards: an empty rw used to fall back to the default's rw, so a
    // translation an admin deliberately cleared reappeared on the next load.
    const merged = mergeContent(DEFAULTS, { headline: { ...DEFAULTS.headline, rw: '' } });

    expect(merged.headline.rw).toBe('');
    // Cleared means "no copy in this locale", so rendering falls back to English.
    expect(pick(merged.headline, 'rw')).toBe(DEFAULTS.headline.en);
    // ...and only that locale is affected.
    expect(pick(merged.headline, 'ar')).toBe(DEFAULTS.headline.ar);
  });

  it('honours a cleared non-translation value, so a removed image stays removed', () => {
    const merged = mergeContent(DEFAULTS, { imageKey: '' });

    expect(merged.imageKey).toBe('');
  });

  it('merges arrays element-wise so per-item translations survive', () => {
    const merged = mergeContent(DEFAULTS, { items: [{ title: { en: 'Schools' } }] });

    expect(merged.items[0].title.en).toBe('Schools');
    expect(merged.items[0].title.rw).toBe('Uburezi');
    expect(merged.items[0].href).toBe('/education');
  });

  it('falls back to defaults for a section that has never been saved', () => {
    expect(mergeContent(DEFAULTS, null)).toEqual(DEFAULTS);
    expect(mergeContent(DEFAULTS, undefined)).toEqual(DEFAULTS);
  });
});
