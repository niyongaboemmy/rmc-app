# RMC Presentation Feedback — 18 June 2026

**Deadline:** Wednesday 24 June 2026 (kuwa 3)  
**Source:** Client/stakeholder review session after demo

---

## Summary by Priority

| # | Item | Type | Priority | Status |
|---|------|------|----------|--------|
| 1 | Blog: reduce hero/header height | UI Fix | High | Todo |
| 2 | Homepage: latest news & events — equal height cards | UI Fix | High | Todo |
| 3 | Navbar: increase link font size and logo icon size | UI Fix | High | Todo |
| 4 | Hero section: text legible over excellence photo | UI Fix | High | Todo |
| 5 | Hijra Support → rename to Hija Services | Content | High | Todo |
| 6 | RMC Statistics section — rename | Content | High | Todo |
| 7 | Footer: breadcrumb-style grouping on mobile | UI Fix | Medium | Todo |
| 8 | Show tenders on homepage | Feature | High | Todo |
| 9 | Donation: subcategories + category details page | Feature | High | Todo |
| 10 | Area of Intervention: add details page | Feature | High | Todo |
| 11 | Map: show Imam + main info when mosque selected | Feature | High | Todo |
| 12 | About Us: RMC history timeline with interactive images | Feature | Medium | Todo |
| 13 | Becoming Muslim — complete guide/flow page | Feature | High | Todo |
| 14 | Certificate approval process flow (nikah roles) | Feature | High | Todo |
| 15 | Find nearest mosque (homepage/dedicated) | Feature | Medium | Todo |
| 16 | Find Islamic schools | Feature | Medium | Todo |
| 17 | Add Islamic Radio link (ijwi) | Feature | Low | Todo |
| 18 | Complete i18n translations (all locales) | Content | High | Todo |
| 19 | Library menu — books | Future | Low | Backlog |
| 20 | Donate: review revenue share model | Business | Medium | Todo |
| 21 | Start working on integrations | Backend | High | Todo |

---

## Detailed Breakdown

### 1. UI/UX Fixes

#### 1.1 Blog — Reduce Hero Height
- **File:** `apps/frontend/src/app/[locale]/blog/page.tsx`
- **What:** The main blog page hero/banner section is too tall. Reduce its `min-h` / padding so content is reached sooner.
- **Target:** Reduce from likely `min-h-[60vh]` or similar to around `min-h-[35vh]` or a fixed `py-16`.

#### 1.2 Homepage — Latest News & Events: Equal Card Heights
- **File:** `apps/frontend/src/components/home/ActivitiesEventsSection.tsx`
- **What:** Cards in the "Latest" and "Events" subsections must share the same uniform height. Use `h-full` + flex column layout with `flex-grow` on the card body so all cards stretch equally.

#### 1.3 Navbar — Increase Link Font Size and Logo Icon Size
- **File:** `apps/frontend/src/components/layout/Navbar.tsx`
- **What:** Nav links appear too small. Increase link font from `text-sm` → `text-base` (or larger). Logo icon/image should also be scaled up (e.g., `h-10 w-10` → `h-14 w-14` or equivalent).

#### 1.4 Hero Section — Text Legibility over Excellence Photo
- **File:** `apps/frontend/src/components/home/HeroSection.tsx`
- **What:** The text overlay on the president/excellence photo is hard to read. Fix by:
  - Adding a stronger gradient overlay (`bg-gradient-to-r from-black/70`)
  - Or applying `drop-shadow` / `text-shadow` on the headline
  - Or placing text on a semi-transparent pill/panel

#### 1.5 Footer — Breadcrumb Grouped Menus on Mobile
- **File:** `apps/frontend/src/components/layout/Footer.tsx`
- **What:** On mobile, footer links should be grouped into collapsible accordion sections (breadcrumb-style) instead of a flat list. Each section (Services, Resources, About, etc.) becomes a toggle that expands its links.

---

### 2. Content / Naming Changes

#### 2.1 "Hijra Support" → "Hija Services"
- **Files to search:** `apps/frontend/src/` — grep for `Hijra Support` or `hijra_support`
- Also check translation files: `apps/frontend/src/messages/en.json`, `rw.json`, `ar.json`
- **What:** Rename everywhere — nav links, page titles, translation keys, service cards.

#### 2.2 RMC Statistics Section — Rename
- **File:** `apps/frontend/src/components/home/StatsSection.tsx`
- **What:** The section label "RMC Statistics" needs a new name. Suggested options (confirm with client): "Our Impact", "RMC in Numbers", "Community Reach", or the Kinyarwanda/Arabic equivalent.
- Update translation keys in all three locale files accordingly.

