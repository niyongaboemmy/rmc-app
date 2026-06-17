# Marriage Service — Implementation Plan

**Project:** RMC Digital Platform — Marriage (Nikah) Service  
**Document Type:** Implementation Plan  
**Prepared by:** Senior Project Manager  
**Date:** 2026-06-12  
**Version:** 1.0  
**Input:** [Gap Analysis Report](./marriage-service-gap-analysis.md)

---

## Table of Contents

1. [Project Context & Objectives](#1-project-context--objectives)
2. [Scope](#2-scope)
3. [Team & Roles](#3-team--roles)
4. [Architecture Decisions](#4-architecture-decisions)
5. [Database Schema Changes](#5-database-schema-changes)
6. [API Specification](#6-api-specification)
7. [Sprint Plan](#7-sprint-plan)
8. [Frontend Implementation](#8-frontend-implementation)
9. [Backend Implementation](#9-backend-implementation)
10. [Testing Strategy](#10-testing-strategy)
11. [Risk Register](#11-risk-register)
12. [Definition of Done](#12-definition-of-done)
13. [Dependencies & Blockers](#13-dependencies--blockers)
14. [Milestones & Timeline](#14-milestones--timeline)

---

## 1. Project Context & Objectives

### Background

The Marriage (Nikah) Service frontend was built as a polished UI prototype. All application submissions are silently stored in browser `localStorage` and never reach any server. No backend endpoints, no payment processing, no admin workflow, and no certificate generation exist. The system is currently non-functional for real-world use.

### Business Objectives

| # | Objective | Measure of Success |
|---|-----------|-------------------|
| 1 | Enable members to apply for Nikah services digitally | Applications successfully persisted in PostgreSQL |
| 2 | Enable staff to review, approve, and manage applications | Admin dashboard live with RBAC-gated access |
| 3 | Enable payment collection before ceremony scheduling | Payment confirmed before status advances to `approved` |
| 4 | Issue verifiable digital marriage certificates | PDF certificate with QR code generated and downloadable |
| 5 | Notify applicants at every status change | Email + SMS sent on each status transition |
| 6 | Enforce Islamic jurisprudence requirements | Wali consent, mahr, imam assignment all captured |
| 7 | Modernise the UX to a guided multi-step wizard | Bounce rate on apply page reduced; form completion rate >80% |

### Constraints

- Backend stack: NestJS + TypeORM + PostgreSQL (must remain)
- Frontend stack: Next.js 14 (App Router) + Tailwind CSS + next-intl (must remain)
- Auth system: JWT + RBAC already built — must integrate, not replace
- File storage: MinIO already configured — must use for document and certificate storage
- Email: nodemailer already wired in `auth.service.ts` — extend for notifications
- QR Code: `qrcode` package already installed — reuse for certificates
- Languages: English, Kinyarwanda, Arabic — all strings must be localized

---

## 2. Scope

### In Scope

- Marriage application backend API (NestJS module)
- Database migration (new marriage-specific tables)
- Frontend refactor: single-page form → multi-step wizard
- Payment integration (MTN MoMo API minimum; bank/cash as manual confirmation)
- Admin marriage dashboard (list, filter, review, approve/reject, assign imam)
- Imam availability and assignment module
- Certificate generation (PDF + QR verification)
- Email notifications (submission, approval, rejection, ready)
- SMS notifications (optional, Phase 2)
- Status page real-time updates (polling)
- Accessibility remediation
- Full localisation of all new strings

### Out of Scope (Deferred)

- Integration with Rwanda National ID Authority (NIDA) for NID verification — manual review only
- SMS gateway integration — email only in Phase 1
- Mobile app — web only
- Certificate digital signature (qualified electronic signature) — QR-based verification only
- Other service types (funeral conduct, etc.) — marriage only

---

## 3. Team & Roles

| Role | Responsibility |
|------|---------------|
| **Project Manager** | Sprint planning, risk tracking, stakeholder communication, blocker escalation |
| **Backend Developer (Lead)** | NestJS module, TypeORM entities, API endpoints, payment integration, certificate generation |
| **Frontend Developer** | Multi-step wizard refactor, API integration, admin dashboard components |
| **UI/UX Designer** | Wizard wireframes, certificate template design, admin layout |
| **QA Engineer** | Test case authoring, regression testing, accessibility audit |
| **DevOps** | MinIO bucket configuration, environment variables, deployment pipeline |

### RACI Matrix (Abbreviated)

| Deliverable | PM | BE Dev | FE Dev | Designer | QA | DevOps |
|-------------|----|----|----|----|----|----|
| DB migration | I | R | I | — | A | C |
| API endpoints | A | R | C | — | A | I |
| Multi-step form | A | C | R | C | A | — |
| Admin dashboard | A | C | R | C | A | — |
| Certificate PDF | I | R | C | R | A | C |
| Payment gateway | A | R | C | — | A | C |
| Notifications | I | R | I | — | A | I |
| Deployment | A | C | C | — | C | R |

---

## 4. Architecture Decisions

### 4.1 Module Structure (Backend)

Follow the existing NestJS module pattern:

```
apps/backend/src/
└── marriage/
    ├── marriage.module.ts
    ├── marriage.controller.ts
    ├── marriage.service.ts
    ├── marriage-admin.controller.ts       ← separate admin routes
    ├── certificate.service.ts             ← PDF + QR generation
    ├── marriage-notification.service.ts   ← email notifications
    ├── dto/
    │   ├── create-marriage-application.dto.ts
    │   ├── update-application-status.dto.ts
    │   ├── assign-imam.dto.ts
    │   └── schedule-ceremony.dto.ts
    └── entities/
        ├── marriage-application.entity.ts
        ├── marriage-document.entity.ts
        └── imam-availability.entity.ts
```

### 4.2 Application ID Format

Replace client-side `Date.now().toString(36)` with server-generated, sequential, collision-safe IDs:

```
Format: RMC-MR-{YEAR}{MONTH}-{5-digit zero-padded sequence}
Example: RMC-MR-202606-00047
```

Sequence maintained in a PostgreSQL sequence (`marriage_application_seq`).

### 4.3 File Storage

Reuse the existing MinIO setup. New bucket: `rmc-marriage`

```
Folder structure:
rmc-marriage/
├── documents/{application_id}/
│   ├── groom_id.jpg
│   ├── bride_id.jpg
│   ├── wali_consent.pdf
│   └── portrait.jpg
└── certificates/{application_id}/
    └── certificate.pdf
```

### 4.4 Payment Flow

```
1. User selects MoMo → enters phone number
2. Frontend calls POST /marriage/applications/initiate (saves draft)
3. Backend calls MTN MoMo Collections API → requestToPay
4. MoMo sends push to user's phone → user approves
5. Backend receives callback → updates payment_status = 'paid'
6. Status advances to 'submitted' (payment required to submit)
7. Bank transfer → manual confirmation by admin (marks payment_status = 'paid')
8. Cash → marked 'pending_cash' → officer confirms receipt
```

### 4.5 Status State Machine

```
DRAFT ──(payment confirmed)──► SUBMITTED ──(officer review)──► UNDER_REVIEW
    └──(payment failed)──► DRAFT                                      │
                                                          ┌──────────┴───────────┐
                                                          ▼                      ▼
                                                      APPROVED            AMENDMENTS_REQUESTED
                                                          │                      │
                                                  (ceremony done)         (applicant updates)
                                                          │                      │
                                                      COMPLETED ◄───────────────┘
                                                          │
                                                (certificate issued)
                                                          │
                                                       CLOSED
                                              
                                          Also: REJECTED (from any active state)
                                                CANCELLED (by applicant before approval)
```

### 4.6 Certificate Generation

Use `pdfkit` (Node.js PDF library) + existing `qrcode` package.

```typescript
// Certificate QR content
{
  id: "RMC-MR-202606-00047",
  groomName: "Ahmed Niyonzima",
  brideName: "Fatima Uwimana",
  ceremonyDate: "2026-06-20",
  issuedAt: "2026-06-21",
  verifyUrl: "https://rmc.rw/verify/RMC-MR-202606-00047"
}
```

Public verification endpoint: `GET /public/marriage/verify/:applicationNumber`

### 4.7 RBAC — New Permissions

Extend `permissions.enum.ts` (following existing pattern):

```typescript
// Marriage service permissions
MARRIAGE_VIEW = 'marriage:view',           // View applications
MARRIAGE_MANAGE = 'marriage:manage',       // Create/edit
MARRIAGE_APPROVE = 'marriage:approve',     // Approve/reject
MARRIAGE_ASSIGN_IMAM = 'marriage:assign_imam',
MARRIAGE_CERTIFICATE = 'marriage:certificate',  // Issue certificates
MARRIAGE_REPORTS = 'marriage:reports',
```

Roles affected:
- **Super Admin** — all marriage permissions
- **Marriage Officer** — new role: `view`, `manage`, `approve`, `assign_imam`, `certificate`
- **Member** — can submit own applications, view own status

---

## 5. Database Schema Changes

### Migration 004 — Marriage Service Tables

```sql
-- Marriage-specific application details (extends service_applications)
CREATE TABLE "marriage_applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_number" varchar(30) NOT NULL UNIQUE,
  
  -- Applicant (must be RMC member)
  "applicant_id" uuid NOT NULL REFERENCES users(id),
  
  -- Couple
  "groom_user_id" uuid REFERENCES users(id),    -- If groom is a member
  "groom_name" varchar(150) NOT NULL,
  "groom_nid" varchar(16) NOT NULL,
  "groom_phone" varchar(20),
  
  "bride_user_id" uuid REFERENCES users(id),     -- If bride is a member
  "bride_name" varchar(150) NOT NULL,
  "bride_nid" varchar(16) NOT NULL,
  "bride_phone" varchar(20),
  
  -- Islamic requirements
  "wali_name" varchar(150),                       -- Guardian name
  "wali_nid" varchar(16),
  "wali_phone" varchar(20),
  "mahr_amount" decimal(14,2),
  "mahr_currency" varchar(10) DEFAULT 'RWF',
  "mahr_description" text,                        -- e.g. "1 cow + 500,000 RWF"
  
  -- Witnesses (NIDs + resolved names after admin verification)
  "witness1_nid" varchar(16) NOT NULL,
  "witness1_name" varchar(150),
  "witness2_nid" varchar(16) NOT NULL,
  "witness2_name" varchar(150),
  
  -- Officiant
  "requested_officiant" varchar(150),             -- Free text from applicant
  "assigned_imam_id" uuid REFERENCES mosque_imams(id),
  "assigned_imam_user_id" uuid REFERENCES users(id),
  
  -- Venue & Location
  "venue_type" varchar(20) NOT NULL CHECK (venue_type IN ('mosque', 'outside')),
  "province_id" uuid REFERENCES provinces(id),
  "district_id" uuid REFERENCES districts(id),
  "venue_mosque_id" uuid REFERENCES mosques(id), -- If inside a mosque
  "venue_address" text,
  
  -- Ceremony scheduling
  "preferred_date_from" date,
  "preferred_date_to" date,
  "ceremony_date" timestamptz,                    -- Confirmed ceremony date
  "ceremony_scheduled_by" uuid REFERENCES users(id),
  "ceremony_scheduled_at" timestamptz,
  
  -- Status workflow
  "status" varchar(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','under_review','amendments_requested',
                      'approved','completed','rejected','cancelled','closed')),
  "payment_status" varchar(20) NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','pending_cash','processing','paid','refunded','failed')),
  "amount_due" decimal(12,2) NOT NULL,
  "amount_paid" decimal(12,2) NOT NULL DEFAULT 0,
  
  -- Review
  "reviewed_by" uuid REFERENCES users(id),
  "reviewed_at" timestamptz,
  "review_notes" text,
  "rejection_reason" text,
  "amendments_requested" text,                    -- What the applicant must fix
  
  -- Certificate
  "certificate_url" varchar(500),
  "certificate_qr_code" varchar(200),             -- QR payload / verify URL
  "certificate_issued_at" timestamptz,
  "certificate_issued_by" uuid REFERENCES users(id),
  
  -- Timestamps
  "submitted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX ON "marriage_applications" ("status");
CREATE INDEX ON "marriage_applications" ("payment_status");
CREATE INDEX ON "marriage_applications" ("applicant_id");
CREATE INDEX ON "marriage_applications" ("ceremony_date");
CREATE INDEX ON "marriage_applications" ("groom_nid");
CREATE INDEX ON "marriage_applications" ("bride_nid");

-- Documents for each application
CREATE TABLE "marriage_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" uuid NOT NULL REFERENCES marriage_applications(id) ON DELETE CASCADE,
  "document_type" varchar(50) NOT NULL
    CHECK (document_type IN ('groom_id','bride_id','wali_consent','mahr_agreement',
                              'portrait','additional')),
  "file_key" varchar(500) NOT NULL,               -- MinIO object key
  "file_name" varchar(255) NOT NULL,
  "file_size" integer NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "uploaded_by" uuid REFERENCES users(id),
  "verified" boolean DEFAULT false,
  "verified_by" uuid REFERENCES users(id),
  "verified_at" timestamptz,
  "uploaded_at" timestamptz NOT NULL DEFAULT now()
);

-- Status change audit trail
CREATE TABLE "marriage_status_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" uuid NOT NULL REFERENCES marriage_applications(id) ON DELETE CASCADE,
  "from_status" varchar(30),
  "to_status" varchar(30) NOT NULL,
  "changed_by" uuid REFERENCES users(id),
  "notes" text,
  "changed_at" timestamptz NOT NULL DEFAULT now()
);

-- Imam availability / blackout dates
CREATE TABLE "imam_availability" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "imam_user_id" uuid NOT NULL REFERENCES users(id),
  "date" date NOT NULL,
  "is_available" boolean NOT NULL DEFAULT true,
  "reason" varchar(200),                          -- e.g. "Travelling", "Sick"
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("imam_user_id", "date")
);

-- Payment transactions
CREATE TABLE "marriage_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" uuid NOT NULL REFERENCES marriage_applications(id),
  "method" varchar(20) NOT NULL CHECK (method IN ('momo', 'bank', 'cash')),
  "provider_ref" varchar(200),                    -- MoMo transaction ID
  "amount" decimal(12,2) NOT NULL,
  "currency" varchar(10) NOT NULL DEFAULT 'RWF',
  "status" varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed','refunded')),
  "initiated_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz,
  "confirmed_by" uuid REFERENCES users(id),       -- For cash/bank: who confirmed
  "metadata" jsonb                                -- Gateway response payload
);
```

---

## 6. API Specification

### 6.1 Member-Facing Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/marriage/applications/draft` | JWT Member | Save draft (before payment) |
| `POST` | `/marriage/applications/submit` | JWT Member | Submit + initiate payment |
| `POST` | `/marriage/applications/:id/pay` | JWT Member | Initiate/retry payment |
| `GET` | `/marriage/applications/:id` | JWT Member (own) | Get application details |
| `GET` | `/marriage/applications` | JWT Member | List own applications |
| `POST` | `/marriage/applications/:id/cancel` | JWT Member | Cancel draft/submitted |
| `POST` | `/marriage/applications/:id/documents` | JWT Member | Upload document |
| `GET` | `/marriage/applications/:id/certificate` | JWT Member (own) | Download certificate |

### 6.2 Admin / Officer Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `GET` | `/admin/marriage/applications` | `marriage:view` | List all applications (filter/paginate) |
| `GET` | `/admin/marriage/applications/:id` | `marriage:view` | Full application details |
| `PATCH` | `/admin/marriage/applications/:id/status` | `marriage:approve` | Advance/change status |
| `POST` | `/admin/marriage/applications/:id/assign-imam` | `marriage:assign_imam` | Assign imam |
| `POST` | `/admin/marriage/applications/:id/schedule` | `marriage:approve` | Set ceremony date |
| `POST` | `/admin/marriage/applications/:id/certificate` | `marriage:certificate` | Generate & issue certificate |
| `POST` | `/admin/marriage/applications/:id/payment/confirm` | `marriage:manage` | Confirm cash/bank payment |
| `GET` | `/admin/marriage/reports` | `marriage:reports` | Dashboard stats |
| `GET` | `/admin/marriage/imams` | `marriage:view` | List available imams |
| `GET` | `/admin/marriage/imams/:id/availability` | `marriage:view` | Imam calendar |
| `PUT` | `/admin/marriage/imams/:id/availability` | `marriage:assign_imam` | Set availability |

### 6.3 Public Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/public/marriage/verify/:applicationNumber` | None | QR code verification |
| `GET` | `/public/marriage/fees` | None | Current fee schedule |

### 6.4 Payment Webhook

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/marriage/payments/momo/callback` | HMAC signature | MTN MoMo payment callback |

---

## 7. Sprint Plan

> **Sprint length:** 2 weeks  
> **Total planned sprints:** 7 (14 weeks / ~3.5 months)  
> **Velocity assumption:** 2-developer team

---

### Sprint 0 — Setup & Foundations (Week 1–2)

**Goal:** Zero risk of accepting fake applications. Unblock development.

| # | Task | Owner | Effort |
|---|------|-------|--------|
| S0-1 | Add auth guard to `/services/marriage/apply` page — redirect to login | FE Dev | 2h |
| S0-2 | Add "Coming Soon — Backend Connection" notice to apply page | FE Dev | 1h |
| S0-3 | Write migration `004-marriage-tables.ts` (full schema above) | BE Dev | 4h |
| S0-4 | Run migration on dev environment, verify tables | DevOps | 2h |
| S0-5 | Add marriage permissions to `permissions.enum.ts` | BE Dev | 1h |
| S0-6 | Create "Marriage Officer" role in seed data (`02-roles-admin.seed.ts`) | BE Dev | 2h |
| S0-7 | Create MinIO bucket `rmc-marriage` with folder policy | DevOps | 2h |
| S0-8 | Install `pdfkit` package in backend | BE Dev | 30m |
| S0-9 | Set up marriage module scaffold (`marriage.module.ts`, empty controller/service) | BE Dev | 2h |
| S0-10 | Update UI/UX wireframes for multi-step wizard (5 steps) | Designer | 3 days |

**Sprint 0 Exit Criteria:**
- [ ] Apply page redirects unauthenticated users to login
- [ ] Migration runs cleanly on dev DB
- [ ] Marriage permissions registered in enum and seeded role
- [ ] MinIO bucket `rmc-marriage` created
- [ ] Wireframes approved by stakeholders

---

### Sprint 1 — Core Backend API (Week 3–4)

**Goal:** Applications stored in PostgreSQL. Frontend wired to real API.

| # | Task | Owner | Effort |
|---|------|-------|--------|
| S1-1 | `MarriageApplication` TypeORM entity | BE Dev | 3h |
| S1-2 | `MarriageDocument` TypeORM entity | BE Dev | 1h |
| S1-3 | `MarriageStatusHistory` TypeORM entity | BE Dev | 1h |
| S1-4 | `CreateMarriageApplicationDto` with class-validator decorators | BE Dev | 3h |
| S1-5 | `POST /marriage/applications/draft` endpoint | BE Dev | 3h |
| S1-6 | `GET /marriage/applications/:id` endpoint | BE Dev | 2h |
| S1-7 | `GET /marriage/applications` (list own) endpoint | BE Dev | 2h |
| S1-8 | Member validation: check both NID owners are active members | BE Dev | 3h |
| S1-9 | Duplicate application check (same couple, active application) | BE Dev | 2h |
| S1-10 | Application number generation (server-side, sequential) | BE Dev | 2h |
| S1-11 | Document upload endpoint (`POST /marriage/applications/:id/documents`) | BE Dev | 4h |
| S1-12 | Remove `localStorage` from `marriageApplications.ts`, wire to API | FE Dev | 4h |
| S1-13 | Remove `animate-scale-in` fake delay in `onSubmit` | FE Dev | 30m |
| S1-14 | API error handling on form (show server errors inline) | FE Dev | 3h |
| S1-15 | Status page: fetch from API (not localStorage) | FE Dev | 3h |

**Sprint 1 Exit Criteria:**
- [ ] Application submitted from browser is visible in PostgreSQL
- [ ] Duplicate application rejected with clear error message
- [ ] Unauthenticated user cannot submit
- [ ] Application ID is server-generated (format `RMC-MR-YYYYMM-NNNNN`)
- [ ] Status page shows correct data from API

---

### Sprint 2 — Form UX Redesign (Multi-Step Wizard) (Week 5–6)

**Goal:** Replace the single-page form with a guided, conversion-optimised wizard.

| # | Task | Owner | Effort |
|---|------|-------|--------|
| S2-1 | `WizardLayout` component with step indicator and back/next navigation | FE Dev | 1 day |
| S2-2 | **Step 1 — Couple Details:** groom/bride name, NID, phone. NID cross-checks. | FE Dev | 1 day |
| S2-3 | **Step 2 — Ceremony Details:** preferred dates, province/district, venue type, mosque selection | FE Dev | 1 day |
| S2-4 | **Step 3 — Witnesses & Guardian:** witness NIDs (verify not = couple), wali name/NID/phone | FE Dev | 1 day |
| S2-5 | **Step 4 — Mahr & Officiant:** mahr amount/description, preferred imam (searchable dropdown from API) | FE Dev | 1 day |
| S2-6 | **Step 5 — Documents:** groom ID photo, bride ID photo, wali consent upload, portrait | FE Dev | 1 day |
| S2-7 | **Step 6 — Payment & Review:** fee summary, payment method, live payment instructions, review all data, submit | FE Dev | 1 day |
| S2-8 | Auto-save draft to API on each step completion | FE Dev | 4h |
| S2-9 | "Continue draft" prompt on page load if draft exists | FE Dev | 3h |
| S2-10 | Add all new form strings to `en.json`, `rw.json`, `ar.json` | FE Dev | 1 day |
| S2-11 | Cross-field validation: groom ≠ bride NID, witnesses ≠ couple, witnesses ≠ each other | FE Dev | 3h |
| S2-12 | Confirmation step: review screen before final submit | FE Dev | 4h |
| S2-13 | Backend: update `CreateMarriageApplicationDto` for new fields (wali, mahr, dates) | BE Dev | 3h |
| S2-14 | Backend: `GET /public/mosques` endpoint for mosque dropdown | BE Dev | 2h |
| S2-15 | Backend: `GET /marriage/imams/available` — list imams by district | BE Dev | 3h |
| S2-16 | Mobile and RTL layout testing | FE Dev | 4h |

**Sprint 2 Exit Criteria:**
- [ ] Six-step wizard replaces single-page form
- [ ] Draft auto-saved at each step
- [ ] All new fields captured and validated
- [ ] Wali, mahr, preferred dates are persisted to DB
- [ ] Mosque and imam dropdowns populate from API
- [ ] All strings localized in 3 languages

---

### Sprint 3 — Payment Integration (Week 7–8)

**Goal:** No application marked `submitted` without confirmed payment.

| # | Task | Owner | Effort |
|---|------|-------|--------|
| S3-1 | Register MTN MoMo sandbox account + obtain API credentials | PM + DevOps | 1 day |
| S3-2 | Install MTN MoMo SDK or implement Collections API client | BE Dev | 1 day |
| S3-3 | `POST /marriage/applications/:id/pay` — initiate MoMo requestToPay | BE Dev | 1 day |
| S3-4 | `POST /marriage/payments/momo/callback` — process webhook, verify HMAC | BE Dev | 1 day |
| S3-5 | On payment success: update `payment_status = 'paid'`, advance status to `submitted`, trigger submission email | BE Dev | 4h |
| S3-6 | On payment failure: update `payment_status = 'failed'`, notify user | BE Dev | 3h |
| S3-7 | `MarriageTransaction` entity + insert on every payment attempt | BE Dev | 3h |
| S3-8 | Bank transfer flow: display RMC bank details on payment step; admin manual confirm endpoint | BE Dev + FE Dev | 4h |
| S3-9 | Cash flow: display "Pay at RMC office" with reference number; admin manual confirm | BE Dev + FE Dev | 3h |
| S3-10 | MoMo payment polling: frontend polls for payment confirmation (30s timeout) | FE Dev | 4h |
| S3-11 | Payment status UI: pending/success/failed states on wizard step 6 | FE Dev | 4h |
| S3-12 | Receipt generation: email receipt on payment success (PDF attachment via nodemailer) | BE Dev | 4h |
| S3-13 | Store MoMo env vars in `.env` and document them | DevOps | 1h |
| S3-14 | Write payment integration tests (sandbox) | QA | 3 days |

**Sprint 3 Exit Criteria:**
- [ ] MoMo payment completes end-to-end in sandbox
- [ ] Payment confirmed before status advances to `submitted`
- [ ] Bank/cash payment has manual admin confirmation path
- [ ] Every payment attempt logged in `marriage_transactions`
- [ ] Receipt emailed on successful payment

---

### Sprint 4 — Admin Dashboard (Week 9–10)

**Goal:** Staff can see, filter, action, and communicate on all applications.

| # | Task | Owner | Effort |
|---|------|-------|--------|
| S4-1 | Add "Marriage" entry to `AdminSidebar.tsx` (behind `marriage:view` permission) | FE Dev | 1h |
| S4-2 | `/admin/marriage` — applications list page (table with filters) | FE Dev | 2 days |
| S4-3 | Filter controls: status, payment status, venue type, date range, search by name/ID | FE Dev | 1 day |
| S4-4 | `/admin/marriage/[id]` — full application detail view | FE Dev | 2 days |
| S4-5 | Detail view: couple info, witnesses, wali, mahr, documents list | FE Dev | 1 day |
| S4-6 | Detail view: status action panel (approve / request amendments / reject) | FE Dev | 1 day |
| S4-7 | Detail view: assign imam dropdown (filtered by district, shows availability) | FE Dev | 1 day |
| S4-8 | Detail view: schedule ceremony date + time picker | FE Dev | 4h |
| S4-9 | Detail view: document viewer (show uploaded files from MinIO presigned URLs) | FE Dev | 4h |
| S4-10 | Detail view: payment status + manual confirm button | FE Dev | 4h |
| S4-11 | Detail view: status history timeline | FE Dev | 4h |
| S4-12 | Backend: `GET /admin/marriage/applications` with filters + pagination | BE Dev | 1 day |
| S4-13 | Backend: `PATCH /admin/marriage/applications/:id/status` with notes | BE Dev | 1 day |
| S4-14 | Backend: `POST /admin/marriage/applications/:id/assign-imam` | BE Dev | 4h |
| S4-15 | Backend: `POST /admin/marriage/applications/:id/schedule` | BE Dev | 4h |
| S4-16 | Status history written on every status change | BE Dev | 3h |
| S4-17 | `/admin/marriage/reports` — stats widget (total, by status, by month, revenue) | FE Dev + BE Dev | 1 day |
| S4-18 | Export to CSV (`GET /admin/marriage/reports/export`) | BE Dev | 4h |

**Sprint 4 Exit Criteria:**
- [ ] Admin can see all submitted applications
- [ ] Admin can approve, reject, or request amendments (with mandatory notes)
- [ ] Imam assigned to application from dropdown
- [ ] Ceremony date scheduled
- [ ] Cash/bank payments manually confirmed
- [ ] Status history logged and visible
- [ ] Admin cannot see marriage menu without `marriage:view` permission

---

### Sprint 5 — Notifications & Status Tracking (Week 11–12)

**Goal:** Applicants informed at every stage; status page is live and accurate.

| # | Task | Owner | Effort |
|---|------|-------|--------|
| S5-1 | `MarriageNotificationService` — reuse nodemailer from `auth.service.ts` | BE Dev | 4h |
| S5-2 | Email: **Submission received** — includes application ID, summary, payment receipt | BE Dev | 3h |
| S5-3 | Email: **Under review** — assigned officer contact, expected timeline | BE Dev | 2h |
| S5-4 | Email: **Amendments requested** — list what must be corrected, link to application | BE Dev | 3h |
| S5-5 | Email: **Approved** — confirmed ceremony date, assigned imam, venue | BE Dev | 3h |
| S5-6 | Email: **Rejected** — reason provided, appeal instructions | BE Dev | 2h |
| S5-7 | Email: **Certificate ready** — download link with 7-day expiry presigned URL | BE Dev | 3h |
| S5-8 | Email templates — HTML templates (branded, responsive, localized) | Designer + BE Dev | 2 days |
| S5-9 | Status page: replace static `getApplication()` with `GET /marriage/applications/:id` | FE Dev | 2h |
| S5-10 | Status page: add 30-second polling for real-time-like updates | FE Dev | 3h |
| S5-11 | Status page: render `amendments_requested` status with correction prompt | FE Dev | 3h |
| S5-12 | Status page: render `rejected` status with reason | FE Dev | 2h |
| S5-13 | Status page: render `approved` with ceremony details (date, imam, venue) | FE Dev | 3h |
| S5-14 | Status page: render `closed` with certificate download button | FE Dev | 3h |
| S5-15 | Status page: amendments submission — user uploads new documents or re-submits | FE Dev | 1 day |
| S5-16 | `GET /marriage/applications/:id/status-events` — status history for applicant view | BE Dev | 3h |

**Sprint 5 Exit Criteria:**
- [ ] Email sent on every status transition
- [ ] Status page shows current status from API (not localStorage)
- [ ] All 7 status states render correctly on status page
- [ ] Amendments flow works end-to-end
- [ ] Email received in test account for each trigger

---

### Sprint 6 — Certificate Generation & Verification (Week 13–14)

**Goal:** Officers can issue a verifiable PDF certificate. Applicants can download it.

| # | Task | Owner | Effort |
|---|------|-------|--------|
| S6-1 | Design marriage certificate template (A4 landscape PDF) | Designer | 3 days |
| S6-2 | `CertificateService` — implement PDF generation using `pdfkit` | BE Dev | 2 days |
| S6-3 | Embed couple names, ceremony date, imam name, registration number, RMC seal | BE Dev | 1 day |
| S6-4 | Generate QR code (using existing `qrcode` package) linking to public verify URL | BE Dev | 4h |
| S6-5 | Upload generated certificate to MinIO `rmc-marriage/certificates/{id}/certificate.pdf` | BE Dev | 3h |
| S6-6 | Store `certificate_url` and `certificate_qr_code` in `marriage_applications` | BE Dev | 2h |
| S6-7 | `POST /admin/marriage/applications/:id/certificate` — trigger generation + issue | BE Dev | 3h |
| S6-8 | `GET /marriage/applications/:id/certificate` — return presigned download URL | BE Dev | 3h |
| S6-9 | `GET /public/marriage/verify/:applicationNumber` — public verification endpoint | BE Dev | 3h |
| S6-10 | Certificate download button on member status page | FE Dev | 3h |
| S6-11 | Public verification page `/verify/[id]` — shows certificate details if valid | FE Dev | 1 day |
| S6-12 | "Issue Certificate" button in admin detail view | FE Dev | 2h |
| S6-13 | Advance status to `closed` after certificate issued | BE Dev | 1h |
| S6-14 | Send "Certificate Ready" email with download link | BE Dev | 2h |
| S6-15 | Unit tests for `CertificateService` | QA + BE Dev | 1 day |

**Sprint 6 Exit Criteria:**
- [ ] Officer clicks "Issue Certificate" → PDF generated and stored in MinIO
- [ ] Member receives email with download link
- [ ] QR code on certificate links to public verification page
- [ ] Verification page shows valid details for issued certificate
- [ ] Invalid/forged application numbers return 404 on verification page

---

### Sprint 7 — Hardening, Accessibility & Release (Week 15–16)

**Goal:** Production-ready. Secure, accessible, fully tested.

| # | Task | Owner | Effort |
|---|------|-------|--------|
| S7-1 | Security: NID data — confirm encrypted at rest (PostgreSQL column encryption or application-level) | BE Dev | 1 day |
| S7-2 | Security: rate-limit status lookup endpoint (max 10/min per IP) | BE Dev | 3h |
| S7-3 | Security: Application ID entropy increase (current is guessable) | BE Dev | 2h |
| S7-4 | Security: CSRF protection on all marriage API routes | BE Dev | 3h |
| S7-5 | Security: validate file MIME types server-side (not just extension) on uploads | BE Dev | 3h |
| S7-6 | Security: presigned URL expiry on certificate downloads (7 days) | BE Dev | 2h |
| S7-7 | Accessibility: add `focus-within:ring-2` on `OptionCard` radio cards | FE Dev | 1h |
| S7-8 | Accessibility: `aria-describedby` on all custom inputs | FE Dev | 2h |
| S7-9 | Accessibility: migrate FAQ from `<details>` to controlled accordion + ARIA | FE Dev | 4h |
| S7-10 | Accessibility: verify color contrast on gradient header (WCAG AA) | FE Dev + QA | 3h |
| S7-11 | Accessibility: full keyboard navigation test on wizard | QA | 1 day |
| S7-12 | RTL: full testing of wizard and admin views in Arabic locale | QA | 1 day |
| S7-13 | District names localization (RW + AR translations) | FE Dev | 4h |
| S7-14 | Replace Unsplash images with owned/licensed assets | PM + Designer | 1 day |
| S7-15 | End-to-end test suite (Playwright): full happy path submit → approve → certificate | QA | 2 days |
| S7-16 | Load test: 100 concurrent applications | DevOps + QA | 1 day |
| S7-17 | Penetration test (focus: file upload, payment callback, NID data) | QA | 2 days |
| S7-18 | User acceptance testing (UAT) with 3 RMC staff + 5 member volunteers | PM + QA | 3 days |
| S7-19 | Fix UAT findings | FE Dev + BE Dev | 3 days |
| S7-20 | Production deployment with feature flag | DevOps | 1 day |
| S7-21 | Monitor first 48h post-launch (error rates, payment callbacks) | All | ongoing |

**Sprint 7 Exit Criteria:**
- [ ] Zero critical/high security findings
- [ ] WCAG AA accessibility score ≥90% on key pages
- [ ] UAT sign-off from RMC staff
- [ ] All E2E tests passing in CI
- [ ] Feature flag enabled in production
- [ ] Monitoring alert configured for payment callback failures

---

## 8. Frontend Implementation

### 8.1 New/Modified Files

| Action | File | Change |
|--------|------|--------|
| **Modify** | `components/services/MarriageApplicationForm.tsx` | Refactor to wizard coordinator |
| **Create** | `components/services/marriage/WizardLayout.tsx` | Step container + progress indicator |
| **Create** | `components/services/marriage/steps/Step1Couple.tsx` | Groom + bride details |
| **Create** | `components/services/marriage/steps/Step2Ceremony.tsx` | Dates, venue, mosque |
| **Create** | `components/services/marriage/steps/Step3Witnesses.tsx` | Witnesses + wali |
| **Create** | `components/services/marriage/steps/Step4Mahr.tsx` | Mahr + officiant |
| **Create** | `components/services/marriage/steps/Step5Documents.tsx` | File uploads |
| **Create** | `components/services/marriage/steps/Step6Payment.tsx` | Payment + confirmation |
| **Modify** | `components/services/MarriageStatusChecker.tsx` | API-backed, add all states |
| **Create** | `components/services/marriage/StatusTimeline.tsx` | Status history timeline |
| **Create** | `components/services/marriage/CertificateDownload.tsx` | Download CTA |
| **Modify** | `lib/marriageApplications.ts` | Replace localStorage with API client functions |
| **Create** | `lib/marriageApi.ts` | Typed API client for all marriage endpoints |
| **Create** | `app/[locale]/admin/marriage/page.tsx` | Admin list page |
| **Create** | `app/[locale]/admin/marriage/[id]/page.tsx` | Admin detail/action page |
| **Create** | `app/[locale]/verify/[id]/page.tsx` | Public certificate verification |
| **Modify** | `components/admin/AdminSidebar.tsx` | Add marriage nav item |
| **Modify** | `messages/en.json` | New strings for wizard, admin, certificate |
| **Modify** | `messages/rw.json` | Kinyarwanda translations |
| **Modify** | `messages/ar.json` | Arabic translations |

### 8.2 Wizard State Management

Use React `useReducer` + `useContext` for cross-step form state:

```typescript
// lib/marriageWizard.tsx
type WizardState = {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  draftId: string | null;
  couple: CoupleData;
  ceremony: CeremonyData;
  witnesses: WitnessData;
  mahr: MahrData;
  documents: DocumentData;
  payment: PaymentData;
};
```

Steps save partial data to API on "Next" click and restore from API on "Back".

### 8.3 Breadcrumb Navigation

Add to all marriage service inner pages:

```
Home  >  Services  >  Marriage  >  Apply
Home  >  Services  >  Marriage  >  Status
```

---

## 9. Backend Implementation

### 9.1 Module Wiring

Register `MarriageModule` in `app.module.ts` following the existing pattern (see `members.module.ts`).

### 9.2 DTO Validation Rules

Key class-validator rules for `CreateMarriageApplicationDto`:

```typescript
@IsString() @Length(3, 150) groomName: string;
@Matches(/^\d{16}$/) groomNid: string;
@IsPhoneNumber('RW') groomPhone: string;

// Cross-field (at class level using custom @ValidateIf)
// groomNid !== brideNid
// witness1Nid !== groomNid, brideNid
// witness2Nid !== groomNid, brideNid, witness1Nid

@IsDateString() preferredDateFrom: string;
@IsDateString() preferredDateTo: string;
// preferredDateFrom must be ≥ today + 14 days (processing time)
// preferredDateTo must be ≥ preferredDateFrom

@IsEnum(VenueType) venueType: VenueType;
@IsDecimal() @Min(0) mahrAmount: number;
```

### 9.3 Membership Validation Logic

In `marriage.service.ts`, before saving a draft:

```typescript
// Both NIDs must resolve to active RMC members
const groomMember = await this.memberRepo.findOne({
  where: { nationalId: dto.groomNid, memberStatus: 'active', approvalStatus: 'approved' }
});
if (!groomMember) throw new BadRequestException('Groom is not an active RMC member');

// Same for bride
const brideMember = await this.memberRepo.findOne({ ... });
```

### 9.4 Imam Availability Query

```typescript
// Returns imams without a confirmed ceremony on the requested date
// and without availability blackout on that date
async getAvailableImams(districtId: string, date: Date): Promise<User[]> {
  const busyImamIds = await this.marriageRepo
    .createQueryBuilder('app')
    .select('app.assigned_imam_user_id')
    .where('DATE(app.ceremony_date) = :date', { date })
    .andWhere('app.status IN (:...statuses)', { statuses: ['approved', 'completed'] })
    .getRawMany();

  const blackoutImamIds = await this.imamAvailabilityRepo
    .createQueryBuilder('av')
    .select('av.imam_user_id')
    .where('av.date = :date AND av.is_available = false', { date })
    .getRawMany();

  const excludedIds = [...busyImamIds, ...blackoutImamIds].map(r => r.imam_user_id);

  return this.mosqueImamRepo
    .createQueryBuilder('mi')
    .innerJoinAndSelect('mi.user', 'u')
    .innerJoin('mi.mosque', 'm')
    .where('m.district_id = :districtId', { districtId })
    .andWhere(excludedIds.length ? 'mi.user_id NOT IN (:...excludedIds)' : '1=1', { excludedIds })
    .getMany();
}
```

### 9.5 Certificate Generation Sketch

```typescript
// certificate.service.ts
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

async generateCertificate(application: MarriageApplication): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
  const chunks: Buffer[] = [];
  doc.on('data', chunk => chunks.push(chunk));

  // Background, border, RMC header/logo
  // Bride and groom names (centered, large font)
  // Ceremony date, imam name, venue
  // Registration number

  // QR code
  const qrBuffer = await QRCode.toBuffer(
    `https://rmc.rw/verify/${application.applicationNumber}`
  );
  doc.image(qrBuffer, /* position */ );

  // Signatures block (Officer name, date)
  doc.end();
  return Buffer.concat(chunks);
}
```

---

## 10. Testing Strategy

### 10.1 Test Coverage Targets

| Layer | Target |
|-------|--------|
| Backend unit tests | ≥80% coverage on `marriage.service.ts` and `certificate.service.ts` |
| Backend integration tests | All API endpoints with auth scenarios |
| Frontend component tests | Wizard steps, status page states |
| E2E (Playwright) | 3 critical paths (below) |
| Security tests | File upload abuse, payment callback spoofing |
| Accessibility | Automated (axe-core) + manual keyboard |

### 10.2 Critical E2E Paths

**Path 1 — Happy Path:**
Register → Login → Apply (6 steps) → Pay (MoMo sandbox) → Receive email → Admin approves → Certificate issued → Download certificate → Verify via QR

**Path 2 — Amendments Path:**
Apply → Pay → Admin requests amendments → Applicant re-submits → Admin approves → Certificate issued

**Path 3 — Rejection Path:**
Apply → Pay → Admin rejects (with reason) → Applicant receives rejection email → Reapplies as new application

### 10.3 Key Unit Test Cases

- [ ] Duplicate application returns 409
- [ ] Non-member NID returns 400
- [ ] Groom NID = Bride NID returns 400
- [ ] Witness NID = Groom NID returns 400
- [ ] Payment callback with invalid HMAC returns 401
- [ ] Certificate generation produces valid PDF with readable QR
- [ ] Status history entry written on every status change
- [ ] Expired presigned URL returns 403

---

## 11. Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| R1 | MTN MoMo sandbox unavailable / approval delayed | Medium | High | Start MoMo registration in Sprint 0; implement bank transfer as fallback first |
| R2 | NIDA NID verification API not accessible | High | Medium | Descoped — admin manually verifies NIDs from uploaded photos |
| R3 | Certificate design iterations delay Sprint 6 | Medium | Medium | Designer starts template in Sprint 4 in parallel with admin work |
| R4 | Member NID data not populated in DB (nationalId nullable) | High | High | Sprint 1 must validate: if `nationalId` is null for most members, implement alternative lookup (name + DOB) |
| R5 | Imam availability data not seeded | Low | Medium | Seed 3–5 test imams in dev before Sprint 2; admin can also set availability manually |
| R6 | Arabic RTL layout breaks on wizard | Medium | Medium | RTL regression testing at the end of each sprint, not just Sprint 7 |
| R7 | MinIO presigned URL expiry conflicts with certificate download | Low | Low | Set long expiry (30 days) for certificates; regenerate on demand |
| R8 | UAT scope creep adds new requirements in Sprint 7 | Medium | High | Freeze scope at Sprint 5 kickoff; UAT feedback goes to backlog for Phase 2 |
| R9 | `member_profiles.national_id` column stores plain text — privacy violation | Medium | High | Assess encryption requirement before Sprint 1 data reads; may need column-level encryption |

---

## 12. Definition of Done

A user story is **Done** when:

1. Code merged to `main` via PR with ≥1 reviewer approval
2. All automated tests pass (unit + integration)
3. No new ESLint errors introduced
4. API endpoint documented (Swagger decorator on controller)
5. Strings added to all 3 locale files (`en.json`, `rw.json`, `ar.json`)
6. Feature tested on mobile viewport (375px width)
7. Feature tested in RTL (Arabic locale)
8. No new `any` TypeScript types without justification
9. Sensitive fields (NID, phone) not logged in server logs
10. QA engineer sign-off in test environment

---

## 13. Dependencies & Blockers

### External Dependencies

| Dependency | Owner | Needed By | Status |
|------------|-------|-----------|--------|
| MTN MoMo Developer API credentials | PM | Sprint 3 | Not started |
| RMC official logo / seal for certificate | PM / Design | Sprint 6 | Not started |
| Certificate design approval from RMC leadership | PM | Sprint 5 | Not started |
| Licensed photography for hero images | PM / Design | Sprint 7 | Not started |
| Hosting capacity review (MinIO storage increase) | DevOps | Sprint 3 | Not started |
| Email domain SPF/DKIM records for notification emails | DevOps | Sprint 5 | Verify existing config |

### Internal Blockers (Must Resolve First)

| Blocker | Sprint | Resolution |
|---------|--------|-----------|
| `member_profiles.national_id` is nullable — many members may not have NID on file | Sprint 1 | Check DB for null ratio; if >20%, add alternative validation path |
| No mosque seed data in dev environment | Sprint 2 | Run mosque seed or create 5 test mosques before wizard mosque dropdown can work |
| Apply page has no auth guard today | Sprint 0 | Add guard before any other work starts |

---

## 14. Milestones & Timeline

```
Week  1-2   Sprint 0  ── Foundation & Auth Guard
Week  3-4   Sprint 1  ── Core Backend API
Week  5-6   Sprint 2  ── Multi-Step Wizard UX
Week  7-8   Sprint 3  ── Payment Integration
Week  9-10  Sprint 4  ── Admin Dashboard
Week 11-12  Sprint 5  ── Notifications & Status
Week 13-14  Sprint 6  ── Certificate Generation
Week 15-16  Sprint 7  ── Hardening & Release
            ─────────────────────────────────────
            Total: 16 weeks / 4 months to production
```

### Key Milestones

| Milestone | Target Date | Description |
|-----------|-------------|-------------|
| **M0 — Foundation** | Week 2 | Auth guard live; DB migration ran; fake-submission notice shown |
| **M1 — Data Saved** | Week 4 | Real applications stored in PostgreSQL; no more localStorage |
| **M2 — Full Form** | Week 6 | 6-step wizard live; all Islamic fields captured |
| **M3 — Paid & Submitted** | Week 8 | MoMo payment end-to-end in staging |
| **M4 — Admin Live** | Week 10 | Staff can action applications; status advances |
| **M5 — Notifications** | Week 12 | Emails sent on all status transitions |
| **M6 — Certificate** | Week 14 | First PDF certificate generated and downloadable |
| **M7 — Production** | Week 16 | UAT passed; live in production |

---

## Appendix A — New Permissions Seed

Add to `02-roles-admin.seed.ts`:

```typescript
const marriageOfficerPermissions = [
  'marriage:view',
  'marriage:manage',
  'marriage:approve',
  'marriage:assign_imam',
  'marriage:certificate',
];

// Insert role: name="Marriage Officer", permissions=marriageOfficerPermissions
```

---

## Appendix B — Environment Variables Required

```env
# MTN MoMo (Collections API)
MOMO_SUBSCRIPTION_KEY=
MOMO_API_USER=
MOMO_API_KEY=
MOMO_CALLBACK_URL=https://api.rmc.rw/marriage/payments/momo/callback
MOMO_ENVIRONMENT=sandbox   # or production

# MinIO (already configured — add new bucket)
MINIO_MARRIAGE_BUCKET=rmc-marriage

# Certificate
CERTIFICATE_BASE_URL=https://rmc.rw/verify
CERTIFICATE_PRESIGNED_EXPIRY_DAYS=30

# Notifications
NOTIFICATION_FROM_EMAIL=services@rmc.rw
NOTIFICATION_FROM_NAME=RMC Services
```

---

## Appendix C — File Size & Type Policy

| Document | Accepted Types | Max Size |
|----------|---------------|----------|
| Groom ID photo | JPG, PNG | 5 MB |
| Bride ID photo | JPG, PNG | 5 MB |
| Wali consent letter | PDF, JPG, PNG | 10 MB |
| Mahr agreement | PDF, JPG, PNG | 10 MB |
| Portrait (for certificate) | JPG, PNG | 5 MB |
| Additional documents | PDF, JPG, PNG | 10 MB each, max 3 files |

All types validated server-side by MIME sniffing (not just extension).

---

*This plan is a living document. Update after each sprint retrospective.*  
*Next review date: 2026-06-26 (end of Sprint 0).*
