# Marriage Service — Gap Analysis Report

**Project:** RMC Digital Platform  
**Module:** Marriage (Nikah) Service  
**Analyst Role:** Senior Business Analyst  
**Date:** 2026-06-12  
**Branch Reviewed:** `emmy`  
**Status:** Prototype / Demo — Not Production-Ready

---

## Executive Summary

The Marriage (Nikah) service is **aesthetically complete but functionally hollow**. The frontend presents a polished, three-page experience (information → application → status tracking) that gives users full confidence they have submitted a real application — but every submission is silently discarded into browser localStorage and never reaches a server. No backend endpoint exists. No certificate can be generated. No admin can action any request. No payment is ever collected.

**Overall Completion Estimate:** ~25% of full production scope  
**Risk Level:** CRITICAL — live deployment would result in lost applications, failed payments, and untrackable marriages  
**Recommended Action:** Freeze new frontend features; prioritise backend API and data persistence sprint

---

## 1. Current Architecture Overview

```
User Browser
    │
    ├── /services/marriage              ← Service info page (static marketing)
    ├── /services/marriage/apply        ← Application form (React Hook Form + Zod)
    │       └── On submit → localStorage only (no API call)
    └── /services/marriage/status       ← Status checker (reads localStorage)

Backend (NestJS)
    └── No marriage routes exist
    └── Database schema defined (not connected to any service)

Database (PostgreSQL)
    └── service_applications table (generic, defined in migration 001)
    └── service_documents table
    └── transactions table
    └── No TypeORM entity or repository wired up
```

---

## 2. Workflow Analysis

### 2.1 As-Is Workflow (What Actually Happens Today)

| Step | User Sees | What Actually Happens |
|------|-----------|----------------------|
| 1 | Fills application form | Client-side Zod validation runs |
| 2 | Clicks "Submit" | 800ms fake delay (hardcoded `setTimeout`) |
| 3 | Sees success screen with Application ID | ID generated client-side (`Date.now().toString(36)`) and stored in localStorage |
| 4 | Copies Application ID | ID exists only in that browser session |
| 5 | Checks status with ID | Status read from localStorage — always shows "Under Review" |
| 6 | Waits for approval | No staff can ever see the application |
| 7 | Expects certificate | Certificate generation is not implemented |
| 8 | Pays fee | No payment gateway; selecting a payment method has no effect |

### 2.2 To-Be Workflow (Production Target)

```
Applicant (Member)
    │
    ├─ 1. Verify both partners are active RMC members
    ├─ 2. Fill application (couple, witnesses, officiant, venue, mahr)
    ├─ 3. Upload supporting documents (IDs, guardian consent, mahr agreement)
    ├─ 4. Pay fee (MoMo / bank transfer) — gateway confirms before submission
    ├─ 5. Receive Application ID + email/SMS confirmation
    │
RMC Staff (Officer)
    │
    ├─ 6. Review application in admin dashboard
    ├─ 7. Verify NID lookups (NIDA integration or manual)
    ├─ 8. Verify witness identities
    ├─ 9. Confirm imam/officiant availability
    ├─ 10. Schedule ceremony date
    ├─ 11. Approve or request amendments → applicant notified
    │
Ceremony
    │
    ├─ 12. Nikah performed with registered imam
    ├─ 13. Officer marks ceremony as completed
    │
Post-Ceremony
    │
    ├─ 14. Certificate generated (PDF with QR code)
    ├─ 15. Certificate sent to applicant (email + portal download)
    └─ 16. Record archived to permanent registry
```

---

## 3. Gap Analysis by Domain

### 3.1 Backend & Data Persistence — CRITICAL

| Gap | Detail | Severity |
|-----|--------|----------|
| No API endpoints | No `POST /services/marriage/applications` route. The TODO comment in `MarriageApplicationForm.tsx:166` has been stubbed but never built. | CRITICAL |
| LocalStorage only | All applications stored in browser localStorage (`rmc.marriage.applications`). Cleared on cache wipe, private browsing, device change. | CRITICAL |
| No database integration | `service_applications` table is defined in migration `001-initial-schema.ts` but no TypeORM entity, repository, or service class exists | CRITICAL |
| No application number generation | Client generates IDs using `Date.now().toString(36)` — this is not collision-safe, not sequential, and not verifiable server-side | HIGH |
| No duplicate detection | Two applications for the same couple (same NIDs) can be submitted without warning | HIGH |
| No cross-device access | An application submitted on mobile cannot be checked on desktop | HIGH |

---

