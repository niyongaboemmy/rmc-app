# Emmy Branch — Implementation Report
**Branch:** `emmy`  
**Deadline:** Wednesday, 24 June 2026  
**Report Date:** 22 June 2026  
**Verified Against:** Backend on port 3000 (ts-node) + Frontend on port 3001 (next dev)

---

## Summary

| # | Task | Status | Coverage |
|---|------|--------|----------|
| 5 | Hijra Support → Hija Services rename | ✅ Complete | All 3 locales + knowledge base |
| 8 | Show tenders on homepage | ✅ Complete (admin partial) | Backend + frontend done; admin type selector pending |
| 10 | Area of Intervention: details page | ✅ Complete (admin partial) | All routes + 404; admin richContent editor pending |
| 12 | About Us: RMC history timeline | ✅ Complete (admin partial) | DB + API + timeline UI; admin CRUD editor pending |
| 14 | Certificate approval process flow | ✅ Complete (admin + wizard partial) | Token flow + status UI; wizard phone step + admin panel pending |
| 17 | Add Islamic Radio link (ijwi) | ✅ Complete (URL pending) | Navbar + Footer; placeholder URL needs client confirmation |
| 21 | Start working on integrations | ✅ Complete | Email, SMS, MoMo, Hijri/Calendar scaffold |

**4 new DB migrations applied** (dev database) — all pending on production.

---

## #5 — Hija Services Rename ✅ Complete

**Status: Done**

| File | Change |
|------|--------|
| `apps/frontend/src/messages/en.json` | `"title": "Hija Services"` |
| `apps/frontend/src/messages/rw.json` | `"title": "Serivisi za Hija"` |
| `apps/frontend/src/messages/ar.json` | `"title": "خدمات الحجة"` |
| `apps/frontend/src/lib/rmc-knowledge.ts` | "Hijra Support" → "Hija Services" |

**Verified:** `grep -r "Hijra Support"` returns 0 results. Homepage renders "Hija Services" in EN, verified live at `/en`.

---

## #8 — Tenders on Homepage ✅ Complete (Admin partial)

**Status: Core feature done. Admin type selector not yet added.**

### Done
| Layer | File | Change |
|-------|------|--------|
| Backend entity | `apps/backend/src/public/entities/announcement.entity.ts` | Added `type: string` column (`'announcement'` default) |
| Migration | `apps/backend/src/database/migrations/013-add-type-to-announcements.ts` | `ALTER TABLE announcements ADD COLUMN type varchar(30) DEFAULT 'announcement'` — applied ✅ |
| Backend service | `apps/backend/src/public/public.service.ts` | `getActiveAnnouncements(type?, limit?)` with optional type filter |
| Backend controller | `apps/backend/src/public/public.controller.ts` | `?type=` and `?limit=` query params with Swagger docs |
| Frontend API client | `apps/frontend/src/lib/public-api.ts` | `getAnnouncements(type?, limit?)` |
| Frontend component | `apps/frontend/src/components/home/TendersSection.tsx` | Client component — fetches `?type=tender&limit=3`; deadline coloring (green/amber/red); hidden when empty |
| Homepage | `apps/frontend/src/app/[locale]/page.tsx` | `<TendersSection />` after AnnouncementsSection |
| Tenders listing page | `apps/frontend/src/app/[locale]/tenders/page.tsx` | Full listing with Navbar/Footer, limit=50 |

**API verified:**
- `GET /api/v1/public/announcements?type=tender` → only tenders ✅
- `GET /api/v1/public/announcements?type=announcement` → only announcements ✅
- `GET /api/v1/public/announcements?type=nonexistent` → empty array ✅
- `/en/tenders` → HTTP 200 ✅

### Pending
- **Admin form** (`apps/frontend/src/app/[locale]/admin/content/announcements/page.tsx`): no `type` dropdown added yet. Admin cannot set `type=tender` from the UI — requires direct DB insert or API call.

---

## #10 — Areas of Intervention: Detail Page ✅ Complete (Admin partial)

**Status: All user-facing routes done. Admin richContent editor not added.**

### Done
| Layer | File | Change |
|-------|------|--------|
| Type | `apps/frontend/src/lib/content/areas.ts` | `AreaItem` extended with `slug`, `richContent?: Tri`, `imageKey?: string` |
| Defaults | `apps/frontend/src/lib/content/areas.ts` | Added `slug` to all 4 items: `dawah`, `social-development`, `education`, `foreign-affairs` |
| Cards | `apps/frontend/src/components/home/AreasOfInterventionSection.tsx` | Each card wrapped in `<Link href={/${locale}/areas/${item.slug}>` with "Learn more →" hover cue |
| Detail component | `apps/frontend/src/components/areas/AreaDetail.tsx` | Displays icon, pillar index, title, description, richContent (HTML), placeholder if empty |
| Detail page | `apps/frontend/src/app/[locale]/areas/[slug]/page.tsx` | **Server component** — fetches AreasContent server-side, calls `notFound()` for unknown slugs (proper HTTP 404) |
| Admin form | `apps/frontend/src/app/[locale]/admin/content/areas/page.tsx` | Added `slug` field to create/edit modal |

