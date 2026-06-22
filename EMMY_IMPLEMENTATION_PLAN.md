# Emmy — Implementation Plan
**Deadline:** Wednesday, 24 June 2026  
**Source:** RMC Stakeholder Review — 18 June 2026  
**Branch:** `emmy`

---

## Task Summary (em-assigned items)

| # | Task | Priority | Type |
|---|------|----------|------|
| 5 | Hijra Support → Hija Services rename | High | Content |
| 8 | Show tenders on homepage | High | Feature |
| 10 | Area of Intervention: add details page | High | Feature |
| 12 | About Us: RMC history timeline w/ interactive images | Medium | Feature |
| 14 | Certificate approval process flow (nikah roles) | High | Feature |
| 17 | Add Islamic Radio link (ijwi) | Low | Feature |
| 21 | Start working on integrations | High | Backend |

---

## #5 — Hijra Support → "Hija Services" Rename

**Effort:** ~30 min | **Priority: High (Quick Win)**

### What exists
The string `"Hijra Support"` lives in three places:
- `apps/frontend/src/messages/en.json` line 557 → `"hijra": { "title": "Hijra Support" }`
- `apps/frontend/src/messages/rw.json` — same key, check for translated label
- `apps/frontend/src/messages/ar.json` — same key
- `apps/frontend/src/app/[locale]/services/page.tsx` — `key: 'hijra'` service card
- `apps/frontend/src/components/home/ServicesPreview.tsx` — `hijra` service reference
- `apps/frontend/src/lib/rmc-knowledge.ts` — knowledge base text

### Steps

1. **`apps/frontend/src/messages/en.json`**  
   Change `"title": "Hijra Support"` → `"title": "Hija Services"` under the `"hijra"` key.  
   Also update any `description` or subtitle that says "Hijra Support".

2. **`apps/frontend/src/messages/rw.json`**  
   Update the Kinyarwanda translation for `hijra.title` to the correct Kinyarwanda equivalent (e.g. *"Serivisi za Hija"*).

3. **`apps/frontend/src/messages/ar.json`**  
   Update the Arabic translation for `hijra.title` (e.g. *"خدمات الحجة"*).

4. **`apps/frontend/src/app/[locale]/services/page.tsx`**  
   The service card label rendered from the `hijra` key will update automatically via i18n.  
   Confirm the display label is not hardcoded — if it is, change it.

5. **`apps/frontend/src/lib/rmc-knowledge.ts`**  
   Search and replace any hardcoded "Hijra Support" string.

6. **Grep verify:**  
   ```bash
   grep -r "Hijra Support" apps/frontend/src
   ```
   Should return 0 results after the rename.

---

## #8 — Show Tenders on Homepage

**Effort:** ~3-4 hrs | **Priority: High**

### What exists
- Announcements entity: `apps/backend/src/public/entities/announcement.entity.ts`  
  Fields: `title`, `content`, `priority`, `targetAudience`, `publishAt`, `expiresAt`, `isPublished`  
  **Missing:** a `type` field to distinguish tenders from regular announcements.
- Backend announcement endpoints: `GET /announcements` in `apps/backend/src/public/public.controller.ts`
- Homepage: `apps/frontend/src/app/[locale]/page.tsx` — sections rendered sequentially
- `apps/frontend/src/components/home/AnnouncementsSection.tsx` — existing announcement UI

### Backend Steps

1. **Add `type` column to announcements entity**  
   File: `apps/backend/src/public/entities/announcement.entity.ts`  
   ```typescript
   @Column({ type: 'varchar', length: 30, default: 'announcement' })
   type: string; // 'announcement' | 'tender'
   ```

2. **Generate and run migration**  
   ```bash
   cd apps/backend
   npm run migration:generate -- src/database/migrations/AddTypeToAnnouncements
   npm run migration:run
   ```

3. **Update `GET /announcements`** in `apps/backend/src/public/public.service.ts`  
   Add optional `?type=tender` query param filter so the frontend can request tenders only.

4. **Admin UI** — update the announcement form in  
   `apps/frontend/src/app/[locale]/admin/content/announcements/page.tsx`  
   to include a `type` selector (`announcement` / `tender`) with a deadline date field.