#### 2.3 Complete i18n Translations
- **Files:** `apps/frontend/src/messages/rw.json`, `ar.json`, `en.json`
- **What:** All strings currently in English only must have Kinyarwanda (`rw`) and Arabic (`ar`) translations. Audit each messages file for missing keys and fill them in.
- Priority: public-facing pages first (homepage, donate, about, services, blog).

---

### 3. Homepage Additions

#### 3.1 Show Tenders on Homepage
- **Files:**
  - New component: `apps/frontend/src/components/home/TendersSection.tsx`
  - Homepage: `apps/frontend/src/app/[locale]/page.tsx`
- **What:** Add a "Tenders / Calls for Applications" section on the homepage. Show the latest 3 open tenders with title, deadline, and a "View All" link. Tenders data can come from a new backend endpoint or reuse the announcements module with a `type = tender` filter.
- **Backend:** Add `type` field to announcements or create a dedicated `tenders` table/module.

#### 3.2 Find Nearest Mosque
- **Files:**
  - `apps/frontend/src/components/home/` — new `FindMosqueWidget.tsx`
  - Or link to existing `apps/frontend/src/app/[locale]/contact/page.tsx` (MosqueFinder already exists there)
- **What:** Surface the mosque finder on the homepage — either a mini location-based widget ("Find a mosque near you") with a CTA to the full map, or embed the MosqueFinder component directly.

#### 3.3 Find Islamic Schools
- **Files:**
  - New page: `apps/frontend/src/app/[locale]/schools/page.tsx`
  - New component: `apps/frontend/src/components/schools/SchoolFinder.tsx`
- **What:** A searchable/filterable list of Islamic schools (Quran schools, madrasas) with name, location (province/district), contact. Backend: new `islamic_schools` table or extend existing schools schema from Phase 1.

---

### 4. Donation — Category Details & Subcategories

**Current state:** `apps/frontend/src/components/donate/DonatePageClient.tsx` — shows top-level categories.

**Requested changes:**
1. Each donation category must have **subcategories** (list of specific activities/projects you can support).
2. Clicking a category → **category details page** with:
   - Full description
   - Rich-text content (with images) — use a rich text renderer (e.g., TipTap viewer or `react-quill` display)
   - List of subcategories/activities
   - Payment method selection
   - Amount entry + submit

**New files needed:**
- `apps/frontend/src/app/[locale]/donate/[categorySlug]/page.tsx` — category details page
- `apps/frontend/src/components/donate/DonationCategoryDetail.tsx`
- `apps/frontend/src/components/donate/DonationSubcategoryList.tsx`
- `apps/frontend/src/components/donate/PaymentMethodSelector.tsx`

**Backend:**
- `donation_categories` table: add `description` (text), `rich_content` (jsonb), `image_key` (varchar)
- New `donation_subcategories` table: `id`, `category_id` (FK), `name`, `description`, `target_amount`
- Admin pages: rich editor for category content at `apps/frontend/src/app/[locale]/admin/donations/page.tsx`

**Business note:** Client flagged checking revenue share model — confirm whether RMC takes a platform fee % on donations and document it before implementing payment flow.

---

### 5. Area of Intervention — Details Page

**Current state:** `apps/frontend/src/components/home/AreasOfInterventionSection.tsx` — shows cards without drilldown.

**What:** Each area of intervention (e.g., Education, Health, Social Welfare) needs a dedicated details page managed from admin.

**New files:**
- `apps/frontend/src/app/[locale]/areas/[slug]/page.tsx`
- `apps/frontend/src/components/areas/AreaDetails.tsx`
- Admin: `apps/frontend/src/app/[locale]/admin/content/areas/page.tsx` (already exists — extend with rich editor)

**Backend:** Add `rich_content`, `administrative_description`, `image_keys` fields to areas/interventions table.

---

### 6. Mosque Map — Show Imam + Key Info on Selection

**Current state:** `apps/frontend/src/components/contact/MosqueMap.tsx` — clicking a mosque pin shows minimal info.

**What:** When a mosque marker is clicked, the popup/sidebar must display:
- Mosque name
- Address / district
- Imam name and photo (if available)
- Imam phone (if public)
- Prayer time adjustments (offset)
- Branch count
- Link to full mosque profile

**Backend:** `GET /mosques/:id` already returns imam data via `GET /mosques/:id/imams` — use this. Ensure the map component fetches full mosque detail on marker click.

---

### 7. About Us — RMC History Timeline

**Current state:** `apps/frontend/src/app/[locale]/about/page.tsx` with `ImageCarousel3D`.