**Verified:**
- `/en/areas/dawah` → HTTP 200 ✅
- `/en/areas/nonexistent` → HTTP 404 ✅ (fixed: was returning 200 due to client component — converted to server component)

### Pending
- **Admin form**: `richContent` (per-locale HTML/markdown textarea) and `imageKey` fields not added to the admin modal. Admins cannot populate long-form area content from the UI yet.

---

## #12 — About Us: RMC History Timeline ✅ Complete (Admin partial)

**Status: Full timeline UI live on about page. Admin CRUD editor not built.**

### Done
| Layer | File | Change |
|-------|------|--------|
| Entity | `apps/backend/src/content/entities/history-entry.entity.ts` | `year`, `titleEn/Rw/Ar`, `descriptionEn/Rw/Ar`, `imageKey`, `sortOrder` |
| Migration | `apps/backend/src/database/migrations/014-history-entries.ts` | Creates `history_entries` table + index on `year` — applied ✅ |
| Module | `apps/backend/src/content/content.module.ts` | `HistoryEntry` added to TypeORM feature |
| Service | `apps/backend/src/content/content.service.ts` | `getHistoryEntries()`, `createHistoryEntry()`, `updateHistoryEntry()`, `deleteHistoryEntry()` |
| Controller | `apps/backend/src/content/content.controller.ts` | `GET /content/history/entries` (public), `POST/PUT/DELETE` (admin) |
| Frontend component | `apps/frontend/src/components/about/HistoryTimeline.tsx` | Alternating left/right desktop layout, vertical mobile, image zoom modal (Escape + click-backdrop to close) |
| About page | `apps/frontend/src/app/[locale]/about/page.tsx` | `<HistoryTimeline locale={locale} />` added between leadership and gallery |

**API verified:**
- `GET /api/v1/content/history/entries` → entries sorted ASC by year ✅
- `/en/about` → HTTP 200, timeline HTML present ✅

### Pending
- **Admin editor** (`apps/frontend/src/app/[locale]/admin/content/about/page.tsx`): still shows old 3-text-blob history section. No table/form to add, edit, or delete individual `history_entries` rows. Admins must use the API directly (POST/PUT/DELETE `/api/v1/content/history/entries`) until the UI is built.

---

## #14 — Certificate Approval Process Flow (Nikah Roles) ✅ Complete (Admin + Wizard partial)

**Status: Full token-based confirmation flow done end-to-end. Wizard phone-collection step and admin panel not built.**

### Done
| Layer | File | Change |
|-------|------|--------|
| Entity | `apps/backend/src/marriage/entities/marriage-party-confirmation.entity.ts` | `PartyRole` enum (`bride/groom/wali/imam`), `confirmationToken` (unique, nulled on use), `confirmedAt` |
| Migration | `apps/backend/src/database/migrations/015-marriage-party-confirmations.ts` | Creates `party_role_enum` + `marriage_party_confirmations` table — applied ✅ |
| Module | `apps/backend/src/marriage/marriage.module.ts` | `MarriagePartyConfirmation` added |
| Service | `apps/backend/src/marriage/marriage.service.ts` | `addParties()` (generates tokens, sends SMS), `getPartyConfirmations()`, `lookupByToken()`, `confirmParty()` (token consumed on use) |
| Controller | `apps/backend/src/marriage/marriage.controller.ts` | `POST /applications/:id/parties`, `GET /applications/:id/parties`, `GET /applications/by-number/:number/parties` (public, no PII), `GET /confirm/:token` (public), `POST /confirm/:token` (public) |
| Confirmation page | `apps/frontend/src/app/[locale]/services/marriage/confirm/[token]/page.tsx` | States: loading → ready → confirming → done / already_done / error |
| Status checker | `apps/frontend/src/components/services/MarriageStatusChecker.tsx` | `PartyConfirmationsPanel` — shows confirmed (green ✓) / pending (amber ⏱) per role |

**API verified:**
- `GET /confirm/:token` → role + application summary, no PII ✅
- `POST /confirm/:token` → `confirmedAt` set, token nulled ✅
- `POST /confirm/:token` (second call) → 404, token consumed ✅
- `GET /by-number/:num/parties` → role + confirmedAt only, no token/nid/phone leaked ✅
- `/en/services/marriage/confirm/:token` → HTTP 200 ✅