### 3.2 Data Model — HIGH

| Gap | Detail | Severity |
|-----|--------|----------|
| Partners not linked to User accounts | `groomName`/`brideName` are free-text strings. No FK to `users` table. Cannot verify membership. | HIGH |
| No ceremony date field | The application has no date/time of desired ceremony — scheduling is impossible | HIGH |
| No mahr (dowry) field | Mahr is a mandatory Islamic marriage element. No field exists anywhere in the form or schema | HIGH |
| No guardian (Wali) fields | Wali consent is required for female applicants. No field, no document slot, no approval step | HIGH |
| Witness data is NID-only | `witness1Nid`/`witness2Nid` are unverified strings — no FK to users, no name, no contact | MEDIUM |
| Officiant is free text | `officiant` field accepts any string. No validation against a registered imam list. | MEDIUM |
| Single photo upload only | Schema and form support one "ID photo". Marriage applications typically need both NID photos, a wali letter, mahr agreement | MEDIUM |
| No address/GPS field | Province + district selected but no street address, mosque name, or coordinates for venue | LOW |

---

### 3.3 Validation — HIGH

#### Frontend (Implemented)

| Validation | Status | Notes |
|------------|--------|-------|
| NID format (16 digits) | ✅ Implemented | Regex `/^\d{16}$/` via Zod |
| Full name (min 3 chars) | ✅ Implemented | Trimmed string check |
| Province/District cascade | ✅ Implemented | Dropdown disabled until province selected |
| Venue selection | ✅ Implemented | Enum validation |
| Payment method | ✅ Implemented | Enum validation |
| Photo type (JPG/PNG) | ✅ Implemented | MIME type check |
| Photo size (≤5MB) | ✅ Implemented | Byte size check |

#### Frontend (Missing)

| Validation | Status | Notes |
|------------|--------|-------|
| Groom ≠ Bride NID | ❌ Missing | Someone could submit same NID for both |
| Witness ≠ Applicant NID | ❌ Missing | Groom or bride could list themselves as witness |
| Witness1 ≠ Witness2 NID | ❌ Missing | Duplicate witnesses allowed |
| Membership verification | ❌ Missing | Non-members can submit |
| Age validation | ❌ Missing | NIDs encode date of birth — minimum age not enforced |
| Ceremony date validation | ❌ Missing | No date field at all |
| Duplicate application check | ❌ Missing | Second application for same couple not detected |
| Phone number format | ❌ Missing | No phone field exists (needed for MoMo payment) |

#### Backend (All Missing — no backend exists)

| Validation | Severity |
|------------|----------|
| NID uniqueness across active applications | CRITICAL |
| Membership status of both partners | CRITICAL |
| Payment confirmation before submission is accepted | CRITICAL |
| Imam/officiant existence in registered list | HIGH |
| Witness eligibility (must be adults, not related to couple in prohibited ways) | HIGH |
| Document authenticity checks | MEDIUM |

---

### 3.4 Payment Handling — CRITICAL

| Gap | Detail | Severity |
|-----|--------|----------|
| No payment gateway | Selecting "Mobile Money", "Bank Transfer", or "Cash" has zero effect — the radio cards are decorative | CRITICAL |
| No payment before submission | Fee is described as mandatory, but applications are accepted without any payment | CRITICAL |
| No transaction record | `transactions` table exists in schema but is never written to | CRITICAL |
| No invoice/receipt | No receipt generated or emailed after payment | HIGH |
| No payment status tracking | `payment_status` column in schema (`unpaid`/`paid`/`partial`) — never updated | HIGH |
| Cash payment untracked | Cash payment option has no offline tracking mechanism | HIGH |
| No refund workflow | Rejected applications have no defined refund path | MEDIUM |
| MoMo phone number not collected | Mobile Money selected but no phone number field in form | HIGH |
| Bank details not shown | Bank transfer selected but no account number / reference provided to user | HIGH |

**Fee amounts defined (currently hardcoded in UI):**
- Mosque ceremony: 30,000 RWF
- Outside ceremony: 200,000 RWF

---

### 3.5 Status Tracking — HIGH

| Gap | Detail | Severity |
|-----|--------|----------|
| Status never progresses | All applications are permanently stuck at "Under Review" — no mechanism exists to advance status | CRITICAL |
| Status visible only on submitting device | localStorage is browser-local; applicant cannot check status from another device | CRITICAL |
| No notification on status change | Applicant receives no email, SMS, or push notification when status changes | HIGH |
| No rejection state in UI | `STATUS_FLOW` = `[submitted, review, approved, ready]` — no "rejected" stage rendered | HIGH |
| No reason provided on rejection | No UI or data field for officer notes visible to applicant | MEDIUM |
| No estimated timeline shown | Status tracker shows stages without dates or ETAs | LOW |

