# RMC Digital Platform — Typography Research Report & Implementation Plan

**Prepared:** 2026-06-11  
**Scope:** All three locales — English (`en`), Kinyarwanda (`rw`), Arabic (`ar`)  
**Audience:** UI/UX developer, Phase 2+ frontend implementation

---

## 1. Current State Audit

| Slot | Font | Status |
|---|---|---|
| Latin body (`en`/`rw`) | `Inter` | Adequate — clean but generic, lacks cultural warmth |
| Arabic body (`ar`) | `Noto Naskh Arabic` (400–700) | Good baseline — comprehensive Unicode, correct RTL |
| Latin display/heading | *(none — uses Inter)* | Missing — no typographic hierarchy distinction |
| Arabic display/heading | *(none — uses Noto Naskh Arabic)* | Missing — body and heading look the same |

**Gap:** The platform serves a Muslim community whose identity is deeply tied to Islamic calligraphic tradition. Using only `Inter` for English/Kinyarwanda content misses the cultural register. There is no expressive heading font for either script.

---

## 2. Research Findings

### 2.1 What makes a font "right" for Islamic web audiences

From industry research and Arabic UX guidelines (CSS-Tricks, Bycom Solutions, W3C ALREQ):

1. **Trust through tradition** — Islamic audiences respond to fonts that echo manuscript and calligraphic heritage. Purely geometric sans-serifs feel sterile for spiritual content.
2. **Legibility first** — Arabic fonts must never have letter-spacing applied. Glyphs are visually ~10% smaller than Latin at the same `px` size, so `16px` minimum for body and `18px` recommended.
3. **Weight floor** — Arabic `font-weight: 300` is unreadable on screen. Minimum `400` for body, `600+` for headings.
4. **Bilingual harmony** — The best English/Arabic pairings share x-height, optical weight, and tonal register (classical/editorial together; modern/sans together — never mixed).
5. **2–3 distinct typefaces max** — community/institutional platforms need authority, not variety.

### 2.2 Font Evaluation Matrix

#### Arabic Script Options

| Font | Style | Google Fonts | Weights | Verdict |
|---|---|---|---|---|
| **Amiri** | Classical Naskh revival | ✅ Free | 400, 700, italic | **Best for display** — used by Al-Azhar and Islamic institutions; warmest cultural resonance |
| Noto Naskh Arabic | Harmonised Naskh | ✅ Free | 400–700 | **Best for body** — comprehensive Unicode, tashkeel support, battle-tested |
| Cairo | Modern sans-serif | ✅ Free | 200–900 | **Best for UI labels** — clean, bilingual (Arabic+Latin in one family) |
| Scheherazade New | Traditional Naskh | ✅ Free | 400–700 | Good for diacritical-heavy Quran text; too traditional for UI |
| Lalezar | Display Kufi | ✅ Free | 400 only | Decorative only — not suitable as body |

#### Latin Script Options (for `en` / `rw`)

| Font | Style | Google Fonts | Weights | Verdict |
|---|---|---|---|---|
| **Cormorant Garamond** | Elegant serif | ✅ Free | 300–700 | **Best for display headings** — editorial luxury, resonates with Islamic manuscript aesthetic |
| **Plus Jakarta Sans** | Humanist sans | ✅ Free | 200–800 | **Best for body** — warm, modern, excellent on screen, replaces Inter |
| DM Serif Display | Modern serif | ✅ Free | 400 | Good display alternative — cleaner than Cormorant |
| Playfair Display | Editorial serif | ✅ Free | 400–900 | Solid — slightly overused in "premium" sites |
| Inter | Neutral sans | ✅ Free | 100–900 | Current — excellent readability but zero cultural warmth |

---

## 3. Recommended Typography System

### Core Principle
> **Display (headings, hero):** classical elegance that echoes Islamic manuscript tradition  
> **Body (paragraphs, forms, UI):** clean humanist warmth for readability  
> **Arabic:** Amiri for elevation, Noto Naskh for reading

### 3.1 Final Font Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  LOCALE: en / rw  (LTR)                                         │
│                                                                 │
│  Display / H1–H2:   Cormorant Garamond  (weights 500, 600, 700) │
│  Body / H3–H6 / UI: Plus Jakarta Sans   (weights 400, 500, 600) │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  LOCALE: ar  (RTL)                                              │
│                                                                 │
│  Display / H1–H2:   Amiri               (weights 400, 700)      │
│  Body / H3–H6 / UI: Noto Naskh Arabic   (weights 400, 500, 700) │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Why This Pairing Works

| Axis | Cormorant + Plus Jakarta | Amiri + Noto Naskh |
|---|---|---|
| Tonal register | Both have humanist warmth | Both are classical Naskh tradition |
| Contrast | High (serif + sans) — creates clear hierarchy | Medium (same script style) — natural reading flow |
| Cultural signal | Manuscript elegance for Islamic context | Directly from Arabic typographic heritage |
| Google Fonts | Both free, variable weight | Both free, multiple weights |
| Screen legibility | Excellent at 16px+ body | Excellent at 16–18px+ body |