**What:** Add a dedicated "History" section within About Us showing RMC's journey by year:
- Timeline layout (vertical or horizontal scroll)
- Each year: short description + interactive image (zoom/modal on click)
- Well designed — consider alternating left/right layout for desktop, vertical for mobile

**New component:** `apps/frontend/src/components/about/HistoryTimeline.tsx`  
**Admin:** New content section at `apps/frontend/src/app/[locale]/admin/content/about/page.tsx` for managing history entries (year, title, description, image).

---

### 8. Becoming Muslim — Complete Guide / New Muslim Flow

**What:** A full, structured page (possibly multi-step or scrollable sections) for people converting to Islam.

**Page:** `apps/frontend/src/app/[locale]/new-muslim/page.tsx`

**Sections to include:**

| Section | Content |
|---------|---------|
| Introduction | Explanation + intro video embed |
| Steps to Become Muslim | Step-by-step guide with visuals |
| Learning Centers | Map/list of centers — filterable by gender and province |
| Learn to Pray | Guide with nearest mosque link or learning center |
| By Gender | Separate resources/contacts for men and women |
| E-books & E-learning | Downloadable PDFs + links to external learning programs |

**Navigation:** Add this page to the main nav (possibly under "Services" or as a standalone "Become Muslim" link).

**External links:** Some content (deeper learning portals) can be external links — just ensure they open in a new tab with proper `rel="noopener noreferrer"`.

---

### 9. Certificate Approval Process — Nikah Flow

**Current state:** `apps/frontend/src/app/[locale]/certificates/[number]/page.tsx` — verification only.

**Requested:** A complete marriage certificate approval workflow with the following roles:
- **Umugeni** (bride)
- **Umugabo we** (groom)
- **Uwatanze umugeni** (bride's wali / guardian)
- **Imam** (officiating)

**What to build:**
- Certificate application form collecting info from all four parties
- Multi-step approval: each party signs/confirms digitally
- Admin (Imam) issues the final certificate
- Status tracking page for applicants

**Files:** Likely extends or replaces current `apps/frontend/src/app/[locale]/services/marriage/` flow — coordinate with existing marriage application module.

---

### 10. Islamic Radio Link (ijwi)

- **File:** `apps/frontend/src/components/layout/Navbar.tsx` and/or `Footer.tsx`
- **What:** Add a prominent link (with radio icon) to the Islamic radio station "ijwi". Can be:
  - A persistent mini player bar at the bottom of the screen, OR
  - A link in the navbar/footer opening the stream in a new tab
- Confirm the stream URL with the client before implementing.

---

### 11. Integrations — Start Work

**Context:** Client said "start working on integrations."

**Likely scope (confirm with client):**
- **Payment gateways:** MTN MoMo, BK Rwanda, possibly Stripe for diaspora donations
- **SMS notifications:** for OTP and member approvals (Rwanda gateway, e.g., RwandaTel or Infobip)
- **Email:** transactional email (already scaffolded with MailHog in dev — wire up real provider for prod, e.g., SendGrid or AWS SES)
- **Islamic calendar API:** for Hijri dates / prayer time display
- **External learning portals:** links to established Islamic e-learning platforms

**Backend starting point:** `apps/backend/src/` — create an `integrations/` module per provider.

---

## Quick Wins (Can be done in < 2 hours each)

1. Navbar font + logo size increase
2. Hijra Support → Hija Services rename
3. RMC Statistics rename
4. Blog hero height reduction
5. Add Islamic Radio link
6. Homepage hero text legibility fix

---

## New Pages Required (Summary)

| Page | Route | Complexity |
|------|-------|------------|
| Donation category detail | `/donate/[categorySlug]` | Medium |
| Area of intervention detail | `/areas/[slug]` | Medium |
| New Muslim guide | `/new-muslim` | High |
| Islamic schools | `/schools` | Medium |
| RMC history (within About) | `/about#history` | Medium |
| Tenders list | `/tenders` | Low |

---

## Backend Changes Required (Summary)

| Change | Module | Notes |
|--------|--------|-------|
| `donation_subcategories` table | Donations | FK to donation_categories |
| Rich content on categories/areas | Donations, Areas | jsonb field, admin rich editor |
| `type` filter on announcements | Public | Enables tenders section |
| `islamic_schools` table | New module | Province/district FK |
| History entries table | About/CMS | Year, description, image_key |
| Certificate multi-role workflow | Services/Certificates | Extends marriage module |
| Integrations module scaffold | Integrations | MoMo, BK, SMS, Email |

---

*Document generated: 19 June 2026 — maps all 18 June stakeholder feedback items to existing project files and outstanding work.*
