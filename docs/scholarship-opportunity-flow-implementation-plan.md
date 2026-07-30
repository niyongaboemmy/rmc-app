# Scholarship — Opportunity-Based Application Flow — Implementation Plan

**Project:** RMC Digital Platform — Scholarship Service
**Document Type:** Implementation Plan
**Prepared by:** Senior Software Architect
**Date:** 2026-07-29
**Version:** 1.0
**Related:** Tender service (architectural precedent for the *flow*; this plan deliberately diverges on *storage* — see §3)

---

## Table of Contents

1. [Objective](#1-objective)
2. [Current State — What Is Actually Built](#2-current-state--what-is-actually-built)
3. [The Central Architecture Decision](#3-the-central-architecture-decision)
4. [Target Flow](#4-target-flow)
5. [Data Model](#5-data-model)
6. [Lifecycle & Invariants](#6-lifecycle--invariants)
7. [API Specification](#7-api-specification)
8. [Frontend Routes & Components](#8-frontend-routes--components)
9. [Admin](#9-admin)
10. [Backfill & Backwards Compatibility](#10-backfill--backwards-compatibility)
11. [Phasing](#11-phasing)
12. [Risks](#12-risks)
13. [Decisions Needed Before Build](#13-decisions-needed-before-build)
14. [Definition of Done](#14-definition-of-done)

---

## 1. Objective

Move scholarships from **"apply any time, into a void"** to the tender model: RMC **announces** a scholarship with a description, eligibility and a deadline; applicants **browse** what is open, **read** a detail page, and **apply to that specific scholarship**.

Concretely, the four things asked for:

| Requirement | Delivered by |
|---|---|
| Scholarships announced by administration | §9 — admin authoring with draft → published → closed |
| Applicants apply to existing opportunities | §5, §6 — `program_id` becomes **required** and deadline-enforced |
| Clear descriptions + deadlines | §5 — structured eligibility / benefits / required docs / `deadline` |
| Landing page, detail page, way to apply | §8 — `/services/scholarship`, `…/[slug]`, `…/apply?program=` |

---

## 2. Current State — What Is Actually Built

This is grounded in the code as it stands today, not as previously planned. **More exists than the brief assumes**, which materially reduces scope.

### Already built and reusable

- **`ScholarshipProgram` entity** ([scholarship-program.entity.ts](../apps/backend/src/scholarship/entities/scholarship-program.entity.ts)) — `title`, `description`, `level`, `amount`, `deadline`, `isOpen`, soft-delete. This is already ~60% of an "opportunity".
- **Admin program CRUD**, backend and UI — routes in [scholarship-admin.controller.ts](../apps/backend/src/scholarship/scholarship-admin.controller.ts) and a `ProgramModal` in [admin/scholarship/page.tsx](../apps/frontend/src/app/[locale]/admin/scholarship/page.tsx).
- **Public listing** — `GET /scholarship/programs` and [ScholarshipProgramsList.tsx](../apps/frontend/src/components/services/scholarship/ScholarshipProgramsList.tsx), which already renders deadline, level, amount and a "closing soon" badge.
- **`scholarship_applications.program_id`** — the FK already exists.
- **4-step application wizard**, documents, status history, admin review.
- **OTP-gated tracking** (migration 051, shipped today).

### The actual gaps

1. **Applications never bind to an opportunity.** [ScholarshipWizard.tsx:145](../apps/frontend/src/components/services/scholarship/ScholarshipWizard.tsx#L145) states plainly: *"Retained for route compatibility; the program picker was removed from the form."* `programId` is nullable and, in practice, always null. **This is the core of the work.**
2. **No detail page** and no `slug` — nothing to link to or share.
3. **No i18n on programs.** `title`/`description` are single-language `varchar`/`text`, while the site is trilingual (en/rw/ar).
4. **No lifecycle.** A single `isOpen` boolean; no draft state, so an admin cannot compose a scholarship before it goes live.
5. **No deadline enforcement server-side.** `deadline` is decorative — nothing rejects a late submission.
6. **No attachments** (the call document) and no structured eligibility / benefits / required documents.

---

## 3. The Central Architecture Decision

**A tender is not its own entity.** [tender-application.entity.ts:46](../apps/backend/src/tenders/entities/tender-application.entity.ts#L46) says: *"FK into `announcements` — the tender is an announcement row with `type='tender'`."* Tenders reuse `announcements`, which supplies `slug`, `title_i18n`, `content_i18n`, `publish_at`, `expires_at`, `is_published` and `attachments`.

So "match the tenders flow" admits two readings.

### Option A — Scholarships as `announcements` rows (`type='scholarship'`)

**For:** literal parity; free slug, i18n, publish/expire, attachments, and the existing announcement authoring UI.

**Against — and this is decisive:** a scholarship has **typed domain fields a tender does not** — education level, award amount, number of slots, eligibility. The landing page must *filter by level*, which means those fields have to be queryable columns, not prose inside `content`. Putting them on `announcements` burdens every announcement row with scholarship-only columns; putting them in `content` makes filtering impossible. It would also strand the existing `program_id` FK and the admin CRUD already built.

### Option B — Extend `scholarship_programs` into the opportunity ✅ **Recommended**

Keep the typed table; add the presentation and lifecycle fields that `announcements` would have supplied.

**For:**
- The FK (`scholarship_applications.program_id`) **already points at it** — the data model is already right; only the *flow* is missing.
- Level / amount / slots stay real columns, so landing-page filtering and admin reporting are trivial.
- Admin CRUD, the public list endpoint and the list component already exist and are extended rather than replaced.
- No shared table is polluted.

**Against:** re-implements slug, i18n and publish/expire that `announcements` already has — roughly one migration's worth of columns, and the i18n jsonb shape can be copied verbatim from `announcements` so the two stay legible side by side.

> **Recommendation: Option B.** Match the tender **flow** (announce → list → detail → apply, deadline-enforced) without inheriting the tender **storage compromise**. Tenders reused `announcements` because a tender is essentially a document plus a deadline; a scholarship is a structured offer with eligibility rules, and it already has a table.

**Naming:** keep the entity/table `ScholarshipProgram` / `scholarship_programs` — renaming buys nothing and costs a migration plus every reference. Use "scholarship" (not "program") in all user-facing copy; reserve "program" for code.

---

## 4. Target Flow

```
ADMIN                          PUBLIC                          APPLICANT
─────                          ──────                          ─────────
Create scholarship
  title/description (3 langs)
  level, amount, slots
  eligibility, benefits
  required documents
  opens_at, deadline
  attachments (call PDF)
        │
        ▼ publish
   status=published  ──────►  /services/scholarship
                              (cards: level, amount,
                               deadline, closing-soon)
                                      │
                                      ▼
                              /services/scholarship/[slug]
                              (full description, eligibility,
                               benefits, required docs,
                               attachments, deadline)
                                      │
                                      ▼ "Apply"
                              /services/scholarship/apply?program=<slug>
                                      │
                                      ▼
                                                          4-step wizard,
                                                          scholarship LOCKED
                                                          and shown in header
                                                                  │
                                                                  ▼ submit
                                              server re-checks published + window
                                                                  │
                                                                  ▼
                                              tracking code → OTP status page
        │                                                         │
        ▼ deadline passes                                         │
   status=closed  ─────────►  moves to "Past scholarships"        │
   (applications rejected)                                        │
        │                                                         │
        ▼ review ◄────────────────────────────────────────────────┘
```

---

## 5. Data Model

### Migration 052 — `scholarship_programs` becomes an opportunity

```sql
ALTER TABLE scholarship_programs
  ADD COLUMN slug               varchar(160),            -- unique where present
  ADD COLUMN title_i18n         jsonb,                   -- {en,rw,ar}, same shape as announcements
  ADD COLUMN description_i18n   jsonb,
  ADD COLUMN eligibility_i18n   jsonb,                   -- who may apply
  ADD COLUMN benefits_i18n      jsonb,                   -- what the award covers
  ADD COLUMN required_documents jsonb DEFAULT '[]',      -- drives the wizard upload step
  ADD COLUMN attachments        jsonb DEFAULT '[]',      -- {key,name,mimeType,size}[] — the call PDF
  ADD COLUMN slots              int,                     -- number of awards, null = unspecified
  ADD COLUMN opens_at           timestamptz,             -- null = open on publish
  ADD COLUMN status             varchar(20) NOT NULL DEFAULT 'draft',
  ADD COLUMN reference_number   varchar(40);             -- RMC-SCHP-2607-0001, admin/citation use

CREATE UNIQUE INDEX IDX_scholarship_programs_slug ON scholarship_programs (slug) WHERE slug IS NOT NULL;
CREATE INDEX IDX_scholarship_programs_status_deadline ON scholarship_programs (status, deadline);

ALTER TABLE scholarship_programs
  ADD CONSTRAINT CHK_scholarship_programs_status
  CHECK (status IN ('draft','published','closed'));
```

**`is_open` is retained and derived, not authored.** Dropping it would break the existing list component and admin UI in the same commit as everything else. Keep it in sync (`is_open = status = 'published' AND now() < deadline`) and remove it in a later cleanup once nothing reads it.

**i18n fields are additive.** `title` / `description` stay as the fallback exactly as `announcements` does it (`titleI18n` falls back to `title`), so existing rows keep working with no backfill.

### Migration 053 — applications must target a scholarship

```sql
-- See §10 for the backfill that must run BEFORE this.
ALTER TABLE scholarship_applications ALTER COLUMN program_id SET NOT NULL;

ALTER TABLE scholarship_applications
  ADD CONSTRAINT FK_scholarship_app_program
  FOREIGN KEY (program_id) REFERENCES scholarship_programs(id);

-- One live application per person per scholarship. Withdrawn/rejected ones
-- must not block a re-apply, hence the partial index.
CREATE UNIQUE INDEX IDX_scholarship_app_one_per_program
  ON scholarship_applications (applicant_id, program_id)
  WHERE status NOT IN ('cancelled','rejected');
```

---

## 6. Lifecycle & Invariants

| State | Visible publicly | Accepts applications |
|---|---|---|
| `draft` | no | no |
| `published`, before `opens_at` | yes — "opens on …" | no |
| `published`, within window | yes | **yes** |
| `published`, past `deadline` | yes — "closed" | no |
| `closed` (manual or lapsed) | archive only | no |

**Rules to enforce server-side — none of these may live only in the UI:**

1. **A draft application may only be created against a `published` scholarship inside its window.** Checked in `createDraft`.
2. **Submission re-checks the window.** A draft started before the deadline must not be submittable after it — the check at submit is the one that counts, because the draft can sit for days.
3. **`program_id` is immutable after submit.** Otherwise an applicant could move a submitted application onto a different scholarship.
4. **Closing a scholarship does not touch applications already submitted.** They continue through review.
5. **Late/closed submissions return `409 CONFLICT`,** not 400 — the request is well-formed; the *state* refuses it. (`error-codes.enum.ts` already carries `CONFLICT`, added during the discussions work.)

---

## 7. API Specification

### Public

```
GET  /scholarship/opportunities                 @Public   list — published only
     ?level= &status=open|closed &page= &limit=
GET  /scholarship/opportunities/:slug           @Public   detail — 404 unless published
```

Keep `GET /scholarship/programs` as a thin alias for one release so the current landing page does not break mid-deploy; delete it in the cleanup phase.

**Projection.** Return only what a public page needs. Do **not** return the raw entity — the same discipline applied to the tracking leak (migration 051). No `createdBy`, no internal notes, no application counts unless deliberately published.

### Member

```
POST /scholarship/applications/draft            auth   { programId REQUIRED, … }
PUT  /scholarship/applications/:id/draft        auth   programId ignored if present
POST /scholarship/applications/:id/submit       auth   re-validates the window
```

### Admin (`@Permissions(SCHOLARSHIP_MANAGE)`)

```
GET    /admin/scholarship/programs              list, all statuses
POST   /admin/scholarship/programs              create (draft)
PATCH  /admin/scholarship/programs/:id          edit
POST   /admin/scholarship/programs/:id/publish  draft → published (validates required fields)
POST   /admin/scholarship/programs/:id/close    published → closed
DELETE /admin/scholarship/programs/:id          soft delete — refuse if applications exist
```

**Publish is a distinct action, not a status field on PATCH.** It is the moment the scholarship becomes public and must validate that title, description, eligibility and deadline are all present in at least the default language. A `status` writable through PATCH invites a half-composed scholarship going live.

---

## 8. Frontend Routes & Components

| Route | Status | Notes |
|---|---|---|
| `/services/scholarship` | **rework** | Landing. Open scholarships as cards; "Past scholarships" section below. Filter by level. |
| `/services/scholarship/[slug]` | **NEW** | Detail: description, eligibility, benefits, required documents, attachments, deadline, Apply CTA. |
| `/services/scholarship/apply?program=<slug>` | **rework** | Wizard with the scholarship **locked** — mirrors tenders' `?tender=` ([tender/apply/page.tsx:51](../apps/frontend/src/app/[locale]/services/tender/apply/page.tsx#L51)). Reaching `/apply` with no `program` redirects to the landing page rather than showing an unbound form. |
| `/services/scholarship/status` | unchanged | OTP-gated (migration 051). |

**Components**

- `ScholarshipProgramsList` → extend into `ScholarshipOpportunityList` (cards + level filter + open/past split). Its deadline and "closing soon" logic is already written and correct — reuse it.
- `ScholarshipOpportunityDetail` — **new**; model on [tenders/[slug]/page.tsx](../apps/frontend/src/app/[locale]/tenders/[slug]/page.tsx), which already solves deadline/status/attachment rendering.
- `ScholarshipWizard` — restore the binding removed at line 145: accept a locked scholarship, show it in the header, send `programId`, and drive the document step from `required_documents`.

**i18n.** New copy is needed in en/rw/ar for the detail page, the locked-scholarship header, and the closed/late states. Per established practice on this codebase, reuse existing strings where they exist and route genuinely new Kinyarwanda/Arabic copy to whoever owns translations rather than drafting it in-code.

---

## 9. Admin

Extend the existing `ProgramModal` rather than building a new screen:

- Tabbed **en / rw / ar** inputs for title, description, eligibility, benefits (jsonb i18n).
- Level, amount, slots, `opens_at`, `deadline`.
- Required-documents builder (which uploads the wizard will demand).
- Attachment upload for the call PDF.
- **Publish** / **Close** actions with a confirm step — consistent with the hajj admin confirm dialogs (`19abadc`) and the tender admin.
- Applications list gains a **scholarship filter**, and each scholarship shows its application count.

**Optional (recommend deferring):** a per-scholarship Kanban mirroring `TenderKanbanBoard`. Real value, but it is a second large frontend surface and is not required by the brief.

---

## 10. Backfill & Backwards Compatibility

**The hard constraint: existing applications have `program_id = NULL`** and cannot be made NOT NULL without a decision.

**Recommended:** create one synthetic scholarship — `status='closed'`, title "General Scholarship Applications (pre-2026)", `slug=null` so it never renders publicly — and attach every orphaned application to it inside migration 053, before the NOT NULL. Rationale: the invariant "every application belongs to a scholarship" becomes true everywhere, so no code path needs a null branch, and the admin console can still find historical applications.

Alternative (leave `program_id` nullable, enforce only in the DTO) is cheaper but leaves a permanent null-check in every consumer and no database guarantee. Not recommended.

**Deployment order matters:**

1. Migration 052 (additive) → deploy backend → old frontend still works via the `/programs` alias.
2. Admin authors and publishes at least one real scholarship.
3. Deploy the new frontend (landing, detail, bound wizard).
4. Migration 053 (backfill + NOT NULL) **only after** step 3, so nothing is creating unbound applications.
5. Cleanup release: drop `is_open`, drop the `/programs` alias.

---

## 11. Phasing

| Phase | Scope | Ships |
|---|---|---|
| **1 — Data & admin** | Migration 052; entity + DTOs; slug generation; publish/close actions; admin modal extended | Admin can compose and publish a scholarship. Nothing public changes. |
| **2 — Public surfaces** | `/opportunities` endpoints; landing rework; **detail page** | Applicants can browse and read. Apply button still points at the old wizard. |
| **3 — Bound application** | Wizard binding; `programId` required in DTO; window enforcement at create **and** submit; 409 handling | The flow the brief describes, end to end. |
| **4 — Integrity & cleanup** | Migration 053 (backfill, NOT NULL, one-per-scholarship index); drop `is_open`; drop `/programs` alias | Invariants enforced by the database. |

Phases 1–3 are each independently deployable and independently useful. Phase 4 must follow phase 3 in production.

---

## 12. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Orphaned applications block NOT NULL | **High** | §10 synthetic scholarship; phase 4 gated behind phase 3 |
| Deadline enforced only client-side | **High** | Re-check at submit, not just at draft creation (§6.2) — the draft may sit for days |
| Applicants mid-draft when a scholarship closes | Medium | Draft survives; submit returns 409 with an honest message. Decide whether to notify. |
| Landing page shows nothing on launch | Medium | Phase 1 ships first so admin can publish before phase 2 goes live |
| New trilingual copy | Medium | Reuse existing keys; route new rw/ar to translation owners |
| i18n jsonb diverging from `announcements` | Low | Copy the `{en,rw,ar}` shape and fallback rule verbatim |
| Conflict with tracking work (051) | Low | Disjoint — 051 touched tracking; this touches programs and binding |

---

## 13. Decisions Needed Before Build

1. **Storage: Option A or B?** (§3 — recommendation: **B**, extend `scholarship_programs`.)
2. **One application per person per scholarship?** Assumed yes (§5). If a person may apply to several *different* scholarships simultaneously — assumed yes — that is already allowed by the proposed index.
3. **Do scholarships need attachments** (a call-for-applications PDF), or is on-page description enough?
4. **Should the landing page show past/closed scholarships**, or only what is open? (Plan assumes an archive section — it is evidence of a real programme.)
5. **Per-scholarship Kanban board** now, or defer? (Recommend defer.)
6. **Backfill:** synthetic legacy scholarship, or keep `program_id` nullable? (Recommend synthetic.)

---

## 14. Definition of Done

- An admin can compose a scholarship in three languages, attach the call document, set eligibility, slots, open date and deadline, save it as a draft, and publish it deliberately.
- `/services/scholarship` lists open scholarships with level, amount and deadline, filterable by level, with closed ones in an archive.
- `/services/scholarship/[slug]` renders the full offer and its Apply CTA, and 404s for anything not published.
- Applying is only possible from a scholarship; the wizard shows which one and cannot be unbound.
- A submission after the deadline is refused **by the server** with a 409 and an honest message, even if the draft was started in time.
- Every application row has a `program_id`, enforced by the database.
- Existing applications remain visible in the admin console.
- Typecheck, lint and locale-key parity clean; the flow verified end to end against a running stack, not only unit-tested.
