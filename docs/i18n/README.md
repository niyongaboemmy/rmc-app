# Dawah — translation debt

Audited 16 July 2026 against the running app.

The Dawah feature is the **only** part of the platform substantially missing
Kinyarwanda. Every other namespace sits between 83% and 100%; `dawah` sits at **3%** —
6 menu strings were translated on 16 July, and the Discussions feature (17 July) added
27 more English placeholders, so the debt grew before it shrank. 352 strings are queued
in `dawah-rw.csv`. Inside admin the contrast is sharper still — `admin.dawah.*` is 239/239
untranslated while the rest of admin is 6/387, so **Dawah is 97% of all untranslated
admin strings**. A Kinyarwanda speaker gets a Kinyarwanda site right up until they open
Dawah, and then everything turns to English.

> **Already translated (16 July), do not redo:** `nav.dawahMenu.overview` ·
> `nav.dawahMenu.overviewDesc` · `dawah.courses.title` · `dawah.courses.subtitle` ·
> `dawah.library.title` · `dawah.library.subtitle`. These were done by Claude, not a
> native speaker — see *Terminology* below. They are worth a review pass.

### Terminology

Taken from the existing `rw.json` rather than invented, so the Dawah pages match the
rest of the app:

| English | Kinyarwanda | precedent |
|---|---|---|
| Overview | `Incamake` | `admin.funeral.tabs.overview` |
| Courses / lessons | `Amasomo` | `about.activities.hifdh.text` |
| books | `ibitabo` | `donate.categories.school.desc` |
| Library | `Isomero` | none — no prior use in the catalogue |

**`Islamic` has no house form yet.** The catalogue currently uses `Islamu` (6 uses),
`Isilamu` (5) and `Islamimu` (4) interchangeably, plus `Abayisilamu` for *Muslims*.
The Dawah strings follow the `donate` precedent (`"uburezi bw'Islamu"` → `"ibitabo
by'Islamu"`), but **RMC should pick one form and normalise the whole catalogue** —
that is a decision for them, not a translator's judgement call.

Arabic is in good shape: the UI is 99% translated (the one "untranslated" string is
`PDF`, an acronym), and courses and categories have Arabic content. **Books are the
exception — no book has any Arabic or Kinyarwanda at all**, so the Arabic library page
renders Arabic chrome around English book titles.

There are two separate gaps, and they are fixed in two different places.

---

## 1. UI strings → `dawah-rw.csv`

352 interface strings (buttons, labels, headings, empty states). These live in the
message catalogues and need a translator.

**For the translator**

Open `dawah-rw.csv` in Excel, Google Sheets, or LibreOffice. It is UTF-8 with a BOM,
so Excel opens it correctly with no import dance.

| column | what to do |
|---|---|
| `key` | **Do not touch.** It is how the text is wired to the app. |
| `area` | Where it appears — `Public — Dawah`, `Public — Discussions`, `Admin — Dawah`, or `Navbar`. |
| `english` | **Do not touch.** The source text. |
| `kinyarwanda` | **Type the translation here.** Leave blank if unsure — blanks are skipped safely. |
| `notes` | Warnings. Read them. |

Two rules that matter more than they look:

1. **Keep `{placeholders}` exactly as written** — 15 rows have them, including ICU
   plurals like `{count, plural, ...}` in Discussions, where the *structure* matters as
   much as the token. `Uploading… {pct}%`
   must keep `{pct}` spelled that way. Translate the words around it, never the token
   inside the braces. A renamed placeholder throws an error in the reader's face at
   runtime, not at build time.
2. **`Dawah` and `PDF` can stay as they are** if they do not translate naturally. The
   `notes` column flags them.

Partial work is fine. Fill in 20 rows, send it back, fill in more later — the merge
only applies non-blank rows and never overwrites what is already translated.

**For the engineer, merging it back**

```bash
node scripts/i18n-merge-rw.mjs docs/i18n/dawah-rw.csv           # dry run — shows what would change
node scripts/i18n-merge-rw.mjs docs/i18n/dawah-rw.csv --write   # apply to rw.json
```

