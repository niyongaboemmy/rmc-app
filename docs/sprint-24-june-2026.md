# Sprint — 18–24 June 2026
**Deadline:** Wednesday, 24 June 2026  
**Source:** Stakeholder review session — 18 June 2026  
**Developers:** Emmy · Eric · Jacques

---

## How to read this document

Each developer owns a group. Items marked **⚡ Quick Win** are expected under 2 hours each — do these first. Items marked **🔴 High** are required for the deadline. Items marked **🟡 Medium** ship if time allows. Items marked **⛔ Blocked** need a client answer before touching code.

---

## 👩‍💻 Emmy — UI / UX Fixes & Homepage

> Focus: visual polish, responsive layout, homepage surface improvements.

---

### ⚡ #3 — Navbar: Increase Link Font Size + Logo Size
**File:** [apps/frontend/src/components/layout/Navbar.tsx](../apps/frontend/src/components/layout/Navbar.tsx)  
**Priority:** 🔴 High

- Change nav link classes from `text-sm` → `text-base` (or larger)
- Scale logo image/icon from `h-10 w-10` → `h-14 w-14` (or equivalent)

---

### ⚡ #4 — Hero Section: Text Legibility Over Excellence Photo
**File:** [apps/frontend/src/components/home/HeroSection.tsx](../apps/frontend/src/components/home/HeroSection.tsx)  
**Priority:** 🔴 High

- Add a stronger gradient overlay: `bg-gradient-to-r from-black/70`
- Add `drop-shadow` or `text-shadow` on the headline text
- Goal: headline must be clearly readable on top of the photo at all screen sizes

---

### ⚡ #1 — Blog: Reduce Hero / Header Height
**File:** [apps/frontend/src/app/[locale]/blog/page.tsx](../apps/frontend/src/app/[locale]/blog/page.tsx)  
**Priority:** 🔴 High

- Reduce the hero section from `min-h-[60vh]` (or similar) to `min-h-[35vh]` or `py-16`
- Content should be visible sooner on page load without scrolling

---

### #2 — Homepage: Equal-Height News & Events Cards
**File:** [apps/frontend/src/components/home/ActivitiesEventsSection.tsx](../apps/frontend/src/components/home/ActivitiesEventsSection.tsx)  
**Priority:** 🔴 High

- All cards in "Latest News" and "Events" subsections must be the same height
- Apply `h-full` on the card wrapper, flex-column layout, and `flex-grow` on the card body
- Test with cards that have varying content lengths

---

### #7 — Footer: Accordion / Breadcrumb Groups on Mobile
**File:** [apps/frontend/src/components/layout/Footer.tsx](../apps/frontend/src/components/layout/Footer.tsx)  
**Priority:** 🟡 Medium

- On mobile (`< md`), group footer links into collapsible accordion sections
- Each section heading (Services, Resources, About, etc.) becomes a toggle
- On desktop the layout stays unchanged (flat columns)
- Use a simple local `useState` toggle — no external library needed

---

### #8 — Show Tenders on Homepage
**Files:**
- New: [apps/frontend/src/components/home/TendersSection.tsx](../apps/frontend/src/components/home/TendersSection.tsx)
- Edit: [apps/frontend/src/app/[locale]/page.tsx](../apps/frontend/src/app/[locale]/page.tsx)

**Priority:** 🔴 High  
**Backend dependency:** Jacques adds `type` filter to announcements (or a dedicated endpoint) — coordinate timing.

- Show the latest 3 open tenders: title, deadline, short description
- Include a "View All Tenders" link at the bottom
- While Jacques's backend work is pending, wire up with a mock / empty state first

---

### #15 — Find Nearest Mosque Widget on Homepage
**Files:**
- New: [apps/frontend/src/components/home/FindMosqueWidget.tsx](../apps/frontend/src/components/home/FindMosqueWidget.tsx)
- Reference existing: [apps/frontend/src/app/[locale]/contact/page.tsx](../apps/frontend/src/app/[locale]/contact/page.tsx)

**Priority:** 🟡 Medium