### Frontend Steps

5. **New component:** `apps/frontend/src/components/home/TendersSection.tsx`  
   - Fetch `GET /api/public/announcements?type=tender&limit=3`
   - Display up to 3 open tenders: title, deadline (`expiresAt`), and a "View All" link → `/tenders`
   - Match existing section style (green/gold brand, card layout, Reveal wrapper)
   - Show "No open tenders" gracefully when empty

6. **Homepage:** `apps/frontend/src/app/[locale]/page.tsx`  
   Import and insert `<TendersSection />` after `<AnnouncementsSection />` wrapped in `<Reveal>`.

7. **Optional tenders listing page:** `apps/frontend/src/app/[locale]/tenders/page.tsx`  
   Simple paginated list (can be a thin wrapper around the same API call with no limit).

---

## #10 — Area of Intervention: Add Details Page

**Effort:** ~4-5 hrs | **Priority: High**

### What exists
- Section component: `apps/frontend/src/components/home/AreasOfInterventionSection.tsx`  
  Cards render from `AreasContent` (fetched via `getSiteContent(ContentKeys.areas)`). Each `AreaItem` has: `icon`, `title` (multilang), `description` (multilang). **No slug, no rich content, no detail page.**
- Admin: `apps/frontend/src/app/[locale]/admin/content/areas/page.tsx` — exists, manages area cards
- Content API: `apps/frontend/src/lib/content-api.ts` — `AREAS_DEFAULT`, `AreaItem` type

### Backend Steps

1. **Extend `AreaItem` type** in `apps/frontend/src/lib/content-api.ts`:
   ```typescript
   export interface AreaItem {
     icon: string;
     title: MultiLangString;
     description: MultiLangString;
     slug: string;                    // new — URL-safe identifier
     richContent?: MultiLangString;  // new — long-form rich text (markdown or HTML)
     imageKey?: string;              // new — file server key for hero image
   }
   ```

2. **Update `AREAS_DEFAULT`** — add `slug` to each default area item  
   (e.g. `slug: 'education'`, `slug: 'health'`, `slug: 'social-welfare'`, `slug: 'dawa'`)

3. **Admin page** — `apps/frontend/src/app/[locale]/admin/content/areas/page.tsx`  
   Add `slug`, `richContent` (textarea / simple rich editor per locale), and optional `imageKey` fields to the area edit form.

### Frontend Steps

4. **New detail page:** `apps/frontend/src/app/[locale]/areas/[slug]/page.tsx`  
   - Fetch `getSiteContent(ContentKeys.areas)` and find the area matching `params.slug`
   - Render: hero image (if set), title, description, rich content
   - Add breadcrumb: Home → Areas → [Area Name]
   - Return 404 if slug not found

5. **New component:** `apps/frontend/src/components/areas/AreaDetail.tsx`  
   Presentation component receiving `AreaItem` + `locale` — keeps the page file clean.

6. **Link cards to detail pages** — in `AreasOfInterventionSection.tsx`  
   Wrap each `PillarCard` in a `<Link href={`/${locale}/areas/${item.slug}`}>` so clicking a card navigates to its detail page.

---

## #12 — About Us: RMC History Timeline

**Effort:** ~5-6 hrs | **Priority: Medium**

### What exists
- About page: `apps/frontend/src/app/[locale]/about/page.tsx`  
  Uses `ImageCarousel3D` from `apps/frontend/src/components/about/ImageCarousel3D.tsx`.  
  The admin content editor (`apps/frontend/src/app/[locale]/admin/content/about/page.tsx`) already manages `historyEn/Rw/Ar` as plain text fields.
- No dedicated `history_entries` table exists yet — history is one text blob per locale.

### Backend Steps