The script refuses to write anything unless every row passes. It rejects:

- a **lost or renamed ICU placeholder** (the runtime-error case above),
- a row whose **English has changed since the export** — meaning the translator worked
  from a stale file and the translation may no longer mean the right thing,
- a **key that no longer exists** in `en.json`.

Blank rows and rows still identical to English are skipped, not written.

After merging, re-run the audit below to confirm the number moved.

---

## 2. Content → the admin UI, not a CSV

Course titles, book titles, category names and their descriptions are **content an
admin typed**, not interface strings. They live in tri-lingual database columns
(`title_en` / `title_rw` / `title_ar`) and are edited in the admin UI, which already has
EN/RW/AR tabs on every form. Descriptions are rich HTML, so a CSV round-trip would
mangle them — do these in the app.

When a language is empty the page falls back to English on purpose: an English title a
reader can act on beats a blank card.

### What is missing

**Books — `/admin/dawah/library`** (needs both `rw` **and** `ar`; nothing is translated)

- adult-children-of-emotionally-immature-parents
- how-to-become-a-muslim
- members-only-book
- members-with-excerpt
- no-download-allowed
- the-public-reader

**Courses — `/admin/dawah/courses`** (Arabic is done; needs `rw`)

- aqeedah-the-pillars-of-faith
- arabic-for-beginners
- arabic-grammar-nahw
- building-a-muslim-home
- fiqh-of-transactions
- forty-hadith-of-an-nawawi
- foundations-of-quran-recitation
- introduction-to-the-fiqh-of-worship
- raising-children-in-faith
- sciences-of-hadith
- seerah-the-madinan-period
- seerah-the-makkan-period
- tajweed-ii-the-rules-of-madd

**Categories — `/admin/dawah/categories`** (Arabic is done; needs `rw`)

- aqeedah, arabic-language, family-life, fiqh, hadith, new-muslims, quran-studies, seerah

> `secret-draft-course` is a test fixture, not real content. Ignore it, or delete it.

---

## Re-running the audit

Prints per-namespace coverage for both non-English locales. Dawah should climb off 0%.

```bash
cd apps/frontend && python3 - <<'PY'
import json
def flat(o,p=''):
    out={}
    for k,v in o.items():
        key=f'{p}.{k}' if p else k
        out.update(flat(v,key) if isinstance(v,dict) else {key:v})
    return out
M={l: flat(json.load(open(f'src/messages/{l}.json'))) for l in ['en','rw','ar']}
for ns in sorted({k.split('.')[0] for k in M['en']}):
    ks=[k for k in M['en'] if k.split('.')[0]==ns and str(M['en'][k]).strip()]
    if len(ks)<5: continue
    pct=lambda l: round(100*sum(1 for k in ks if str(M[l].get(k,'')).strip()!=str(M['en'][k]).strip())/len(ks))
    print(f'{ns:<20}{len(ks):>5} keys   rw {pct("rw"):>3}%   ar {pct("ar"):>3}%')
PY
```

## What was already verified (16 July 2026)

These passed against the running app and need no work:

- Key parity across en/rw/ar — 0 missing, 0 extra in `dawah`, `admin.dawah`, `nav`.
- 15 page loads (every Dawah page × 3 locales) — no `MISSING_MESSAGE`, no `IntlError`,
  no raw keys leaking into the UI.
- `dir` / `lang` correct — Arabic renders `rtl`.
- No hardcoded user-visible strings; every label goes through `t()` or is API content.
- No physical CSS side-properties — all logical (`ps`/`pe`/`start`/`end`), so RTL flips.
- Locale-aware formatting — `toLocaleDateString(locale)`, `Intl.NumberFormat(locale)`
  (Arabic yields `1.2 ألف`, Kinyarwanda `1,2K`), durations via an ICU param.

**The code is correct. The catalogue is empty.** That is the whole finding.