**Current status flow (hardcoded):**
```typescript
export const STATUS_FLOW: ApplicationStatus[] = ['submitted', 'review', 'approved', 'ready'];
```
Missing: `amendments_requested`, `rejected`, `cancelled`

---

### 3.6 Certificate Generation — CRITICAL

| Gap | Detail | Severity |
|-----|--------|----------|
| No certificate generation logic | `certificate_url` and `certificate_qr_code` exist in the DB schema but no generation code exists anywhere | CRITICAL |
| No PDF template | No certificate template (HTML, LaTeX, or design file) has been created | CRITICAL |
| No QR code for verification | QR codes planned in schema but not implemented | HIGH |
| No digital signature | Certificate authenticity cannot be verified | HIGH |
| No certificate archive | Issued certificates have no permanent storage or retrieval mechanism | HIGH |
| No download link on status page | The status page has no "Download Certificate" section — not even a placeholder | MEDIUM |

---

### 3.7 Admin / Officer Interface — CRITICAL

| Gap | Detail | Severity |
|-----|--------|----------|
| No admin marriage dashboard | The admin panel (exists at `/admin/members`) has no marriage module | CRITICAL |
| No application review UI | Officers cannot see, filter, or sort submitted applications | CRITICAL |
| No approval/rejection workflow | No approve/reject buttons with reason capture | CRITICAL |
| No document verification interface | Officers cannot view uploaded IDs or photos | CRITICAL |
| No imam assignment tool | No calendar or availability view for assigning officiants | HIGH |
| No ceremony scheduling | No date selection or calendar integration for scheduling | HIGH |
| No bulk export | No CSV/PDF export for records | MEDIUM |
| No audit trail | No change history on application records | MEDIUM |
| No reporting/analytics | No dashboards for monthly applications, revenue, approval rates | LOW |

---

### 3.8 Authentication & Authorization — HIGH

| Gap | Detail | Severity |
|-----|--------|----------|
| No auth check on apply page | The application form at `/services/marriage/apply` is publicly accessible without login | HIGH |
| No member verification | Form does not check if the submitter is an active RMC member | HIGH |
| No role-based access | No difference between what a member vs. officer vs. admin can see | HIGH |
| Application ID is guessable | `RMC-MR-${4-char base-36}` has ~1.68M combinations — low entropy; brute-forceable | MEDIUM |

---

## 4. UI/UX Analysis

### 4.1 Strengths

| Area | Observation |
|------|-------------|
| Visual design | Modern, clean rose-color scheme appropriate for a marriage service |
| Component quality | `OptionCard` radio cards are polished; clear selected/unselected states with animation |
| Form feedback | Field-level error messages positioned correctly beneath each input |
| Success screen | Animated checkmark, copy-to-clipboard for ID, clear next-action buttons |
| Province/District cascade | District dropdown correctly disables until province is selected |
| Multi-language | Form and status checker fully localized (EN, RW, AR) |
| Mobile layout | Grid layout collapses correctly to single-column on small screens |
| Fee display | Real-time fee update based on venue selection is a good UX pattern |

### 4.2 UX Gaps

| Area | Issue | Recommendation |
|------|-------|----------------|
| **No save/draft functionality** | Long form has no auto-save. Browser refresh loses all input. | Implement `localStorage` draft auto-save with "continue draft" prompt |
| **No form progress indicator** | Users don't know how far through the form they are | Add a step progress bar (Couple → Witnesses → Venue → Payment → Confirm) |
| **Single-page long form** | All sections on one page; intimidating for first-time users | Split into wizard steps with "Back / Next" navigation |
| **Photo upload UX** | Single photo upload area is small (w-24); no drag-and-drop | Expand drop zone, add drag-and-drop with preview |
| **Payment method gives no instructions** | Selecting "Bank Transfer" shows no bank details. Selecting "MoMo" shows no phone to dial | Show relevant payment instructions/details when method is selected |
| **No confirmation step** | Form submits immediately — no "Review your application" summary before final submit | Add a confirmation/review screen before submission |
| **Application ID easy to lose** | Success screen tells user to "save this ID" but it is stored nowhere else | Send ID via email/SMS and allow user to look up by phone number |
| **Status page doesn't auto-refresh** | Status is static; user must manually reload to check for updates | Add polling or WebSocket for real-time status updates |
| **No rejection messaging** | If an application were rejected, user would see blank status or broken UI | Add `rejected` state with explanation and "Appeal / Reapply" CTA |
| **FAQ uses browser `<details>`** | The native details/summary accordion is inconsistent across browsers and not animated smoothly | Replace with a custom accessible accordion component |
| **No breadcrumb navigation** | Interior pages show only a "Back to services" link; no breadcrumb trail | Add breadcrumb: Home > Services > Marriage > Apply |
| **Hero images from Unsplash** | Production app using hardcoded external CDN URLs is a dependency risk and potential copyright concern | Replace with owned/licensed imagery or a local media library |