- Add a compact "Find a mosque near you" CTA section on the homepage
- Clicking it links/scrolls to the full MosqueFinder on the Contact page
- Optional: embed a mini province/district dropdown that pre-fills the search

---

### ⚡ #17 — Add Islamic Radio Link (ijwi)
**Files:**
- [apps/frontend/src/components/layout/Navbar.tsx](../apps/frontend/src/components/layout/Navbar.tsx)
- [apps/frontend/src/components/layout/Footer.tsx](../apps/frontend/src/components/layout/Footer.tsx)

**Priority:** Low  
**⛔ Blocked:** Confirm the stream URL with the client before adding the link.

- Add a radio icon link in the footer (and optionally the navbar)
- Link opens the stream in a new tab with `rel="noopener noreferrer"`
- Do not implement a player yet — a plain link is enough for this sprint

---

## 👨‍💻 Eric — Content, New Pages & Donation Features

> Focus: rename/rebranding tasks, donation flow, new content pages.

---

### ⚡ #5 — Rename "Hijra Support" → "Hija Services"
**Files to update:**
- All files under `apps/frontend/src/` (grep for `Hijra Support` and `hijra_support`)
- [apps/frontend/src/messages/en.json](../apps/frontend/src/messages/en.json)
- [apps/frontend/src/messages/rw.json](../apps/frontend/src/messages/rw.json)
- [apps/frontend/src/messages/ar.json](../apps/frontend/src/messages/ar.json)

**Priority:** 🔴 High

```bash
grep -r "Hijra Support\|hijra_support\|hijra-support" apps/frontend/src/
```

- Rename in: nav links, page titles, translation keys, service cards, route slugs if any
- Update all three locale JSON files with the new name

---

### ⚡ #6 — RMC Statistics Section: Rename
**File:** [apps/frontend/src/components/home/StatsSection.tsx](../apps/frontend/src/components/home/StatsSection.tsx)  
**Priority:** 🔴 High  
**⛔ Blocked:** Confirm final name with client. Suggested options: "Our Impact", "RMC in Numbers", "Community Reach".

- Update the section heading in the component
- Update the matching key in all three locale JSON files (`en`, `rw`, `ar`)

---

### #18 — Complete i18n Translations (all locales)
**Files:**
- [apps/frontend/src/messages/en.json](../apps/frontend/src/messages/en.json)
- [apps/frontend/src/messages/rw.json](../apps/frontend/src/messages/rw.json)
- [apps/frontend/src/messages/ar.json](../apps/frontend/src/messages/ar.json)

**Priority:** 🔴 High

- Audit `rw.json` and `ar.json` for any keys present in `en.json` but missing or still in English
- Fill in Kinyarwanda and Arabic translations for all missing keys
- **Priority order:** homepage → donate → about → services → blog

---

### #9 — Donation: Subcategories + Category Details Page
**Files:**
- New: [apps/frontend/src/app/[locale]/donate/[categorySlug]/page.tsx](../apps/frontend/src/app/[locale]/donate/)
- New: [apps/frontend/src/components/donate/DonationCategoryDetail.tsx](../apps/frontend/src/components/donate/)
- New: [apps/frontend/src/components/donate/DonationSubcategoryList.tsx](../apps/frontend/src/components/donate/)
- New: [apps/frontend/src/components/donate/PaymentMethodSelector.tsx](../apps/frontend/src/components/donate/)
- Edit: [apps/frontend/src/components/donate/DonatePageClient.tsx](../apps/frontend/src/components/donate/DonatePageClient.tsx)

