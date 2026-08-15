import { pick, pickLang, raw, rawLang, tri } from './client';

/**
 * `raw`/`rawLang` exist so an edit box can show "this locale has no copy" instead of
 * the English fallback. These tests pin the one property that matters: they agree
 * with `pick`/`pickLang` whenever a translation exists, and diverge — to empty —
 * exactly when it does not.
 */

describe('raw', () => {
  const translated = tri('Request a Service', 'Saba serivisi', 'اطلب خدمة');
  const untranslated = tri('Request a Service');

  it('returns the locale\'s own text when it exists, agreeing with pick', () => {
    for (const locale of ['en', 'rw', 'ar']) {
      expect(raw(translated, locale)).toBe(pick(translated, locale));
    }
    expect(raw(translated, 'rw')).toBe('Saba serivisi');
  });

  it('returns empty where pick falls back to English', () => {
    expect(pick(untranslated, 'rw')).toBe('Request a Service');
    expect(raw(untranslated, 'rw')).toBe('');
    expect(raw(untranslated, 'ar')).toBe('');
    // English itself is never a fallback, so it still reads through.
    expect(raw(untranslated, 'en')).toBe('Request a Service');
  });

  it('treats an unknown locale as English, like pick', () => {
    expect(raw(translated, 'fr')).toBe('Request a Service');
  });

  it('survives a missing or partial Tri', () => {
    expect(raw(undefined, 'rw')).toBe('');
    expect(raw(null, 'rw')).toBe('');
    // Older stored blobs can lack a locale key entirely rather than holding ''.
    expect(raw({ en: 'Hello' } as never, 'rw')).toBe('');
  });
});

describe('rawLang', () => {
  const content = {
    headingEn: 'Serving the Ummah',
    headingRw: 'Dukorera Umat',
    headingAr: 'في خدمة الأمة',
    ledeEn: 'English only',
    ledeRw: '',
  };

  it('returns the suffixed field for the locale', () => {
    expect(rawLang(content, 'heading', 'rw')).toBe('Dukorera Umat');
    expect(rawLang(content, 'heading', 'ar')).toBe('في خدمة الأمة');
    expect(rawLang(content, 'heading', 'en')).toBe('Serving the Ummah');
  });

  it('returns empty where pickLang falls back to English', () => {
    expect(pickLang(content, 'lede', 'rw')).toBe('English only');
    expect(rawLang(content, 'lede', 'rw')).toBe('');
  });

  it('returns empty for an absent field rather than throwing', () => {
    expect(rawLang(content, 'nothingHere', 'rw')).toBe('');
    expect(rawLang({}, 'heading', 'ar')).toBe('');
  });
});