### Pending
- **MarriageWizard** (`apps/frontend/src/components/services/marriage/MarriageWizard.tsx`): no new step added to collect phone numbers for bride, groom, wali, imam. Parties must be added via `POST /applications/:id/parties` API call directly.
- **Admin marriage detail page** (`apps/frontend/src/app/[locale]/admin/marriage/[id]/page.tsx`): no party confirmations panel; no "Issue Certificate" button gated on all 4 parties confirming.

---

## #17 — Islamic Radio Link (Ijwi) ✅ Complete (URL pending)

**Status: Done — awaiting client confirmation of stream URL.**

| File | Change |
|------|--------|
| `apps/frontend/src/lib/constants.ts` | `export const IJWI_RADIO_URL = 'https://TODO_CONFIRM_WITH_CLIENT'` |
| `apps/frontend/src/components/layout/Navbar.tsx` | Radio icon link — `target="_blank"`, gold color, hidden on mobile (`hidden sm:flex`) |
| `apps/frontend/src/components/layout/Footer.tsx` | Radio link in Quick Links column |

**Verified:** `/en` renders "Ijwi" anchor with title "Ijwi ry'Ihanga Radio" ✅

**Action required:** Replace the placeholder in `apps/frontend/src/lib/constants.ts` once the client provides the actual stream URL.

---

## #21 — Integrations Scaffold ✅ Complete

**Status: All 4 sub-modules scaffolded, wired into AppModule, env vars documented.**

| Module | File | Implementation |
|--------|------|----------------|
| Email | `apps/backend/src/integrations/email/email.service.ts` | `sendEmail()` — SMTP via existing env vars; logs when unconfigured |
| SMS | `apps/backend/src/integrations/sms/sms.service.ts` | `sendSms()` — dispatches to `infobip` / `africastalking` / `console` via `SMS_PROVIDER` env var |
| MTN MoMo | `apps/backend/src/integrations/momo/momo.service.ts` | `requestToPay()`, `getPaymentStatus()`, `getAccessToken()` — MTN sandbox, console fallback |
| Hijri/Calendar | `apps/backend/src/integrations/calendar/hijri.service.ts` | `getPrayerTimes()` (1hr Redis TTL), `toHijri()` (24hr Redis TTL) — wraps Aladhan API |
| Root module | `apps/backend/src/integrations/integrations.module.ts` | Imports + exports all 4 sub-modules |
| App wiring | `apps/backend/src/app.module.ts` | `IntegrationsModule` imported |
| Env vars | `apps/backend/.env` | `SMS_PROVIDER=console`, `INFOBIP_*`, `AT_*`, `MOMO_*` added |

**Backend starts clean** with IntegrationsModule loaded ✅

---

## Database Migrations

| Migration | Table | Status (dev) | Status (production) |
|-----------|-------|-------------|---------------------|
| `012-contact-messages` | `contact_messages` | ✅ Applied | ⏳ Pending |
| `013-add-type-to-announcements` | `announcements.type` column | ✅ Applied | ⏳ Pending |
| `014-history-entries` | `history_entries` | ✅ Applied | ⏳ Pending |
| `015-marriage-party-confirmations` | `marriage_party_confirmations` | ✅ Applied | ⏳ Pending |

**To apply on production:** merge `emmy` → `main`, then run:
```bash
npm run migrate:live
```
Or trigger from the emmy branch directly:
```bash
gh workflow run migrate-production.yml --ref emmy --field confirm=MIGRATE
```

---

## Remaining Work (Post-deadline or next sprint)

| # | Item | Effort | Notes |
|---|------|--------|-------|
| 8 | Admin announcements: `type` dropdown | ~1 hr | Add select field to announcement form in admin UI |
| 10 | Admin areas: `richContent` + `imageKey` fields | ~1 hr | Add per-locale textarea + image key input to area edit modal |
| 12 | Admin history entries CRUD | ~3–4 hrs | Full table + add/edit/delete form in `/admin/content/about` |
| 14 | MarriageWizard: party phones step | ~2–3 hrs | New step 4 collecting phone per role, calls `POST /applications/:id/parties` |
| 14 | Admin marriage: party panel + Issue Certificate button | ~2–3 hrs | Panel in `/admin/marriage/[id]` showing confirmation status; button gated on all 4 confirmed |
| 17 | Replace IJWI_RADIO_URL placeholder | ~5 min | Client must confirm stream URL |

---

## Environment Notes

- Root `.next` and `dist` directories contain **root-owned files** from a prior sudo build. Run `sudo rm -rf apps/frontend/.next apps/backend/dist` once to unblock normal `npm run build` and `next dev` without workarounds.
- A symlink was created at `apps/frontend/node_modules/@tailwindcss/typography` → root `node_modules` to fix a postcss module resolution gap in the workspace setup.

---

*Generated: 22 June 2026*