---

## 5. UI Modernisation Recommendations

### 5.1 Form Redesign — Multi-Step Wizard

**Current:** All fields on one scrollable page  
**Recommended:** 5-step wizard with sidebar progress

```
Step 1: Couple Information
  - Groom details (name, NID, phone)
  - Bride details (name, NID, phone)
  - Both must be RMC members (verified via API)

Step 2: Ceremony Details
  - Preferred date range
  - Province / District / Venue type / Specific mosque
  - Mahr (amount and type)

Step 3: Witnesses & Officiant
  - Witness 1 & 2 (NID lookup → shows name for confirmation)
  - Guardian (Wali) details and consent upload
  - Preferred officiant (searchable imam list)

Step 4: Documents
  - Groom NID photo
  - Bride NID photo
  - Wali consent letter (PDF/image)
  - Certificate portrait photo

Step 5: Payment & Submit
  - Fee summary
  - Payment method with live instructions
  - Pay now (MoMo / bank) or schedule cash payment
  - Review summary → Submit
```

### 5.2 Status Page Enhancement

Replace the current static card with a live dashboard panel:

- Real-time status (WebSocket or 30s polling)
- Timeline with dates for each completed stage
- Document checklist showing what was received vs. pending
- Assigned officer name and contact
- Scheduled ceremony date and location
- Certificate download button (when `ready`)
- Rejection reason + appeal button (when `rejected`)

### 5.3 Accessibility Improvements

| Issue | Fix |
|-------|-----|
| Radio cards have no visible focus ring in keyboard navigation | Add `focus-within:ring-2 focus-within:ring-rose-500` |
| Photo input uses custom label but no `role` or `aria-describedby` | Add `aria-describedby` pointing to hint/error text |
| `<details>/<summary>` FAQ lacks `aria-expanded` | Migrate to controlled accordion with ARIA |
| Color contrast on `text-white/60` over gradient header | Verify contrast ratio meets WCAG AA (4.5:1 minimum) |

---

## 6. Localisation Gaps

| Gap | Detail |
|-----|--------|
| Payment instructions not localized | Instructions for MoMo/bank (once added) must be localized |
| Mahr units not localized | "RWF" currency format differs across locales |
| Date format in status card | `toLocaleDateString(locale, ...)` used correctly but no fallback if locale is undefined |
| Arabic RTL layout | `ms-auto` / `ms-4` used (logical properties — good), but confirm full RTL testing |
| District names are English-only | All district names in `DISTRICTS` map are English; no RW/AR translation |

---

## 7. Security Concerns

| Concern | Detail | Severity |
|---------|--------|----------|
| NID data stored in plain localStorage | National ID numbers of applicants + witnesses stored unencrypted in browser | HIGH |
| No CSRF protection on (future) API | Must be implemented when backend is built | HIGH |
| Application ID entropy too low | 8-char base-36 ID is guessable; status checker exposes another person's application details | MEDIUM |
| Unsanitised officiant/name fields | Free-text fields sent to (future) backend must be sanitised server-side | MEDIUM |
| External image URLs | Unsplash images embedded via direct URL — content could change or be unavailable | LOW |

---

## 8. Islamic Jurisprudence Compliance Gaps

The platform serves a Muslim community (RMC). The following Nikah requirements have no digital support:

| Requirement | Status |
|-------------|--------|
| Wali (guardian) consent for bride | ❌ No field, no document upload, no approval step |
| Mahr (dowry) agreement | ❌ Not in form or data model |
| Two Muslim witnesses (Shahidain) | ⚠️ NID fields exist but no religious eligibility check |
| Ijab and Qabul (offer and acceptance) | Not a digital workflow but ceremony must be logged |
| Imam must be qualified/registered | ❌ Officiant is free text — no imam registry |
| No marriage during Iddah period | ❌ No check or warning |

---