1. **New `history_entries` table** — create entity in the content module or a new CMS module:  
   `apps/backend/src/content/entities/history-entry.entity.ts`
   ```typescript
   @Entity('history_entries')
   export class HistoryEntry {
     @PrimaryGeneratedColumn('uuid') id: string;
     @Column({ type: 'int' }) year: number;
     @Column({ type: 'varchar', length: 200 }) titleEn: string;
     @Column({ type: 'varchar', length: 200 }) titleRw: string;
     @Column({ type: 'varchar', length: 200 }) titleAr: string;
     @Column({ type: 'text' }) descriptionEn: string;
     @Column({ type: 'text' }) descriptionRw: string;
     @Column({ type: 'text' }) descriptionAr: string;
     @Column({ type: 'varchar', nullable: true }) imageKey: string | null;
     @Column({ type: 'int', default: 0 }) sortOrder: number;
     @CreateDateColumn() createdAt: Date;
     @UpdateDateColumn() updatedAt: Date;
   }
   ```

2. **Migration** — generate and run.

3. **Backend endpoints** (add to content controller or public controller):
   - `GET /public/history` — returns all entries sorted by year
   - `POST /admin/history` — create entry (admin only)
   - `PUT /admin/history/:id` — update entry
   - `DELETE /admin/history/:id`

### Frontend Steps

4. **New component:** `apps/frontend/src/components/about/HistoryTimeline.tsx`  
   - Fetch `GET /api/public/history`
   - **Desktop:** alternating left/right layout (even index = left, odd = right) with a center vertical line
   - **Mobile:** vertical stacked list
   - Each entry: year badge (gold), title, short description, image thumbnail that opens a zoom modal on click
   - Zoom modal: reuse or adapt the `GalleryModal` from `apps/frontend/src/components/activities/GalleryModal.tsx`

5. **Add to about page** — `apps/frontend/src/app/[locale]/about/page.tsx`  
   Import `<HistoryTimeline />` and insert it as a new section (after the leadership section, before the gallery carousel). Wrap in `<Reveal>`.

6. **Admin editor** — `apps/frontend/src/app/[locale]/admin/content/about/page.tsx`  
   Add a "History Entries" tab/section with a table to add/edit/delete entries (year, title per locale, description per locale, image upload).

---

## #14 — Certificate Approval Process Flow (Nikah Roles)

**Effort:** ~8-10 hrs | **Priority: High**

### What exists
- Current marriage application: wizard form in `apps/frontend/src/app/[locale]/services/marriage/apply/page.tsx` — single applicant submits on behalf of all parties.
- Marriage entity: `apps/backend/src/marriage/entities/marriage-application.entity.ts`  
  Already has `groomName`, `groomNid`, `brideName`, `brideNid`, `groomUserId`, `brideUserId` columns. Status enum has: `DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → COMPLETED → CLOSED`.
- Certificate page: `apps/frontend/src/app/[locale]/certificates/[number]/page.tsx` — read-only, shows issued certificate.
- Status page: `apps/frontend/src/app/[locale]/services/marriage/status/page.tsx`

### What needs to change
The flow currently has one applicant. The new requirement adds **4 parties who must each confirm digitally**: Bride (Umugeni), Groom (Umugabo), Bride's Wali/Guardian (Uwatanze umugeni), Imam.

### Backend Steps

1. **New `marriage_party_confirmations` table:**  
   File: `apps/backend/src/marriage/entities/marriage-party-confirmation.entity.ts`
   ```typescript
   export enum PartyRole { BRIDE='bride', GROOM='groom', WALI='wali', IMAM='imam' }
   
   @Entity('marriage_party_confirmations')
   export class MarriagePartyConfirmation {
     @PrimaryGeneratedColumn('uuid') id: string;
     @Column({ name: 'application_id', type: 'uuid' }) applicationId: string;
     @Column({ type: 'enum', enum: PartyRole }) role: PartyRole;
     @Column({ type: 'varchar', length: 150, nullable: true }) name: string | null;
     @Column({ type: 'varchar', length: 16, nullable: true }) nid: string | null;
     @Column({ type: 'varchar', length: 30, nullable: true }) phone: string | null;
     @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true }) confirmedAt: Date | null;
     @Column({ name: 'confirmation_token', type: 'varchar', length: 80, unique: true, nullable: true }) confirmationToken: string | null;
     @Column({ type: 'text', nullable: true }) notes: string | null;
     @CreateDateColumn() createdAt: Date;
   }
   ```