### 3.3 Type Scale (CSS Custom Properties)

```
--text-xs:   0.75rem   / 12px  — captions, metadata
--text-sm:   0.875rem  / 14px  — labels, secondary text
--text-base: 1rem       / 16px  — body copy
--text-lg:   1.125rem  / 18px  — lead paragraph, card body
--text-xl:   1.25rem   / 20px  — H4, section subheads
--text-2xl:  1.5rem    / 24px  — H3
--text-3xl:  1.875rem  / 30px  — H2
--text-4xl:  2.25rem   / 36px  — H1 (mobile)
--text-5xl:  3rem       / 48px  — H1 (desktop)
--text-6xl:  3.75rem   / 60px  — Hero headline
```

Arabic body minimum: `--text-base` = `1rem` (16px). Headings can go smaller in px because Amiri renders larger optically.

---

## 4. Implementation Plan

### Step 1 — Update `next/font/google` imports in `layout.tsx`

**File:** [apps/frontend/src/app/[locale]/layout.tsx](apps/frontend/src/app/%5Blocale%5D/layout.tsx)

Replace `Inter` with `Plus_Jakarta_Sans` + add `Cormorant_Garamond` and `Amiri`:

```tsx
import {
  Cormorant_Garamond,
  Plus_Jakarta_Sans,
  Amiri,
  Noto_Naskh_Arabic,
} from 'next/font/google';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
});

const amiri = Amiri({
  subsets: ['arabic'],
  variable: '--font-arabic-display',
  weight: ['400', '700'],
  display: 'swap',
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic-body',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
```

Apply all four CSS variables to `<html>`:

```tsx
const fontClasses = isRtl
  ? `${amiri.variable} ${notoNaskhArabic.variable}`
  : `${cormorant.variable} ${plusJakarta.variable}`;

return (
  <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className={fontClasses}>
    <body className={isRtl ? 'font-arabic-body' : 'font-body'}>
```

---

### Step 2 — Update `tailwind.config.ts` fontFamily

**File:** [apps/frontend/tailwind.config.ts](apps/frontend/tailwind.config.ts)

```ts
fontFamily: {
  display:       ['var(--font-display)', 'Georgia', 'serif'],
  body:          ['var(--font-body)', 'system-ui', 'sans-serif'],
  'arabic-display': ['var(--font-arabic-display)', 'serif'],
  'arabic-body':    ['var(--font-arabic-body)', 'serif'],
  sans:          ['var(--font-body)', 'system-ui', 'sans-serif'],   // Tailwind default fallback
},
```

---

### Step 3 — CSS base layer rules in `globals.css`

```css
@layer base {
  /* Latin locales */
  h1, h2 {
    font-family: var(--font-display), Georgia, serif;
  }
  h3, h4, h5, h6, body, p, a, button, input, label {
    font-family: var(--font-body), system-ui, sans-serif;
  }

  /* Arabic locale overrides */
  [dir="rtl"] h1,
  [dir="rtl"] h2 {
    font-family: var(--font-arabic-display), serif;
    font-size: 1.1em;           /* optical size correction */
    line-height: 1.5;
    letter-spacing: 0;          /* NEVER add letter-spacing to Arabic */
  }
  [dir="rtl"] h3,
  [dir="rtl"] h4,
  [dir="rtl"] h5,
  [dir="rtl"] h6,
  [dir="rtl"] body,
  [dir="rtl"] p,
  [dir="rtl"] a,
  [dir="rtl"] button,
  [dir="rtl"] input,
  [dir="rtl"] label {
    font-family: var(--font-arabic-body), serif;
    font-size: 1.0625rem;       /* 17px — Arabic glyphs render smaller */
    line-height: 1.9;           /* Arabic needs more leading */
    letter-spacing: 0;
  }
}
```

---

### Step 4 — Tailwind utility classes for explicit overrides

Use these classes in components where heading vs body distinction must be explicit:

```
font-display          → Cormorant Garamond (en/rw headings)
font-body             → Plus Jakarta Sans (en/rw body)
font-arabic-display   → Amiri (ar headings)
font-arabic-body      → Noto Naskh Arabic (ar body)
```

Example hero heading:

```tsx
<h1 className="font-display text-5xl font-semibold leading-tight text-gradient-gold">
  {t('hero.title')}
</h1>
```

Example Quran verse (always Arabic regardless of locale):

```tsx
<p className="font-arabic-display text-2xl text-center leading-loose" dir="rtl" lang="ar">
  ﴿بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ﴾
</p>
```

---

### Step 5 — VerseOfDay component hardcoded Arabic font

The Verse of Day component should always render the Arabic verse with `Amiri` regardless of the active locale:

```tsx
// Always Amiri for Quran text — sacred text gets the display Arabic font
<p
  className="font-arabic-display text-2xl leading-loose text-center"
  dir="rtl"
  lang="ar"
>
  {verse.arabic}
</p>
```