## 9. Prioritised Remediation Roadmap

### Priority 1 — Stop the Bleeding (Sprint 1–2)

1. **Add auth guard** to `/services/marriage/apply` — redirect to login if not authenticated
2. **Disable the form** or add a prominent "Coming Soon" banner so users don't submit fake applications thinking they are real
3. **Build `POST /api/v1/services/marriage/applications`** endpoint — store to PostgreSQL
4. **Wire frontend** to real API, remove localStorage fallback
5. **Implement duplicate detection** (same couple NID combination, active application already exists)

### Priority 2 — Core Flow (Sprint 3–5)

6. **Add missing form fields**: ceremony date, mahr, phone number (for MoMo), wali NID
7. **Add cross-field validations**: groom ≠ bride NID, witnesses ≠ couple NIDs, witnesses ≠ each other
8. **Integrate payment gateway** (MTN MoMo API minimum viable) — require payment before application is marked `submitted`
9. **Email confirmation** on submission (Application ID + summary)
10. **Build admin marriage dashboard** — list, filter, view details, approve/reject with notes

### Priority 3 — Full Workflow (Sprint 6–8)

11. **Certificate generation** — PDF template with QR code verification
12. **Imam registry** — CRUD for registered imams, assignment to applications
13. **Ceremony scheduling** — calendar view for officers
14. **SMS/push notifications** on status changes
15. **Wali consent upload and review** workflow

### Priority 4 — Quality & Compliance (Sprint 9–10)

16. **Multi-step form wizard** — UX redesign
17. **Accessibility audit** — WCAG AA compliance
18. **Security hardening** — encrypt NID data at rest, increase ID entropy, rate-limit status lookup
19. **Reporting module** — monthly applications, revenue, approval rates
20. **Full RTL testing** for Arabic locale

---

## 10. Effort Estimates

| Area | Estimate |
|------|----------|
| Backend API (NestJS module + DB) | 2 weeks |
| Payment gateway integration | 1.5 weeks |
| Admin dashboard (basic) | 2 weeks |
| Certificate generation | 1.5 weeks |
| Notifications (email + SMS) | 1 week |
| Form UX redesign (wizard) | 1.5 weeks |
| Imam registry + scheduling | 2 weeks |
| Security & compliance hardening | 1 week |
| **Total MVP (Priorities 1–3)** | **~8–10 weeks** |

---

## 11. Key Files Referenced

| File | Role |
|------|------|
| [MarriageApplicationForm.tsx](../apps/frontend/src/components/services/MarriageApplicationForm.tsx) | Application form UI + client validation |
| [MarriageStatusChecker.tsx](../apps/frontend/src/components/services/MarriageStatusChecker.tsx) | Status lookup UI |
| [marriageApplications.ts](../apps/frontend/src/lib/marriageApplications.ts) | localStorage store (to be replaced by API client) |
| [services/marriage/page.tsx](../apps/frontend/src/app/%5Blocale%5D/services/marriage/page.tsx) | Marketing / service info page |
| [services/marriage/apply/page.tsx](../apps/frontend/src/app/%5Blocale%5D/services/marriage/apply/page.tsx) | Apply page shell |
| [services/marriage/status/page.tsx](../apps/frontend/src/app/%5Blocale%5D/services/marriage/status/page.tsx) | Status page shell |
| [001-initial-schema.ts](../apps/backend/src/database/migrations/001-initial-schema.ts) | DB schema (service_applications, transactions, documents) |

---

## 12. Summary Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| UI/UX Visual Design | 7/10 | Polished and modern; needs wizard + accessibility work |
| Frontend Validation | 5/10 | Basic shape/format checks only; cross-field and business rules missing |
| Backend API | 0/10 | Does not exist |
| Data Persistence | 1/10 | localStorage only — not viable for production |
| Payment Integration | 0/10 | Decorative UI only; no actual payment flow |
| Status Tracking | 2/10 | Visual tracker exists but data is static and local |
| Admin Workflow | 0/10 | Not implemented |
| Certificate Generation | 0/10 | Not implemented |
| Notifications | 0/10 | Not implemented |
| Security | 2/10 | PII stored unencrypted in localStorage; no auth guard |
| Islamic Compliance | 1/10 | Wali, mahr, imam registry all absent |
| Localisation | 6/10 | 3 languages; district names and some content untranslated |
| **Overall** | **~24/120 (20%)** | **Prototype quality — not production-ready** |

---

*Report generated from codebase review of branch `emmy`, commit `60106ad`. All line-number references are accurate as of the review date.*