2. **Migration** — generate and run.

3. **New backend endpoints** in `apps/backend/src/marriage/marriage.controller.ts`:
   - `POST /marriage/:id/parties` — applicant adds party phone numbers after submitting
   - `GET /marriage/confirm/:token` — public endpoint to look up a confirmation request
   - `POST /marriage/confirm/:token` — party confirms their identity (sets `confirmedAt`)
   - `GET /marriage/:id/parties` — admin/applicant views confirmation status per party
   - Admin: `PUT /marriage-admin/:id/imam-confirm` — Imam issues final approval + triggers certificate

4. **Notification logic** in `marriage.service.ts`:  
   After submission, generate a unique `confirmationToken` per party and send SMS/email with a confirmation link. (Placeholder: log to console until integrations are wired — see task #21.)

### Frontend Steps

5. **Application form update** — `apps/frontend/src/components/services/marriage/MarriageWizard.tsx`  
   Add a new step (after document upload) collecting phone numbers for the bride, groom, wali, and preferred imam. These are stored and used to send confirmation requests.

6. **New confirmation page:** `apps/frontend/src/app/[locale]/services/marriage/confirm/[token]/page.tsx`  
   - Fetch `GET /marriage/confirm/:token` to show party role + application summary
   - Button: "I confirm my participation in this Nikah application"
   - On confirm: `POST /marriage/confirm/:token` → show success message
   - Handle already-confirmed and expired states

7. **Status page enhancement** — `apps/frontend/src/app/[locale]/services/marriage/status/page.tsx`  
   Add a "Party Confirmations" section showing which of the 4 parties have confirmed (green checkmark) vs pending (clock icon).

8. **Admin view** — `apps/frontend/src/app/[locale]/admin/marriage/[id]/page.tsx`  
   Add party confirmations panel. Add "Issue Certificate" button (only enabled when all 4 parties confirmed + application approved).

---

## #17 — Add Islamic Radio Link (ijwi)

**Effort:** ~1 hr | **Priority: Low (Quick Win)**

### What exists
- Navbar: `apps/frontend/src/components/layout/Navbar.tsx`
- Footer: `apps/frontend/src/components/layout/Footer.tsx`

### Steps

> **Prerequisite:** Confirm the stream URL with the client before deploying. Use a placeholder constant in the meantime.

1. **Add a `RADIO_URL` constant** at the top of both files (or in a shared `apps/frontend/src/lib/constants.ts`):
   ```typescript
   export const IJWI_RADIO_URL = 'https://TODO_CONFIRM_WITH_CLIENT'; // placeholder
   ```

2. **Navbar** — add a small radio icon link in the nav utility area (top-right, next to language switcher):
   ```tsx
   <a href={IJWI_RADIO_URL} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs font-semibold text-rmc-gold hover:text-rmc-gold-light">
     <Radio className="w-4 h-4" /> Ijwi
   </a>
   ```

3. **Footer** — add a similar link in the Resources/Links column group.

4. **Approach:** simple new-tab link for now. Upgrade to a persistent mini player bar post-deadline once the stream URL is confirmed.

---

## #21 — Start Working on Integrations

**Effort:** ~6-8 hrs initial scaffold | **Priority: High**

### What exists
- Backend: `apps/backend/src/` — NestJS monorepo with modules per domain
- MailHog wired in dev (transactional email scaffolded)
- No `integrations/` module yet

### Scope (initial scaffold — not full implementation)

The goal is to establish the module structure and at least one working integration end-to-end.

### Steps

1. **Create `integrations/` module:**  
   `apps/backend/src/integrations/integrations.module.ts`  
   Sub-modules per provider:
   - `integrations/email/` — wraps the existing MailHog/SMTP config; add SendGrid adapter for prod
   - `integrations/sms/` — Infobip or Africa's Talking Rwanda gateway
   - `integrations/momo/` — MTN MoMo Rwanda API scaffold (collections API)
   - `integrations/calendar/` — Hijri calendar/prayer time API wrapper

2. **Email integration** (highest value, already partially wired):  
   File: `apps/backend/src/integrations/email/email.service.ts`  
   - Abstract interface: `sendEmail(to, subject, htmlBody, textBody?)`
   - Dev provider: MailHog (existing config)
   - Prod provider: SendGrid or AWS SES (toggle via `EMAIL_PROVIDER` env var)
   - Expose `EmailModule` and inject into `MarriageModule`, `AuthModule` etc.

3. **SMS scaffold:**  
   File: `apps/backend/src/integrations/sms/sms.service.ts`  
   - Interface: `sendSms(to: string, message: string)`
   - Stub implementation that logs to console in dev
   - Infobip SDK wired up when `SMS_PROVIDER=infobip` env var is set + credentials added
   - First use: marriage confirmation token delivery (task #14)

4. **MTN MoMo scaffold:**  
   File: `apps/backend/src/integrations/momo/momo.service.ts`  
   - Scaffold the Collections API flow (request to pay)
   - Store `MOMO_SUBSCRIPTION_KEY`, `MOMO_API_USER`, `MOMO_API_KEY` in `.env`
   - First use: donation payment flow (coordinate with Jac on donations task)

5. **Calendar/Prayer API:**  
   File: `apps/backend/src/integrations/calendar/hijri.service.ts`  
   - Wrap Aladhan API for Hijri date conversion and prayer times by coordinates
   - Cache responses in Redis (already scaffolded: `apps/backend/src/redis/`)

6. **Env vars** — add all new secrets to `.env.example` with placeholder values and document in README.

---

## Order of Execution (Recommended)

Given the deadline (Wed 24 June), tackle in this order:

1. **#5 Hijra rename** — 30 min, zero risk, unblocks other UI testing
2. **#17 Radio link** — 1 hr, quick win (placeholder URL)
3. **#8 Tenders on homepage** — needs backend migration; start early so it can soak
4. **#10 Areas detail page** — no new tables needed if you add slug to content-api types first
5. **#12 History timeline** — needs new table + admin UI
6. **#14 Nikah flow** — most complex; coordinate with the admin team (Imam role must exist)
7. **#21 Integrations scaffold** — can be done in parallel once #14 design is clear

---

## Key Files Reference

| File | Relevance |
|------|-----------|
| `apps/frontend/src/messages/en.json` | #5 rename |
| `apps/frontend/src/messages/rw.json` | #5 rename |
| `apps/frontend/src/messages/ar.json` | #5 rename |
| `apps/frontend/src/components/home/ServicesPreview.tsx` | #5 rename |
| `apps/frontend/src/app/[locale]/services/page.tsx` | #5 rename |
| `apps/backend/src/public/entities/announcement.entity.ts` | #8 tenders — add `type` column |
| `apps/backend/src/public/public.service.ts` | #8 tenders — filter by type |
| `apps/frontend/src/app/[locale]/page.tsx` | #8 — add TendersSection |
| `apps/frontend/src/lib/content-api.ts` | #10 — extend AreaItem type |
| `apps/frontend/src/components/home/AreasOfInterventionSection.tsx` | #10 — link cards |
| `apps/frontend/src/app/[locale]/admin/content/about/page.tsx` | #12 — history admin |
| `apps/frontend/src/app/[locale]/about/page.tsx` | #12 — add timeline |
| `apps/frontend/src/components/activities/GalleryModal.tsx` | #12 — reuse for image zoom |
| `apps/backend/src/marriage/entities/marriage-application.entity.ts` | #14 — existing entity |
| `apps/frontend/src/components/services/marriage/MarriageWizard.tsx` | #14 — add party step |
| `apps/frontend/src/app/[locale]/services/marriage/status/page.tsx` | #14 — show confirmations |
| `apps/frontend/src/components/layout/Navbar.tsx` | #17 — radio link |
| `apps/frontend/src/components/layout/Footer.tsx` | #17 — radio link |
| `apps/backend/src/integrations/` (new) | #21 — integrations scaffold |

---

*Generated: 22 June 2026 — based on codebase review of branch `emmy`*