---

### Step 6 — Performance: font-display and subset optimization

All four fonts use `display: 'swap'` (already correct in Next.js font API) to prevent invisible text during load. The `subsets` declarations limit download to only the needed character ranges.

Approximate WOFF2 bundle impact:
| Font | Subset | Approx size |
|---|---|---|
| Cormorant Garamond (500,600,700) | latin | ~42 KB |
| Plus Jakarta Sans (400,500,600) | latin | ~38 KB |
| Amiri (400,700) | arabic | ~85 KB |
| Noto Naskh Arabic (400,500,600,700) | arabic | ~95 KB |
| **Total** | | **~260 KB** |

Next.js auto-hosts all Google Fonts locally (no third-party network request) — all four will be served from `/_next/static/media/`.

---

## 5. Component Usage Guide

| Component | Latin heading class | Latin body class | Arabic heading | Arabic body |
|---|---|---|---|---|
| Hero `h1` | `font-display text-6xl font-semibold` | — | `font-arabic-display text-5xl` | — |
| Section title `h2` | `font-display text-3xl font-semibold` | — | `font-arabic-display text-3xl` | — |
| Card title `h3` | `font-display text-xl font-medium` | — | `font-arabic-display text-xl` | — |
| Body paragraph `p` | — | `font-body text-base` | — | `font-arabic-body text-base` |
| Nav links | — | `font-body text-sm font-medium` | — | `font-arabic-body text-sm` |
| Button text | — | `font-body text-sm font-semibold` | — | `font-arabic-body text-sm font-semibold` |
| Quran verse | — | — | `font-arabic-display text-2xl` (always `dir="rtl"`) | — |
| Form labels | — | `font-body text-sm font-medium` | — | `font-arabic-body text-sm` |
| Member ID card | `font-display` | `font-body` | `font-arabic-display` | `font-arabic-body` |

---

## 6. Visual Identity Rationale

```
Cormorant Garamond        →  "The wisdom of tradition"
  Thin strokes, bracketed serifs, ink-trap details
  → echoes the delicacy of Islamic manuscript illumination
  → signals authority, heritage, and learning

Plus Jakarta Sans         →  "Accessible modernity"
  Rounded terminals, generous x-height, open apertures
  → makes forms, dashboards, and navigation approachable
  → pairs with Cormorant without competing

Amiri                     →  "The classical Arabic voice"
  Naskh revival inspired by Bulaq Press (1820s Cairo)
  → same tradition as Al-Azhar printed Qurans
  → high contrast, full tashkeel support

Noto Naskh Arabic         →  "Universal clarity"
  Designed to harmonise with Noto Latin family
  → covers all Arabic Unicode including rarely-used diacritics
  → safe, battle-tested for UI and body text
```

---

## 7. Before / After Summary

| Element | Before | After |
|---|---|---|
| English hero heading | Inter 700 — generic tech | Cormorant Garamond 600 — editorial, elevated |
| English body | Inter 400 | Plus Jakarta Sans 400 — warmer, friendlier |
| Arabic heading | Noto Naskh Arabic 700 | Amiri 700 — classical manuscript authority |
| Arabic body | Noto Naskh Arabic 400 | Noto Naskh Arabic 400 — unchanged (already best) |
| Quran verse | Noto Naskh Arabic 400 | Amiri 400 — proper sacred text treatment |
| Cultural register | Neutral/tech | Islamic heritage + modern readability |

---

*Sources:*
- [Top 10 Arabic Fonts on Google Fonts — Hashnode](https://mohdahsanrazakhan.hashnode.dev/top-10-arabic-google-fonts-for-modern-designers)
- [10 Arabic Fonts Every UX Designer Should Know in 2025 — Ahmed Elramlawy](https://ahmedelramlawy.com/10-arabic-fonts-every-ux-designer-should-know-in-2025/)
- [Arabic RTL Web Design Best Practices — Bycom Solutions](https://bycomsolutions.com/blog/arabic-rtl-web-design-best-practices/)
- [Considerations for Multilingual Website Fonts — CSS-Tricks](https://css-tricks.com/considerations-when-choosing-fonts-for-a-multilingual-website/)
- [Amiri on Google Fonts](https://fonts.google.com/specimen/Amiri)
- [Cairo on Google Fonts](https://fonts.google.com/specimen/Cairo)
- [Noto Naskh Arabic on Google Fonts](https://fonts.google.com/noto/specimen/Noto+Naskh+Arabic)
- [25 Best Arabic Fonts — Designbeep](https://designbeep.com/2025/07/30/arabic-fonts/)
- [44 Beautiful Arabic Fonts — Design Work Life](https://designworklife.com/beautiful-arabic-fonts-that-capture-middle-eastern-elegance/)
- [Arabic Typography Trends 2025](https://arabic-calligraphy-generator.com/guides/arabic-typography-trends-2025)
