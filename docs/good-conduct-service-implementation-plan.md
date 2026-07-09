# Good Conduct Certificate Service — Implementation Plan

**Project:** RMC Digital Platform — Good Conduct Certificate Service
**Document Type:** Implementation Plan
**Prepared by:** Senior Analyst
**Date:** 2026-07-08
**Version:** 1.0
**Related:** [Marriage Service Implementation Plan](./marriage-service-implementation-plan.md) (architectural precedent — this plan follows the same module conventions, corrected to match the codebase as actually built, not as originally planned)

---

## Table of Contents

1. [Project Context & Objectives](#1-project-context--objectives)
2. [What Is a "Good Conduct" Certificate](#2-what-is-a-good-conduct-certificate)
3. [Scope](#3-scope)
4. [Actors & Roles](#4-actors--roles)
5. [End-to-End Process Flow](#5-end-to-end-process-flow)
6. [Architecture Decisions](#6-architecture-decisions)
7. [Database Schema](#7-database-schema)
8. [API Specification](#8-api-specification)
9. [Validation & Approval Workflow](#9-validation--approval-workflow)
10. [Payment Flow (IntouchPay)](#10-payment-flow-intouchpay)
11. [Certificate Generation & Authenticity Verification](#11-certificate-generation--authenticity-verification)
12. [Notifications](#12-notifications)
13. [RBAC — Permissions](#13-rbac--permissions)
14. [Sprint Plan](#14-sprint-plan)
15. [Testing Strategy](#15-testing-strategy)
16. [Risk Register](#16-risk-register)
17. [Definition of Done](#17-definition-of-done)
18. [Claude Code Developer Prompts](#18-claude-code-developer-prompts)
19. [Appendices](#19-appendices)

---

## 1. Project Context & Objectives

### Background

The public services catalogue (`apps/frontend/src/app/[locale]/services/page.tsx`) already reserves a tile for this service under the slug `conduct`, currently rendered as a generic "Coming Soon" page (`services/[slug]/page.tsx`, `SERVICE_META['conduct']`, ETA "Q3 2026", `ShieldCheck` icon, indigo theme). No backend module, database tables, admin workflow, or certificate generation exist yet. This plan turns that placeholder into a fully working service, reusing the infrastructure already proven by the Marriage (Nikah) service: NestJS module pattern, IntouchPay mobile money, client-side `pdf-lib` certificate rendering, and the permission-based RBAC system.

A **Good Conduct Certificate** (locally: *Icyemezo cy'Imyitwarire Myiza*) is a document attesting that a community member is known to the mosque/community leadership as being of good moral standing — commonly required for jobs, visas, school admissions, or other administrative processes. Unlike the Rwanda National Police "certificate of good conduct" (criminal record extract), this is a **community/religious attestation** issued by RMC on behalf of a Masjid and its Imam, based on the applicant's known standing within that congregation.

### Business Objectives

| # | Objective | Measure of Success |
|---|-----------|---------------------|
| 1 | Let members request a Good Conduct certificate digitally | Requests persisted in PostgreSQL, no client-only state |
| 2 | Route each request to the correct Masjid/Imam for attestation | Request auto-associates with applicant's registered mosque, or a chosen mosque |
| 3 | Give Imams/admin staff a clear validation workflow | Admin dashboard with approve/reject/request-more-info actions, gated by permission |
| 4 | Collect the service fee before certificate issuance | Payment confirmed (IntouchPay MoMo, bank, or cash) before status can reach `approved` |
| 5 | Issue a verifiable digital certificate | PDF with certificate number + QR/verification link, downloadable by applicant |
| 6 | Allow anyone (employer, embassy, school) to verify authenticity | Public, no-auth verification endpoint + page, matching the marriage service's pattern |
| 7 | Track every request end-to-end for reporting | Status history audit trail; admin stats/reports view |
| 8 | Notify the applicant at each step | SMS at submission, under review, approved/rejected, payment confirmed, certificate ready |

### Constraints

- Backend stack: NestJS + TypeORM + PostgreSQL (existing conventions, do not introduce new patterns)
- Frontend stack: Next.js App Router + Tailwind + `next-intl` (en/rw/ar)
- Payment gateway: **IntouchPay** (`apps/backend/src/integrations/intouch-pay/intouch-pay.service.ts`) — the same gateway donations and marriage already use. Do **not** introduce MTN MoMo API directly; IntouchPay is the abstraction already wired to webhooks and admin payment settings.
- Certificate rendering: client-side `pdf-lib` overlay on a static template PDF, following `apps/frontend/src/lib/provisionalCertificate.ts` / `officialCertificate.ts`. Server-side `pdf-lib` + `qrcode` (as used in `members.service.ts`) is the precedent to follow if a scannable QR image is embedded directly in the PDF rather than a printed URL.
- RBAC: fully configurable `Role` + `Permission` enum system (`common/types/permissions.enum.ts`), not hardcoded "Imam" logins. An Imam who reviews requests does so via a role (e.g. "Imam Reviewer" or "Community Officer") carrying Good Conduct permissions — same pattern as marriage's "Marriage Officer" role.
- No Cell/Village entities exist in the DB (only Province/District/Sector/Area). Residence sub-levels below Sector must be free-text columns, matching how the marriage module itself stores province/district as plain varchar rather than FK.
- Languages: English, Kinyarwanda, Arabic — all new strings localized in all three `messages/*.json` files.

---

## 2. What Is a "Good Conduct" Certificate

Based on the reference form layout provided, the certificate/request must capture:

| Field | Notes |
|-------|-------|
| Full Names | Applicant's full legal name |
| Parents | Father's and mother's names (mirrors the marriage module's recent addition of father's names — see git history) |
| Residence | District, Sector, Cell, Village (Cell/Village as free text; District/Sector optionally FK to existing `District`/`Sector` entities) |
| Contact | Email and phone |
| Masjid of Address | The mosque the applicant is affiliated with/attends — FK to `mosques` entity |
| Imam | The Imam attesting to the applicant's conduct — resolved via `mosque_imams` join table, with a free-text fallback if the applicant names an Imam not yet in the system (mirrors marriage's `requestedOfficiant` + `assignedImamId` dual-field pattern) |
| Motif of the Request | Free-text reason (e.g. "employment", "visa application", "school admission") — should be a short enum + "other" free text for reporting purposes |

The output is a signed/stamped PDF certificate bearing a unique certificate number, issue date, the attesting Imam's name, the Masjid, and a way to verify authenticity.

---

## 3. Scope

### In Scope

- Backend NestJS module `good-conduct` (entities, member controller, admin controller, service, DTOs)
- Database migration for new tables
- Frontend: request form (single or short multi-step, given the form is simpler than marriage's), status tracking page, admin list + detail views
- Payment integration via existing `IntouchPayService` (MoMo primary; bank/cash manual confirmation, matching marriage/donations)
- Certificate generation (client-side `pdf-lib` overlay, following `provisionalCertificate.ts` pattern) with embedded QR code image and/or verify-URL text
- Public certificate verification endpoint + page
- SMS notifications at each status transition (reusing `SmsService` + `NotificationSettingsService` + a new `sms-templates.ts`)
- Admin dashboard: list/filter/search, approve/reject/request-more-info, mark payment received (cash/bank), issue certificate
- New `GOOD_CONDUCT_*` permissions, assignable to any role via `/admin/roles`
- Removal of the `conduct` placeholder from `services/[slug]/page.tsx` and `services/page.tsx` once live

### Out of Scope (Deferred)

- Automated criminal-background checks / NIDA integration — this is a community attestation, not a police record; verification is based on the Imam's/admin's own knowledge of the applicant
- Digital qualified electronic signatures — QR/URL-based verification only, matching marriage service precedent
- Multi-certificate-type templating engine — build Good Conduct as its own bespoke module first; a generic "service framework" is not part of this plan (matches the codebase's current bespoke-module convention, confirmed via research — there is no generic `Service` model to plug into)
- Email notifications — SMS only in Phase 1 (marriage service itself only wires SMS despite email infrastructure existing)

---

## 4. Actors & Roles

| Actor | Description |
|-------|--------------|
| **Applicant (Member)** | Logged-in RMC member requesting the certificate |
| **Imam / Reviewer** | Reviews the request against the applicant's known standing at the named Masjid; recorded via `assignedImamId` (FK to `mosque_imams`) once resolved. Acts through the admin panel under a role carrying `good_conduct:approve`, not a special hardcoded login type. |
| **Admin / Community Officer** | Staff who process the queue: verify contact/residence details, confirm payment, chase up Imam confirmation, issue the certificate |
| **Super Admin** | Full access; manages roles/permissions and payment rate configuration |
| **Public verifier (no login)** | Anyone with the certificate number/QR — an employer, embassy, or school — checking authenticity via the public verify page |

---

## 5. End-to-End Process Flow

```
1. REQUEST
   Applicant logs in → fills Good Conduct form (names, parents, residence,
   contact, masjid, imam, motif) → submits as DRAFT

2. PAYMENT
   Fee resolved from PaymentTypeRate (key: GOOD_CONDUCT_FEE)
   → Applicant pays via MoMo (IntouchPay), bank transfer, or cash
   → On MoMo: IntouchPayService.requestPayment() → webhook confirms →
     payment_status = 'paid' automatically
   → On bank/cash: payment_status = 'pending_cash' until admin confirms
   → Only once paid does status advance from DRAFT → SUBMITTED

3. TRACKING
   Applicant can view live status on a "Track my request" page
   (application number + optional phone/NID lookup, matching marriage's
   status page pattern) — statuses render with human-readable copy and
   next-step guidance

4. VALIDATION (Admin / Imam Reviewer)
   Admin/Imam reviewer opens request in admin queue → verifies:
     - Applicant is a known/active member of the stated Masjid
       (or admin manually confirms based on Imam's input)
     - Residence and contact details are plausible
     - No conflicting/duplicate active request for the same applicant
   → Action: APPROVE / REJECT (with reason) / REQUEST_MORE_INFO
     (applicant amends and resubmits, mirrors marriage's
     'amendments_requested' state)
   → Every transition logged to GoodConductStatusHistory with actor + notes

5. DOCUMENT GENERATION
   On APPROVE (and payment already confirmed):
     → Backend allocates certificate_number (sequence-based,
       format RMC-GC-<district-code>-<YYYYMM>-<seq>)
     → Backend marks status = APPROVED, stamps issued fields
     → Frontend (on demand, when applicant/admin opens the certificate
       page) renders the PDF client-side via pdf-lib, overlaying:
       full name, parents, residence, masjid, imam name, motif,
       certificate number, issue date, and a QR code image pointing to
       the public verify URL
     → Status advances to CLOSED once certificate is issued/downloaded
       for the first time (or on explicit "Issue Certificate" admin action)

6. SERVICE PAYMENT (recap)
   Already completed in step 2 — enforced as a precondition to submission,
   consistent with the marriage service's payment-gates-submission rule.
   A separate optional step allows admin to charge a reissue fee if the
   applicant needs a duplicate/replacement certificate later.

7. DOCUMENT AUTHENTICITY VERIFICATION
   Any third party scans the QR code or visits
   /verify/good-conduct/<certificate_number> (public, no auth)
   → Backend GET /good-conduct/public/verify/:certificateNumber returns
     minimal identity confirmation (full name, masjid, imam, issue date,
     status) ONLY if status === CLOSED/issued — mirrors marriage's
     public verify endpoint which returns nothing for non-closed/fake
     numbers (404), preventing enumeration of pending/rejected requests
```

State machine (mirrors marriage service, minus ceremony scheduling):

```
DRAFT ──(payment confirmed)──► SUBMITTED ──(admin/imam review)──► UNDER_REVIEW
    │                                                                   │
    │                                              ┌────────────────────┼──────────────────┐
    │                                              ▼                    ▼                  ▼
    │                                          APPROVED        MORE_INFO_REQUESTED      REJECTED
    │                                              │                    │
    │                                    (certificate issued)   (applicant amends)
    │                                              │                    │
    │                                          CLOSED ◄─────────────────┘
    │
    └──(applicant cancels, DRAFT/SUBMITTED only)──► CANCELLED
```

---

## 6. Architecture Decisions

### 6.1 Module Structure (Backend)

```
apps/backend/src/
└── good-conduct/
    ├── good-conduct.module.ts
    ├── good-conduct.controller.ts            ← member-facing routes
    ├── good-conduct-admin.controller.ts       ← admin-facing routes
    ├── good-conduct.service.ts                ← business logic, status machine
    ├── sms-templates.ts                       ← mirrors marriage/sms-templates.ts
    ├── dto/
    │   ├── create-good-conduct-request.dto.ts
    │   ├── update-good-conduct-status.dto.ts
    │   └── confirm-payment.dto.ts
    └── entities/
        ├── good-conduct-request.entity.ts
        ├── good-conduct-status-history.entity.ts
        └── good-conduct-transaction.entity.ts
```

Register in `app.module.ts` imports array, importing `NotificationSettingsModule`, `SmsModule`, `PaymentSettingsModule`, `IntouchPayModule`, `MosquesModule` — exactly as `MarriageModule` does.

### 6.2 Certificate Numbering

```
Format: RMC-GC-<district-code>-<YYYYMM>-<5-digit sequence>
Example: RMC-GC-01-202607-00013
```

New Postgres sequence `good_conduct_request_seq`; reuse `district-codes.ts` (or move it to a shared `common/` location if it will now be used by two modules — a small refactor worth doing here rather than duplicating the file a second time).

### 6.3 Payment Integration

Reuse `IntouchPayService` directly (no new gateway code):

```
1. Frontend: POST /good-conduct/requests (draft) → returns id + amountDue
2. Frontend: POST /good-conduct/requests/:id/pay { phoneNumber }
3. Backend: IntouchPayService.requestPayment(...) → returns providerRef
4. IntouchPay sends USSD push → applicant approves on their phone
5. IntouchPay calls the shared webhook: POST /webhooks/intouch-pay
   → WebhooksController resolves the generic PaymentTransaction,
     then dispatches to goodConductWebhook.handleCallback(payload)
     (new service, added alongside marriageWebhook/donationWebhook
     dispatch calls in webhooks.controller.ts)
6. GoodConductWebhookService looks up the request by providerRef,
   sets payment_status = 'paid', advances status DRAFT → SUBMITTED
7. Bank transfer → applicant marks "I've transferred", admin confirms
   manually (payment_status: pending → paid)
8. Cash → payment_status = 'pending_cash', officer confirms in person
```

Add `GOOD_CONDUCT_FEE` to `PaymentTypeKey` enum (`payment-type.entity.ts`) and seed a `PaymentType` + `PaymentTypeRate` row, admin-editable at `/admin/settings/payments` like the existing fee types.

### 6.4 Certificate Generation

Follow `provisionalCertificate.ts` exactly:
- Static A4 template PDF at `apps/frontend/public/templates/good-conduct-certificate.pdf` (designer-produced, flattened background with RMC letterhead/seal art)
- New `apps/frontend/src/lib/goodConductCertificate.ts` — overlay engine using `pdf-lib`, drawing: full name, parents' names, residence (district/sector/cell/village), masjid name, imam name, motif, certificate number, issue date
- **Recommended improvement over the marriage precedent**: embed an actual scannable QR code image (not just a printed URL), using the `qrcode` package's `toDataURL()` + `pdf.embedPng()`, exactly as already done in `members.service.ts`. This is a strictly-better pattern than marriage's text-only verify link and should be used here since it's already proven server-side; the frontend `qrcode` browser build can generate the same data URL client-side before embedding.
- Rendering page: `apps/frontend/src/app/[locale]/certificates/good-conduct/[number]/page.tsx` (or generalize the existing `certificates/[number]/page.tsx` route to branch by a `type` prefix in the certificate number — recommend the dedicated route first to avoid destabilizing the marriage certificate page in the same change).

### 6.5 RBAC — New Permissions

Extend `common/types/permissions.enum.ts`:

```typescript
GOOD_CONDUCT_VIEW = 'good_conduct:view',
GOOD_CONDUCT_MANAGE = 'good_conduct:manage',
GOOD_CONDUCT_APPROVE = 'good_conduct:approve',
GOOD_CONDUCT_CERTIFICATE = 'good_conduct:certificate',
GOOD_CONDUCT_REPORTS = 'good_conduct:reports',
```

Seed a new role, e.g. "Good Conduct Reviewer" (or extend an existing "Imam" / "Community Officer" role if one already exists), with `view + approve + certificate`. Super Admin gets all five by default.

---

## 7. Database Schema

### Migration — Good Conduct Service Tables

```sql
CREATE TABLE "good_conduct_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "certificate_number" varchar(40) UNIQUE,          -- assigned on approval, null before

  "applicant_id" uuid NOT NULL REFERENCES users(id),

  -- Identity
  "full_names" varchar(150) NOT NULL,
  "father_name" varchar(150),
  "mother_name" varchar(150),

  -- Residence (Cell/Village have no master-data entities yet — free text)
  "district_id" uuid REFERENCES districts(id),
  "sector_id" uuid REFERENCES sectors(id),
  "cell" varchar(100),
  "village" varchar(100),

  -- Contact
  "email" varchar(255),
  "phone" varchar(20) NOT NULL,

  -- Masjid / Imam
  "mosque_id" uuid REFERENCES mosques(id),
  "requested_imam_name" varchar(150),               -- free text as entered by applicant
  "assigned_imam_id" uuid REFERENCES mosque_imams(id),

  -- Request detail
  "motif" varchar(50) NOT NULL,                     -- enum-like: employment/visa/school/other
  "motif_detail" text,                              -- free text if motif = 'other' or extra context

  -- Status workflow
  "status" varchar(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','under_review','more_info_requested',
                      'approved','rejected','cancelled','closed')),
  "payment_status" varchar(20) NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','pending_cash','processing','paid','refunded','failed')),
  "amount_due" decimal(12,2) NOT NULL,
  "amount_paid" decimal(12,2) NOT NULL DEFAULT 0,

  -- Review
  "reviewed_by" uuid REFERENCES users(id),
  "reviewed_at" timestamptz,
  "review_notes" text,
  "rejection_reason" text,
  "more_info_requested" text,

  -- Certificate
  "certificate_url" varchar(500),
  "certificate_qr_payload" varchar(300),
  "certificate_issued_at" timestamptz,
  "certificate_issued_by" uuid REFERENCES users(id),

  "submitted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX ON "good_conduct_requests" ("status");
CREATE INDEX ON "good_conduct_requests" ("payment_status");
CREATE INDEX ON "good_conduct_requests" ("applicant_id");
CREATE INDEX ON "good_conduct_requests" ("mosque_id");
CREATE UNIQUE INDEX ON "good_conduct_requests" ("certificate_number");

CREATE TABLE "good_conduct_status_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id" uuid NOT NULL REFERENCES good_conduct_requests(id) ON DELETE CASCADE,
  "from_status" varchar(30),
  "to_status" varchar(30) NOT NULL,
  "changed_by" uuid REFERENCES users(id),
  "notes" text,
  "changed_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "good_conduct_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id" uuid NOT NULL REFERENCES good_conduct_requests(id),
  "method" varchar(20) NOT NULL CHECK (method IN ('momo', 'bank', 'cash')),
  "provider_ref" varchar(200),
  "amount" decimal(12,2) NOT NULL,
  "currency" varchar(10) NOT NULL DEFAULT 'RWF',
  "status" varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed','refunded')),
  "initiated_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz,
  "confirmed_by" uuid REFERENCES users(id),
  "metadata" jsonb
);

CREATE SEQUENCE good_conduct_request_seq;
```

---

## 8. API Specification

### 8.1 Member-Facing Endpoints (`good-conduct.controller.ts`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/good-conduct/requests` | JWT Member | Create draft request |
| `PATCH` | `/good-conduct/requests/:id` | JWT Member (own, draft/more_info only) | Edit request |
| `POST` | `/good-conduct/requests/:id/pay` | JWT Member | Initiate/retry MoMo payment |
| `POST` | `/good-conduct/requests/:id/pay/bank-notice` | JWT Member | Declare bank transfer made (awaiting admin confirm) |
| `GET` | `/good-conduct/requests/:id` | JWT Member (own) | Request details + status history |
| `GET` | `/good-conduct/requests` | JWT Member | List own requests |
| `POST` | `/good-conduct/requests/:id/cancel` | JWT Member | Cancel draft/submitted |
| `GET` | `/good-conduct/requests/:id/certificate-data` | JWT Member (own, status closed) | Data payload for client-side PDF render |

### 8.2 Admin Endpoints (`good-conduct-admin.controller.ts`)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/admin/good-conduct/requests` | `good_conduct:view` | List/filter/paginate |
| `GET` | `/admin/good-conduct/requests/:id` | `good_conduct:view` | Full detail |
| `PATCH` | `/admin/good-conduct/requests/:id/status` | `good_conduct:approve` | Approve / reject / request more info |
| `POST` | `/admin/good-conduct/requests/:id/assign-imam` | `good_conduct:manage` | Resolve `assigned_imam_id` |
| `POST` | `/admin/good-conduct/requests/:id/payment/confirm` | `good_conduct:manage` | Confirm cash/bank payment |
| `POST` | `/admin/good-conduct/requests/:id/certificate` | `good_conduct:certificate` | Allocate certificate number, mark issued |
| `GET` | `/admin/good-conduct/reports` | `good_conduct:reports` | Stats dashboard (counts, revenue) |
| `GET` | `/admin/good-conduct/reports/export` | `good_conduct:reports` | CSV export |

### 8.3 Public Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/good-conduct/public/verify/:certificateNumber` | None | Authenticity check — 404 unless status = `closed` |
| `GET` | `/good-conduct/public/fees` | None | Current fee schedule |

### 8.4 Payment Webhook

Add one dispatch line in the existing shared `webhooks.controller.ts` `POST /webhooks/intouch-pay` handler (alongside the existing marriage/donation dispatch calls):

```typescript
await this.goodConductWebhook.handleCallback(payload);
```

---

## 9. Validation & Approval Workflow

The core question at review time: **is this applicant actually known to the named Masjid/Imam as being of good standing?** Concretely, the admin/reviewer workflow should:

1. **Identity sanity check** — applicant's account details (name, phone) roughly match the request; flag if wildly different from the member profile on file.
2. **Masjid/Imam resolution** — if `mosque_id` is set and has a linked `MosqueImam`, the reviewer confirms directly. If the applicant typed a free-text `requested_imam_name` not yet in the system, admin either matches it to an existing `MosqueImam` (setting `assigned_imam_id`) or escalates for manual confirmation (e.g. a phone call, logged in `review_notes`).
3. **Duplicate/abuse check** — reject or flag if the same applicant already has an active (`submitted`/`under_review`/`approved`) request; a closed one from long ago is fine (reissue).
4. **Decision** — `APPROVE`, `REJECT` (reason required), or `MORE_INFO_REQUESTED` (what's missing, applicant can edit and resubmit while in that state).
5. Every transition writes a `GoodConductStatusHistory` row (`changed_by`, `notes`) — this is the audit trail an auditor or the Imam can review later, and what backs the admin "status timeline" UI (mirrors marriage's pattern exactly).
6. Approval requires `payment_status = 'paid'` — enforced in `good-conduct.service.ts`, not just in the UI, to prevent a client bypassing payment.

---

## 10. Payment Flow (IntouchPay)

Reuse `apps/backend/src/integrations/intouch-pay/intouch-pay.service.ts` as-is — no new gateway integration work needed, only wiring:

- `IntouchPayModule` imported into `GoodConductModule`
- Fee resolved via `PaymentSettingsService.getActiveRates(PaymentTypeKey.GOOD_CONDUCT_FEE)` with a hardcoded fallback constant, matching marriage's `service.ts` lines 41-107 pattern
- `GoodConductTransaction` row inserted on every payment attempt (mirrors `MarriageTransaction`)
- Reconciliation: if a scheduled job like `donation-reconciliation.service.ts` exists for donations, add an equivalent (or extend a generic one, if one gets built) to catch missed webhook callbacks
- `PaymentEventsService` SSE dashboard already picks up any `PaymentTransaction` update automatically — no extra work needed there since the webhook controller updates the generic transaction record before dispatching to domain services

---

## 11. Certificate Generation & Authenticity Verification

### 11.1 Generation

- Client-side, on-demand rendering via `pdf-lib`, following `provisionalCertificate.ts`/`officialCertificate.ts` exactly (same coordinate-overlay technique on a flattened template PDF)
- Certificate number allocated server-side at approval time (sequence-based, never client-generated)
- QR code: embed an actual scannable PNG (via `qrcode` + `pdf.embedPng`), encoding the public verify URL, e.g. `https://rmc.rw/verify/good-conduct/RMC-GC-01-202607-00013` — this is a deliberate improvement over the marriage certificate's text-only link, using a pattern already proven server-side in `members.service.ts`

### 11.2 Authenticity Verification

- Public page `apps/frontend/src/app/[locale]/verify/good-conduct/[number]/page.tsx` (or a shared `[type]/[number]` verify route if refactoring alongside marriage — recommend keeping them separate routes initially to avoid coupling two services' release schedules)
- Calls `GET /good-conduct/public/verify/:certificateNumber`
- Returns only if `status === 'closed'`: full name, masjid name, imam name, issue date, motif — **never** returns applicant contact info (phone/email) or residence detail to the public, unlike the internal admin view, to protect applicant privacy while still proving authenticity
- Non-existent or non-issued certificate numbers return 404 — prevents enumerating pending/rejected requests (matches marriage's precedent)

---

## 12. Notifications

New SMS event keys (seeded via `database/seeds/`, toggle-able in `/admin/settings`):

- `goodConduct.submission` — "Your Good Conduct request #{number} has been received."
- `goodConduct.payment_confirmed` — payment receipt confirmation
- `goodConduct.under_review` — request picked up by a reviewer
- `goodConduct.more_info_requested` — what's missing, link to edit
- `goodConduct.approved` — approved, certificate being prepared
- `goodConduct.rejected` — reason + how to reapply
- `goodConduct.certificate_ready` — certificate ready, link to download/verify

Implementation mirrors `marriage.service.ts` lines 1044-1163: a private fire-and-forget `dispatchSms()` helper, individual `sendXxxSms()` methods gated by `notifSettings.isSmsEnabled(key)`, templates in a new `good-conduct/sms-templates.ts`.

---

## 13. RBAC — Permissions

See §6.5. Summary of who gets what by default:

| Role | Permissions |
|------|-------------|
| Super Admin | all 5 `good_conduct:*` |
| Good Conduct Reviewer (new role, or extend existing Imam/Officer role) | `view`, `approve`, `certificate` |
| General Admin Staff | `view`, `manage` (payment confirmation, imam assignment) but not `approve` if separation of duties is desired |
| Member | none of the above — access is scoped to their own requests via ownership checks in the member controller, not permissions |

---

## 14. Sprint Plan

> 2-week sprints, 2-developer team assumption. Good Conduct is materially simpler than marriage (no ceremony scheduling, no witnesses/wali, single-party applicant), so this plan is **5 sprints (10 weeks)** rather than marriage's 7.

### Sprint 0 — Foundations (Week 1–2)
- Migration for the 3 new tables + sequence
- `GoodConductModule` scaffold, empty controllers/service
- Add `GOOD_CONDUCT_FEE` to `PaymentTypeKey`, seed rate
- Add `GOOD_CONDUCT_*` permissions to enum, seed "Good Conduct Reviewer" role
- Wireframes for request form + admin detail view
- Remove `conduct` placeholder gating is deferred to Sprint 4 (keep "Coming Soon" live until feature is ready)

### Sprint 1 — Core Backend + Request Form (Week 3–4)
- Entities, DTOs with class-validator (full name, phone, email format, motif enum)
- `POST/GET/PATCH /good-conduct/requests` endpoints, ownership checks
- Certificate/application number sequence generator
- Frontend request form (single page or 2-step: identity+residence, masjid+motif), mosque dropdown from existing `/public/mosques`-style endpoint
- Status/tracking page (application number + phone lookup)

### Sprint 2 — Payment Integration (Week 5–6)
- `POST /good-conduct/requests/:id/pay` → `IntouchPayService.requestPayment()`
- `GoodConductWebhookService` + dispatch line in `webhooks.controller.ts`
- Bank/cash manual confirmation flow (admin + frontend notice)
- `GoodConductTransaction` logging
- Payment gates submission (draft → submitted only after paid)

### Sprint 3 — Admin Dashboard & Validation Workflow (Week 7–8)
- `AdminSidebar.tsx` entry behind `good_conduct:view`
- `/admin/good-conduct` list (filters: status, payment status, mosque, search)
- `/admin/good-conduct/[id]` detail: approve/reject/more-info actions, imam assignment, payment confirm, status history timeline
- Reports/stats view + CSV export
- SMS notifications wired at each transition

### Sprint 4 — Certificate Generation, Verification & Launch (Week 9–10)
- Certificate template PDF design + `lib/goodConductCertificate.ts` overlay engine (with embedded QR PNG)
- `certificates/good-conduct/[number]/page.tsx` render/download page
- Public `verify/good-conduct/[number]` page + `GET /good-conduct/public/verify/:certificateNumber`
- Remove `conduct` from `SERVICE_META`/`VALID_SLUGS` coming-soon list; link real tile from `services/page.tsx`
- E2E test: submit → pay → approve → certificate → verify
- Accessibility + RTL pass, localization strings in all 3 locales
- UAT with staff + a small group of members; production deploy behind a feature flag

---

## 15. Testing Strategy

| Layer | Target |
|-------|--------|
| Backend unit tests | ≥80% on `good-conduct.service.ts` |
| Backend integration tests | All endpoints × auth scenarios (member-owns-request checks, permission gates) |
| E2E (Playwright) | Happy path; more-info-requested path; rejection path |
| Security | Payment webhook signature/HMAC validation; public verify endpoint cannot leak PII or enumerate non-issued certificates |
| Accessibility | axe-core automated + manual keyboard nav on request form and admin detail view |

Key unit test cases:
- [ ] Cannot submit (advance past draft) while `payment_status != 'paid'`
- [ ] Public verify returns 404 for draft/rejected/nonexistent certificate numbers
- [ ] Public verify response never includes phone/email/residence
- [ ] Status history row written on every transition
- [ ] Duplicate active request from the same applicant is flagged/blocked
- [ ] Certificate number is server-generated and sequential, never client-supplied

---

## 16. Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| R1 | "Good standing" has no objective test — approval is subjective/manual | High | Medium | Accept as inherent to the service; provide reviewers a clear checklist (§9) rather than automating judgment |
| R2 | Applicant's named Imam/Masjid not yet in the system | Medium | Medium | Free-text fallback fields + admin manual resolution, same as marriage's `requestedOfficiant` |
| R3 | Cell/Village have no master data — free text invites inconsistent spelling | Medium | Low | Acceptable for Phase 1; consider a lookup table in a later phase if reporting needs it |
| R4 | Certificate misuse if verify page leaks too much personal data | Low | High | Enforce the minimal-disclosure rule in §11.2 in code review, not just in this doc |
| R5 | Reissue/duplicate-certificate requests not modeled | Medium | Low | `CLOSED` requests can be reopened via a simple "request reissue" action charging the reissue fee — small addition, can be Sprint 5 if needed |
| R6 | Confusion with the unrelated Rwanda National Police "certificate of good conduct" | Medium | Medium | Copy on the request form must clearly state this is a community/religious attestation from RMC, not a police background check |

---

## 17. Definition of Done

Same bar as the marriage service (see [marriage-service-implementation-plan.md §12](./marriage-service-implementation-plan.md#12-definition-of-done)):
1. PR merged with ≥1 reviewer approval
2. Automated tests pass; no new ESLint errors
3. Endpoints documented (Swagger decorators)
4. Strings localized in en/rw/ar
5. Mobile (375px) and RTL tested
6. No sensitive fields logged
7. QA sign-off in test environment

---

## 18. Claude Code Developer Prompts

Each prompt below is self-contained — paste it into a fresh Claude Code session (or hand to a subagent) for that slice of work. Each references this document and the marriage service as the architectural precedent, and assumes the prior prompt's sprint has already landed.

### 18.1 Prompt — Backend Module Developer (Sprints 0–1)

```
You are implementing the backend for a new "Good Conduct Certificate" service
in the RMC App (NestJS + TypeORM + PostgreSQL, apps/backend/src/).

Read docs/good-conduct-service-implementation-plan.md in full first — it has
the exact schema, API spec, and state machine. Use apps/backend/src/marriage/
as your structural precedent (entities/, dto/, marriage.module.ts,
marriage.controller.ts, marriage-admin.controller.ts, marriage.service.ts) —
match its conventions closely (naming, status-history audit pattern,
permission decorators) rather than inventing new ones.

Do this work:
1. Write a TypeORM migration creating good_conduct_requests,
   good_conduct_status_history, good_conduct_transactions, and the
   good_conduct_request_seq sequence, exactly per §7 of the plan doc.
2. Create apps/backend/src/good-conduct/ with entities for all three tables
   (mirror marriage-application.entity.ts's enum + column style).
3. Add GOOD_CONDUCT_VIEW/MANAGE/APPROVE/CERTIFICATE/REPORTS to
   common/types/permissions.enum.ts, following the existing MARRIAGE_*
   entries exactly.
4. Add GOOD_CONDUCT_FEE to the PaymentTypeKey enum in
   payment-settings/entities/payment-type.entity.ts.
5. Implement good-conduct.service.ts with: draft creation, ownership-scoped
   read/list/update, a status state machine matching §5 of the plan
   (draft -> submitted -> under_review -> approved/rejected/more_info_requested
   -> closed, plus cancelled), and a recordStatusChange() helper that writes
   to good_conduct_status_history on every transition (copy the pattern from
   marriage.service.ts's recordStatusChange()).
6. Implement good-conduct.controller.ts (member-facing) and
   good-conduct-admin.controller.ts (admin-facing, permission-gated) per the
   endpoint table in §8 of the plan. Do NOT implement payment or certificate
   endpoints yet — stub them to throw NotImplementedException; a later prompt
   covers those.
7. Enforce server-side (not just DTO validation) that a request cannot be
   approved while payment_status != 'paid' — this must live in the service,
   not be trusted from the client.
8. Register GoodConductModule in app.module.ts.
9. Write unit tests for the state machine and ownership checks, matching
   whatever test framework/style exists for marriage.service.spec.ts (check
   if one exists first).

Do not touch any frontend files, payment gateway code, or certificate
generation — those are separate prompts. When done, summarize what you built
and any deviations from the plan doc with justification.
```

### 18.2 Prompt — Payments Integration Developer (Sprint 2)

```
You are wiring payment collection for the new Good Conduct service in the RMC
App backend (apps/backend/src/good-conduct/, already scaffolded — read
docs/good-conduct-service-implementation-plan.md §10 first).

The payment gateway is IntouchPay, NOT MTN MoMo directly — the existing
reusable client is apps/backend/src/integrations/intouch-pay/intouch-pay.service.ts.
Do not write any new gateway/HTTP integration code; only wire the existing
service. Use apps/backend/src/marriage/ (specifically how marriage.module.ts
imports IntouchPayModule, and how marriage.service.ts calls
IntouchPayService.requestPayment()/getTransactionStatus()) as your exact
precedent.

Do this work:
1. Import IntouchPayModule and PaymentSettingsModule into GoodConductModule.
2. Implement POST /good-conduct/requests/:id/pay: resolve the fee via
   PaymentSettingsService.getActiveRates(PaymentTypeKey.GOOD_CONDUCT_FEE)
   (with a hardcoded fallback constant if no rate is configured, matching
   marriage.service.ts lines ~41-107), call
   IntouchPayService.requestPayment(), and insert a GoodConductTransaction
   row with status 'pending'.
2. Implement POST /good-conduct/requests/:id/pay/bank-notice for the manual
   bank-transfer declaration flow (sets payment_status = 'processing' or
   similar pending-admin-confirmation state).
3. Create apps/backend/src/webhooks/good-conduct-webhook.service.ts,
   mirroring marriage-webhook.service.ts exactly: look up the
   GoodConductTransaction by providerRef, update payment_status = 'paid' on
   success, advance the parent request's status from draft to submitted,
   and trigger the payment-confirmed SMS (stub the SMS call if the
   notification module isn't wired yet — a later prompt covers SMS).
4. Add ONE line to the existing webhooks.controller.ts intouch-pay callback
   handler dispatching to this new service, in the same sequence as the
   existing marriageWebhook/donationWebhook calls. Do not restructure that
   controller beyond adding this one call.
5. Implement admin cash/bank payment confirmation:
   POST /admin/good-conduct/requests/:id/payment/confirm, permission-gated
   by good_conduct:manage, following marriage's adminConfirmCashPayment
   pattern.
6. Seed a GOOD_CONDUCT_FEE PaymentType + a sensible default PaymentTypeRate
   row (check how marriage's MOSQUE_RATE_CODE/OUTSIDE_MOSQUE_CODE rates were
   seeded and follow the same seed-file convention).

Verify end-to-end in a dev/sandbox environment if IntouchPay sandbox
credentials are available; otherwise verify via unit/integration tests that
mock IntouchPayService. Report what you built and flag anything that needs
real sandbox credentials to fully verify.
```

### 18.3 Prompt — Frontend Applicant-Facing Developer (Sprint 1, parallel with 18.1)

```
You are building the member-facing frontend for the new Good Conduct
Certificate service in the RMC App (Next.js App Router, apps/frontend/src/,
Tailwind, next-intl for en/rw/ar). Read
docs/good-conduct-service-implementation-plan.md first, especially §2 (what
fields are required) and §5 (process flow).

The services catalogue already has a placeholder for this at slug "conduct"
(see apps/frontend/src/app/[locale]/services/page.tsx and
services/[slug]/page.tsx's SERVICE_META['conduct']) rendering a generic
"Coming Soon" page. Do NOT remove that placeholder yet — a later prompt
handles the cutover once the backend is fully live. For now, build the real
pages at a new route: apps/frontend/src/app/[locale]/services/good-conduct/
with apply/page.tsx and status/page.tsx, using
apps/frontend/src/app/[locale]/services/marriage/{apply,status}/ as your
structural and styling precedent (do not copy marriage's multi-step wizard
complexity — this form is much simpler, a single page or 2-step is enough:
step 1 identity/parents/residence/contact, step 2 masjid/imam/motif +
payment).

Do this work:
1. Build the request form: full names, father's name, mother's name,
   district (dropdown, existing public districts endpoint if one exists),
   sector (dependent dropdown), cell (free text), village (free text), email,
   phone, mosque (dropdown, existing public mosques endpoint), imam name
   (free text — the applicant names who they expect to attest, it gets
   resolved by admin later), motif (select: employment/visa/school/other,
   with a free-text field if "other"). Client-side validation before submit.
2. Wire it to POST /good-conduct/requests (assume this endpoint exists per
   the backend plan; if it doesn't exist yet in your branch, build against
   the DTO shape documented in the plan and coordinate/flag this).
3. Build the payment step: fee amount display, MoMo phone number entry +
   "Pay Now" (calls POST /good-conduct/requests/:id/pay), a polling/status
   check for payment confirmation (mirror however marriage's payment step
   polls), and a bank-transfer alternative showing RMC bank details with an
   "I've made the transfer" notice button.
4. Build the status/tracking page: lookup by application number (+ maybe
   phone for verification), rendering each status state from §5 of the plan
   doc with clear applicant-facing copy per state (especially
   more_info_requested, which should let the applicant edit and resubmit).
5. Add all new strings to messages/en.json, messages/rw.json, and
   messages/ar.json — do not leave any hardcoded English strings in the
   components.
6. Test the form and status page at a 375px mobile viewport and in the
   Arabic (RTL) locale before reporting done.

Do not modify the admin panel, certificate generation, or the services
catalogue/coming-soon page — those are separate prompts.
```

### 18.4 Prompt — Admin Panel Developer (Sprint 3)

```
You are building the admin/reviewer dashboard for the new Good Conduct
Certificate service in the RMC App frontend (Next.js, apps/frontend/src/app/
[locale]/admin/). Read docs/good-conduct-service-implementation-plan.md
first, especially §9 (validation workflow) and §13 (permissions).

Use apps/frontend/src/app/[locale]/admin/marriage/page.tsx and
admin/marriage/[id]/page.tsx as your direct structural precedent — same
stats-cards-plus-filterable-table layout for the list page, same
detail-view-with-action-panel layout for the detail page. Assume the backend
endpoints in §8.2 of the plan doc exist (GET/PATCH on
/admin/good-conduct/requests).

Do this work:
1. Add a "Good Conduct" entry to components/admin/AdminSidebar.tsx's
   NAV_ITEMS array, gated by Permission.GOOD_CONDUCT_VIEW (check
   common lib/permissions.ts or wherever the Permission enum is mirrored on
   the frontend — add GOOD_CONDUCT_* there too if it's a separate frontend
   copy of the backend enum).
2. Build /admin/good-conduct/page.tsx: stats cards (total, pending, under
   review, approved this month), filters (status, payment status, mosque,
   search by name/phone), paginated table, wrapped in ProtectedRoute gated
   by Permission.GOOD_CONDUCT_VIEW.
3. Build /admin/good-conduct/[id]/page.tsx: full request detail (identity,
   parents, residence, contact, masjid/imam, motif), a status action panel
   (Approve / Reject with required reason / Request More Info with required
   notes) gated by Permission.GOOD_CONDUCT_APPROVE, an "Assign Imam" control
   (searchable dropdown of MosqueImam records for the request's mosque, or
   manual note if not found) gated by GOOD_CONDUCT_MANAGE, a payment section
   showing payment_status with a manual "Confirm Cash/Bank Payment" button
   gated by GOOD_CONDUCT_MANAGE, and a status history timeline component.
4. Build a reports view (or a tab on the list page) showing basic stats
   (counts by status, revenue collected) gated by Permission.GOOD_CONDUCT_
   REPORTS, with a CSV export button.
5. All admin-facing strings localized in en/rw/ar same as the rest of the
   admin panel.

Do not build the certificate generation/download UI or the public
verification page — those are a separate prompt. When done, test that a
user without GOOD_CONDUCT_VIEW permission cannot see the sidebar entry or
load the pages directly by URL.
```

### 18.5 Prompt — Certificate & Verification Developer (Sprint 4)

```
You are implementing PDF certificate generation and public authenticity
verification for the new Good Conduct Certificate service in the RMC App.
Read docs/good-conduct-service-implementation-plan.md §11 first.

Certificates in this codebase are rendered CLIENT-SIDE in the browser using
pdf-lib overlaying a static flattened template PDF — there is no
server-side PDF generation for certificates. Study
apps/frontend/src/lib/provisionalCertificate.ts closely; it is your exact
template for the overlay technique (pixel-to-point coordinate scaling,
loading a background PDF from /public/templates/, drawing text fields and
optionally photos at fixed coordinates). Also study
apps/backend/src/members/members.service.ts's use of `qrcode`'s
QRCode.toDataURL() combined with pdf-lib's embedPng() — that is the pattern
to follow for embedding an ACTUAL SCANNABLE QR code image, which is better
than marriage's certificate (marriage only prints a verify URL as text, it
does not embed a real QR image — do not copy that specific gap).

Do this work:
1. Coordinate with whoever has the RMC certificate template artwork (a
   designer deliverable — if no template PDF exists yet at
   apps/frontend/public/templates/good-conduct-certificate.pdf, flag this
   clearly as a blocker and use a simple placeholder layout so the
   engineering work isn't blocked, but do not fabricate an official-looking
   RMC seal/letterhead yourself).
2. Create apps/frontend/src/lib/goodConductCertificate.ts: loads the
   template, overlays full name, parents' names, residence (district/
   sector/cell/village), mosque name, imam name, motif, certificate number,
   and issue date at defined coordinates, and embeds a QR code PNG (generate
   the data URL client-side using the `qrcode` package's toDataURL, encoding
   the public verify URL https://<domain>/verify/good-conduct/<certNumber>,
   then pdf.embedPng() it onto the page).
3. Create apps/frontend/src/app/[locale]/certificates/good-conduct/[number]/
   page.tsx: loads the request data via
   GET /good-conduct/requests/:id/certificate-data (member's own, status
   must be approved/closed), builds the PDF blob client-side, displays it in
   an iframe with Print/Download buttons — mirror
   certificates/[number]/page.tsx's structure.
4. Backend: implement GET /good-conduct/public/verify/:certificateNumber
   (no auth) returning ONLY full name, mosque name, imam name, issue date,
   and motif — NEVER phone, email, or residence — and only when status ===
   'closed'; return 404 otherwise (do not distinguish "doesn't exist" from
   "exists but not issued" in the response, to avoid leaking which
   certificate numbers are real-but-pending).
5. Build apps/frontend/src/app/[locale]/verify/good-conduct/[number]/
   page.tsx: a clean public page (no login) showing the verification result
   or a clear "not found / not yet issued" message.
6. Backend: implement POST /admin/good-conduct/requests/:id/certificate
   (permission good_conduct:certificate) that allocates the certificate
   number from the good_conduct_request_seq sequence (format
   RMC-GC-<district-code>-<YYYYMM>-<seq>, reusing district-codes.ts) and
   advances status to closed. Never allocate a certificate number anywhere
   on the client.

Test the full loop yourself: create a test request through the app, get it
approved, issue the certificate, download the PDF, scan or manually visit
the QR's URL, and confirm the verify page shows correct minimal data. Report
any missing template asset as a blocker rather than working around it with
fabricated official branding.
```

### 18.6 Prompt — QA / Launch Developer (End of Sprint 4)

```
You are doing pre-launch QA and cutover for the Good Conduct Certificate
service in the RMC App. Read
docs/good-conduct-service-implementation-plan.md in full — all backend,
frontend, payment, and certificate pieces should already be merged from
prior work (check git log / open PRs for "good-conduct" or "good conduct"
to confirm what's actually landed before assuming anything is done).

Do this work:
1. Run the three critical end-to-end paths manually (or via Playwright if
   an E2E suite pattern already exists for marriage — check
   apps/frontend or a top-level e2e/ directory):
   a. Happy path: register/login -> submit request -> pay via MoMo sandbox
      (or bank/cash manual flow if MoMo sandbox isn't available) -> admin
      approves -> certificate issued -> download -> verify via public page.
   b. More-info-requested path: submit -> admin requests more info ->
      applicant edits and resubmits -> admin approves.
   c. Rejection path: submit -> admin rejects with reason -> applicant sees
      the reason on their status page.
2. Confirm the payment-gates-submission rule cannot be bypassed by calling
   the API directly with a tool like curl/Postman while payment_status is
   still 'unpaid' (this must be a 4xx server-side rejection, not just a
   disabled frontend button).
3. Confirm the public verify endpoint never returns phone/email/residence,
   and returns identical 404-style responses for both nonexistent
   certificate numbers and real-but-not-yet-issued ones.
4. Check accessibility (axe-core or manual) and RTL rendering on the apply
   form, status page, and admin detail page.
5. Confirm all new strings appear correctly in en, rw, and ar locales (no
   raw translation keys visible in the UI).
6. Only after all of the above pass: update
   apps/frontend/src/app/[locale]/services/page.tsx and
   services/[slug]/page.tsx to remove the 'conduct' placeholder/coming-soon
   entry and link the real /services/good-conduct route.
7. Produce a short launch checklist / sign-off note listing what was
   tested, what passed, and any known issues deferred to a follow-up, rather
   than a long report — this project's convention favors terse, actionable
   summaries.

Do not make functional changes to already-merged backend/frontend code as
part of this pass — file/flag bugs found rather than silently fixing scope
beyond what's needed to unblock the cutover, unless the fix is trivial
(typo, obvious off-by-one) and clearly in scope of what you touched.
```

---

## 19. Appendices

### Appendix A — New Permissions Seed

```typescript
const goodConductReviewerPermissions = [
  'good_conduct:view',
  'good_conduct:approve',
  'good_conduct:certificate',
];

const goodConductOfficerPermissions = [
  'good_conduct:view',
  'good_conduct:manage',
];

// Insert role: name="Good Conduct Reviewer", permissions=goodConductReviewerPermissions
// Insert role: name="Good Conduct Officer", permissions=goodConductOfficerPermissions
// Super Admin role: append all good_conduct:* permissions to its existing set
```

### Appendix B — Environment Variables

No new environment variables should be required — IntouchPay credentials, SMS provider credentials, and the shared webhook URL are already configured for marriage/donations and are reused as-is. If a dedicated notification "from" identity is desired for Good Conduct SMS, reuse the existing shared SMS sender configuration; do not introduce a parallel credential set.

### Appendix C — Field/Enum Reference

```typescript
export enum GoodConductStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  MORE_INFO_REQUESTED = 'more_info_requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  CLOSED = 'closed',
}

export enum GoodConductMotif {
  EMPLOYMENT = 'employment',
  VISA = 'visa',
  SCHOOL = 'school',
  OTHER = 'other',
}
```

---

*This plan is a living document, following the same convention as the marriage service plan. Update after each sprint retrospective.*