**Priority:** 🔴 High  
**⛔ Blocked (partially):** Revenue share model (#20) must be confirmed before implementing the payment submit step. Build the UI up to payment selection; leave the submit wired to a placeholder.  
**Backend dependency:** Jacques adds `donation_subcategories` table and `description`/`rich_content` fields to `donation_categories`.

- Each category card on the donate page links to `/donate/[categorySlug]`
- Category detail page shows: full description, rich-text content, subcategory list, payment method selector, amount input
- Use a rich text renderer for `rich_content` (TipTap viewer or `react-quill` display mode — read-only, no editor)

---

### #13 — Becoming Muslim: Complete Guide Page
**File:** New — [apps/frontend/src/app/[locale]/new-muslim/page.tsx](../apps/frontend/src/app/[locale]/new-muslim/)  
**Priority:** 🔴 High

Build a structured, scrollable page with these sections:

| Section | Content |
|---|---|
| Introduction | Short explanation + intro video embed (YouTube `<iframe>`) |
| Steps to Become Muslim | Numbered step-by-step guide with icon/visual per step |
| Learning Centers | List/map of centers filterable by gender and province |
| Learn to Pray | Written guide + link to nearest mosque or learning center |
| By Gender | Separate resource blocks for men and women |
| E-books & E-learning | Downloadable PDF links + external learning portal links |

- Add the page to the main nav under "Services" or as a standalone "Become Muslim" link
- All external links must use `target="_blank" rel="noopener noreferrer"`

---

### #12 — About Us: RMC History Timeline
**Files:**
- New: [apps/frontend/src/components/about/HistoryTimeline.tsx](../apps/frontend/src/components/about/)
- Edit: [apps/frontend/src/app/[locale]/about/page.tsx](../apps/frontend/src/app/[locale]/about/page.tsx)

**Priority:** 🟡 Medium  
**Backend dependency:** Jacques adds the `history_entries` table and endpoint.

- Add a "Our History" section within the About page (anchor: `#history`)
- Timeline layout: alternating left/right on desktop, vertical on mobile
- Each entry: year, title, short description, image (zoom/modal on click)
- While backend is pending, use hardcoded placeholder data — swap to API once ready

---

### #16 — Find Islamic Schools Page
**Files:**
- New: [apps/frontend/src/app/[locale]/schools/page.tsx](../apps/frontend/src/app/[locale]/schools/)
- New: [apps/frontend/src/components/schools/SchoolFinder.tsx](../apps/frontend/src/components/schools/)

**Priority:** 🟡 Medium  
**Backend dependency:** Jacques creates the `islamic_schools` table and GET endpoint.

- Searchable and filterable list of Islamic schools (Quran schools, madrasas)
- Filters: province, district
- Each entry: school name, location, contact info
- Build the UI shell and connect once Jacques's endpoint is ready

---

## 👨‍💻 Jacques — Backend, Map, Certificate & Integrations

> Focus: backend schema changes, mosque map enrichment, certificate workflow, integration scaffold.

---

### #11 — Mosque Map: Show Imam + Full Info on Marker Click
**File:** [apps/frontend/src/components/contact/MosqueMap.tsx](../apps/frontend/src/components/contact/MosqueMap.tsx)  
**Priority:** 🔴 High  
**Backend:** `GET /mosques/:id` and `GET /mosques/:id/imams` already exist — use them.

- On marker click: fetch full mosque detail (`GET /mosques/:id`) + imams (`GET /mosques/:id/imams`)
- Popup/sidebar must display:
  - Mosque name + address / district
  - Imam name and photo (if available)
  - Imam phone (if `is_public = true`)
  - Prayer time offset
  - Branch count
  - "View full profile" link
- Show a loading skeleton while fetching; graceful empty state if no imam assigned

---

### #10 — Area of Intervention: Details Page
**Files:**
- New: [apps/frontend/src/app/[locale]/areas/[slug]/page.tsx](../apps/frontend/src/app/[locale]/areas/)
- New: [apps/frontend/src/components/areas/AreaDetails.tsx](../apps/frontend/src/components/areas/)
- Edit existing admin: [apps/frontend/src/app/[locale]/admin/content/areas/page.tsx](../apps/frontend/src/app/[locale]/admin/content/areas/page.tsx)

**Priority:** 🔴 High  
**Backend:** Add `rich_content` (jsonb), `administrative_description` (text), `image_keys` (text[]) columns to the areas/interventions table. Create the migration. Expose via `GET /areas/:slug`.

- Each area card on the homepage links to `/areas/[slug]`
- Detail page renders the rich content + image gallery
- Extend the admin editor to support uploading images and editing rich content for each area

---

### #14 — Certificate Approval Process: Nikah Flow
**Files:**
- Extends: [apps/frontend/src/app/[locale]/services/marriage/](../apps/frontend/src/app/[locale]/services/marriage/)
- Verification reference: [apps/frontend/src/app/[locale]/certificates/[number]/page.tsx](../apps/frontend/src/app/[locale]/certificates/)

**Priority:** 🔴 High

Four roles involved: **Umugeni** (bride) · **Umugabo we** (groom) · **Uwatanze umugeni** (wali/guardian) · **Imam** (officiating).

Backend work:
- Extend the marriage application table with a `certificate_status` and per-party confirmation fields
- API endpoints: submit confirmation per party, Imam issues final certificate
- Notification (email/SMS) to each party when it's their turn to confirm

Frontend work:
- Multi-step application form collecting info from all four parties
- Status tracking page: shows who has confirmed and who is pending
- Imam admin view: review all confirmations, issue certificate, download PDF

---

### Backend Schema Tasks (for Eric's features)

**For #9 Donation subcategories:**
```sql
-- Add to donation_categories
ALTER TABLE donation_categories
  ADD COLUMN description TEXT,
  ADD COLUMN rich_content JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN image_key VARCHAR(255);

-- New table
CREATE TABLE donation_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES donation_categories(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  target_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**For #12 History timeline (About page):**
```sql
CREATE TABLE history_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year SMALLINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  image_key VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**For #8 Tenders (Emmy's homepage section):**
- Add `type VARCHAR(20) DEFAULT 'announcement'` to the `announcements` table
- Add `deadline DATE` column to `announcements`
- Expose `GET /announcements?type=tender&limit=3` endpoint

**For #16 Islamic schools (Eric's page):**
```sql
CREATE TABLE islamic_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50),  -- 'quran_school' | 'madrasa' | 'other'
  province_id UUID REFERENCES provinces(id),
  district_id UUID REFERENCES districts(id),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> Create **one migration file** covering all four schema changes above: `013-sprint-june-2026`

---

### #21 — Integrations: Scaffold Module
**Location:** [apps/backend/src/integrations/](../apps/backend/src/integrations/)  
**Priority:** 🔴 High

Create a NestJS `IntegrationsModule` with sub-modules per provider. This sprint: scaffold + stub only — no live credentials yet.

```
src/integrations/
  integrations.module.ts
  mtn-momo/
    mtn-momo.service.ts      # initiate payment, check status
    mtn-momo.dto.ts
  email/
    email.service.ts          # replace MailHog stub with SendGrid / AWS SES
    email.module.ts
  sms/
    sms.service.ts            # Rwanda gateway (Infobip or RwandaTel)
    sms.module.ts
```

- Wire `EmailService` into the existing auth and marriage notification flows
- Leave MoMo and SMS as stubs with `TODO` comments marking where credentials go
- Add env vars to `.env.example`: `MOMO_API_KEY`, `SENDGRID_API_KEY`, `SMS_API_KEY`

---

## Items Blocked / Not in This Sprint

| # | Item | Reason |
|---|---|---|
| 20 | Donate: review revenue share model | Client must confirm fee % before payment submit is built |
| 17 | Islamic Radio link | Need stream URL from client |
| 6 | RMC Statistics rename | Need final name confirmed by client |
| 19 | Library menu — books | Backlog — out of scope for this deadline |

---

## Coordination Notes

- **Emmy ↔ Jacques** on #8 (Tenders): Emmy builds the frontend component first with mock data; Jacques delivers the backend endpoint by **Tuesday 23 June**.
- **Eric ↔ Jacques** on #9 (Donations): Jacques delivers the `donation_subcategories` migration and endpoint by **Monday 22 June** so Eric can wire up the category detail page.
- **Eric ↔ Jacques** on #12 and #16: Same pattern — Jacques ships the schema + endpoint, Eric builds the page UI.
- All new backend routes must follow the existing `GET /api/v1/...` pattern and return paginated responses where lists are involved.
- All new frontend pages must be wrapped in the `[locale]` segment and use `useTranslations()` — no hardcoded English strings.
