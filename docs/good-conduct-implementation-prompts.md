# Good Conduct Certificate Service — Implementation Prompts

**Companion to:** [good-conduct-service-implementation-plan.md](./good-conduct-service-implementation-plan.md) — read that document for full context (schema, API spec, process flow, RBAC) before running any prompt below. These prompts operationalize that plan into a sequential build order.

**How to use this file:** Run the prompts **in order** — each assumes the previous ones have landed (merged/committed), since later prompts build on entities, endpoints, or components introduced earlier. Paste one prompt at a time into a fresh Claude Code session (or hand to a subagent). Each prompt is self-contained: it restates the necessary context so the session doesn't need this conversation's history. After each prompt completes, review the diff before moving to the next one — don't chain them blindly.

Prompts 1–4 are backend-only and can, if you have two developers, be split from prompts 5–9 (frontend) once prompt 1 (schema) has landed — but within each track, order matters.

---

## Prompt 1 — Database Migration & Entities

```
You are working in the RMC App (NestJS + TypeORM + PostgreSQL backend at
apps/backend/). Read docs/good-conduct-service-implementation-plan.md in
full, especially §7 (Database Schema) and §6.1 (Module Structure).

Task: lay the data foundation for a new "Good Conduct Certificate" service,
following apps/backend/src/marriage/entities/ as your exact structural and
naming-convention precedent (enums colocated in the entity file, column
naming, soft-delete via deleted_at, etc.).

Do this:
1. Write a new TypeORM migration (check apps/backend/src/database/migrations
   for the numbering/naming convention already in use, e.g. how the
   marriage migration was named, and follow it) that creates exactly the
   three tables and one sequence specified in plan §7:
   - good_conduct_requests
   - good_conduct_status_history
   - good_conduct_transactions
   - good_conduct_request_seq (Postgres sequence)
   Match column types, constraints, and indexes precisely as written in the
   plan doc's SQL block.
2. Create apps/backend/src/good-conduct/entities/ with three TypeORM entity
   classes matching those tables:
   - good-conduct-request.entity.ts (with GoodConductStatus and
     PaymentStatus enums — reuse the same PaymentStatus value set marriage
     uses: unpaid/pending_cash/processing/paid/refunded/failed)
   - good-conduct-status-history.entity.ts
   - good-conduct-transaction.entity.ts
3. Scaffold (empty/minimal, not fully implemented yet) good-conduct.module.ts,
   good-conduct.controller.ts, good-conduct-admin.controller.ts, and
   good-conduct.service.ts in apps/backend/src/good-conduct/, and register
   GoodConductModule in app.module.ts's imports array. These can be near-
   empty shells for now — later prompts fill them in.
4. Run the migration against the dev database and verify the tables exist
   with the correct columns (e.g. via a describe/psql check), then report
   the result.

Do not implement any business logic, endpoints, payment code, or frontend
work yet — this prompt is schema and scaffolding only.
```

---

## Prompt 2 — Permissions, Roles & Payment Type Seed

```
You are working in the RMC App backend (apps/backend/). Read
docs/good-conduct-service-implementation-plan.md §6.5 (RBAC), §13, and
Appendix A. The good-conduct entities and module scaffold already exist from
a prior step (apps/backend/src/good-conduct/).

Task: register the permissions, a default role, and the payment fee type
this service needs — no request/business logic yet.

Do this:
1. Add these five entries to common/types/permissions.enum.ts, matching the
   existing MARRIAGE_* naming convention exactly:
   GOOD_CONDUCT_VIEW = 'good_conduct:view'
   GOOD_CONDUCT_MANAGE = 'good_conduct:manage'
   GOOD_CONDUCT_APPROVE = 'good_conduct:approve'
   GOOD_CONDUCT_CERTIFICATE = 'good_conduct:certificate'
   GOOD_CONDUCT_REPORTS = 'good_conduct:reports'
2. Find wherever roles are seeded (look for how the "Marriage Officer" role,
   or equivalent, was seeded — likely in a database/seeds/ file) and add two
   new roles following the same pattern:
   - "Good Conduct Reviewer": view + approve + certificate
   - "Good Conduct Officer": view + manage
   Also append all five good_conduct:* permissions to whatever the existing
   Super Admin role's permission set is, so super admin is unaffected by
   scope creep elsewhere.
3. Add GOOD_CONDUCT_FEE to the PaymentTypeKey enum in
   payment-settings/entities/payment-type.entity.ts (alongside the existing
   DONATION, MARRIAGE_FEE, etc.).
4. Seed one PaymentType row for GOOD_CONDUCT_FEE and one default
   PaymentTypeRate row (pick a reasonable placeholder amount, e.g. 2000 RWF
   — flag it clearly as a placeholder for RMC leadership to adjust via
   /admin/settings once live), following whatever seed mechanism marriage's
   MOSQUE_RATE_CODE/OUTSIDE_MOSQUE_CODE rates used.
5. Verify: query the DB (or run the app and check /admin/settings/payments
   if that's faster) to confirm the new fee type and rate appear correctly,
   and confirm the two new roles appear in /admin/roles with the right
   permissions checked.

Do not implement any good-conduct business logic or endpoints in this
prompt — only permissions/roles/payment-type plumbing.
```

---

## Prompt 3 — Core Backend Service, State Machine & Member Endpoints

```
You are working in the RMC App backend (apps/backend/src/good-conduct/,
already scaffolded with entities from a prior step). Read
docs/good-conduct-service-implementation-plan.md §5 (process flow / state
machine), §8.1 (member endpoint spec), and §9 (validation workflow) in full.

Use apps/backend/src/marriage/marriage.service.ts and marriage.controller.ts
as your direct structural precedent — same style of ownership checks,
status-history recording, and DTO validation. Do not invent new conventions.

Do this:
1. Implement good-conduct.service.ts covering:
   - createDraft(applicantId, dto): validates and inserts a
     good_conduct_requests row with status='draft', payment_status='unpaid',
     amount_due resolved from PaymentSettingsService.getActiveRates
     (PaymentTypeKey.GOOD_CONDUCT_FEE) with a hardcoded fallback constant if
     no rate is configured.
   - updateDraft(id, applicantId, dto): only allowed while status is
     'draft' or 'more_info_requested' (mirrors marriage's amendment-editing
     rule); throws otherwise.
   - findOwn(id, applicantId) / listOwn(applicantId, filters)
   - cancel(id, applicantId): only allowed from 'draft' or 'submitted'.
   - A private recordStatusChange(request, fromStatus, toStatus, changedBy,
     notes) helper that both updates the request row and inserts a
     good_conduct_status_history row — copy marriage.service.ts's
     recordStatusChange pattern exactly.
   - A guard method (e.g. assertCanApprove) that throws if
     payment_status !== 'paid' — this is the server-side enforcement that a
     request cannot be approved without payment; it must not be bypassable
     by calling the API directly (this will be exercised by admin logic in
     a later prompt, but the guard itself belongs here).
   - Duplicate-request detection: when creating a draft, check for another
     active (draft/submitted/under_review/more_info_requested/approved)
     request from the same applicant and either block or flag it per plan
     §9 point 3 — your call which is friendlier UX, but document the choice.
2. Implement create-good-conduct-request.dto.ts and
   update-good-conduct-status.dto.ts with class-validator decorators:
   fullNames (string, 3-150 chars), fatherName/motherName (optional string),
   districtId/sectorId (optional UUID), cell/village (optional string,
   <=100 chars), email (optional, valid email), phone (required, RW phone
   format), mosqueId (optional UUID), requestedImamName (optional string),
   motif (enum: employment/visa/school/other), motifDetail (optional text,
   required if motif==='other' via a class-level validator).
3. Implement good-conduct.controller.ts per plan §8.1's endpoint table:
   POST /good-conduct/requests, PATCH /good-conduct/requests/:id,
   GET /good-conduct/requests/:id, GET /good-conduct/requests,
   POST /good-conduct/requests/:id/cancel. All JWT-guarded, all
   ownership-scoped (a member can only see/edit their own). Leave
   the /pay, /pay/bank-notice, and /certificate-data endpoints as
   NotImplementedException stubs — later prompts implement those.
4. Write unit tests for the state machine transitions and the ownership/
   payment guards (check if marriage has a *.service.spec.ts to mirror the
   test framework and style; if none exists, use whatever test runner is
   configured in apps/backend/package.json).

Do not implement payment gateway calls, SMS, or certificate logic in this
prompt.
```

---

## Prompt 4 — Admin Endpoints & Validation Workflow

```
You are working in the RMC App backend (apps/backend/src/good-conduct/).
Read docs/good-conduct-service-implementation-plan.md §8.2 (admin endpoint
spec) and §9 (validation workflow) in full. good-conduct.service.ts already
has createDraft/updateDraft/findOwn/listOwn/cancel/recordStatusChange/
assertCanApprove from a prior step.

Use apps/backend/src/marriage/marriage-admin.controller.ts as your direct
precedent for permission-gating style (@Permissions(Permission.X) decorator
+ guard) and response shapes.

Do this:
1. Extend good-conduct.service.ts with admin-side methods:
   - adminList(filters, pagination): filter by status, payment_status,
     mosqueId, search (name/phone), date range.
   - adminGetById(id): full detail including status history.
   - adminUpdateStatus(id, adminUserId, { action: 'approve'|'reject'|
     'request_more_info', notes/reason }): enforces assertCanApprove() when
     action==='approve'; requires a non-empty reason for reject and
     non-empty notes for request_more_info; calls recordStatusChange().
   - adminAssignImam(id, adminUserId, { mosqueImamId? , note? }): sets
     assigned_imam_id if a matching MosqueImam is found/provided, otherwise
     just stores the note (mirrors marriage's requestedOfficiant /
     assignedImamId dual-field handling — read how marriage.service.ts
     handles this exact case).
   - adminConfirmPayment(id, adminUserId, { method: 'bank'|'cash', amount }):
     mirrors marriage's adminConfirmCashPayment — sets payment_status='paid',
     amount_paid, inserts a good_conduct_transactions row with
     confirmed_by=adminUserId.
   - adminGetReports(filters): counts by status, payment totals for a period
     — keep it simple (a few aggregate queries), matching whatever level of
     complexity marriage's admin reports endpoint has.
2. Implement good-conduct-admin.controller.ts wiring all of §8.2's endpoints:
   GET /admin/good-conduct/requests, GET /admin/good-conduct/requests/:id,
   PATCH /admin/good-conduct/requests/:id/status,
   POST /admin/good-conduct/requests/:id/assign-imam,
   POST /admin/good-conduct/requests/:id/payment/confirm,
   GET /admin/good-conduct/reports, GET /admin/good-conduct/reports/export
   (CSV). Gate each with the correct permission from plan §8.2's table
   (view/approve/manage/reports as specified — the /certificate endpoint is
   NOT part of this prompt, a later prompt implements it alongside PDF
   generation).
3. Write integration tests covering: a user without GOOD_CONDUCT_VIEW gets
   403 on every admin route; reject without a reason is rejected with 400;
   approve while payment_status is 'unpaid' is rejected with 400/409.

Do not implement certificate number allocation, PDF generation, or the
public verify endpoint — those come in Prompt 8.
```

---

## Prompt 5 — Payment Integration (IntouchPay) & Webhook

```
You are working in the RMC App backend. Read
docs/good-conduct-service-implementation-plan.md §10 in full. The good-
conduct request/admin endpoints already exist from prior steps; the /pay,
/pay/bank-notice endpoints are currently NotImplementedException stubs in
good-conduct.controller.ts.

The payment gateway is IntouchPay — the existing, already-working client is
apps/backend/src/integrations/intouch-pay/intouch-pay.service.ts. Do NOT
write any new HTTP/gateway integration code; only wire this existing
service, following apps/backend/src/marriage/marriage.module.ts (how it
imports IntouchPayModule) and marriage.service.ts's calls to
IntouchPayService.requestPayment()/getTransactionStatus() as your exact
precedent.

Do this:
1. Import IntouchPayModule into GoodConductModule.
2. Implement the real POST /good-conduct/requests/:id/pay: calls
   IntouchPayService.requestPayment() with the request's amount_due and the
   applicant-provided phone number, inserts a good_conduct_transactions row
   (method='momo', status='pending', provider_ref=<returned ref>), and
   returns whatever confirmation payload the frontend needs to start
   polling.
3. Implement POST /good-conduct/requests/:id/pay/bank-notice: sets
   payment_status='processing' (awaiting admin confirmation), inserts a
   good_conduct_transactions row (method='bank', status='pending').
4. Create apps/backend/src/webhooks/good-conduct-webhook.service.ts,
   mirroring marriage-webhook.service.ts exactly: given an IntouchPay
   callback payload, look up the good_conduct_transactions row by
   provider_ref, on success set its status='completed', set the parent
   request's payment_status='paid', amount_paid, and advance status from
   'draft' to 'submitted' via recordStatusChange(); on failure set
   status='failed' and leave payment_status as-is (do not silently retry).
5. Add exactly one dispatch line to the existing shared
   apps/backend/src/webhooks/webhooks.controller.ts intouch-pay callback
   handler, in the same sequence as the existing marriageWebhook/
   donationWebhook.handleCallback(payload) calls — do not otherwise
   restructure that controller.
6. Add a GET /good-conduct/requests/:id/pay/status (or reuse whatever
   polling mechanism marriage's frontend uses — check first) so the
   frontend can poll for payment confirmation without waiting on the
   webhook round trip alone.
7. Write tests mocking IntouchPayService: successful payment advances
   draft->submitted; failed payment leaves status untouched and
   payment_status='failed'; a webhook payload with an unknown provider_ref
   is safely ignored (no exception bubbling to the shared webhook
   controller, since other services' callbacks flow through the same
   endpoint).

Do not implement SMS notifications yet (a later prompt) — for now it's fine
for the webhook service to no-op where a notification would eventually be
sent, but leave a clear one-line comment marking the exact spot.
```

---

## Prompt 6 — SMS Notifications

```
You are working in the RMC App backend (apps/backend/src/good-conduct/).
Read docs/good-conduct-service-implementation-plan.md §12 in full. All the
status transitions (submission, payment confirmed, under review, more info
requested, approved, rejected) already exist as service methods from prior
steps.

Use apps/backend/src/marriage/sms-templates.ts and marriage.service.ts's
private dispatchSms()/sendXxxSms() methods (around lines 1044-1163) as your
exact precedent — same fire-and-forget dispatch helper that never throws,
same per-event gating via NotificationSettingsService.isSmsEnabled(key).

Do this:
1. Create apps/backend/src/good-conduct/sms-templates.ts with template
   functions for each event in plan §12:
   goodConduct.submission, goodConduct.payment_confirmed,
   goodConduct.under_review, goodConduct.more_info_requested,
   goodConduct.approved, goodConduct.rejected,
   goodConduct.certificate_ready.
   Keep messages short (SMS length constraints — check how
   sms.service.ts handles multipart limits) and localization-agnostic
   for now (English only is fine for SMS, unlike the web UI).
2. Register these seven event keys in whatever seed mechanism
   NotificationSettingsService uses (find where marriage's
   'marriage.submission' etc. keys were seeded and add these alongside,
   each toggle-able independently in /admin/settings).
3. Wire dispatch calls into good-conduct.service.ts and
   good-conduct-webhook.service.ts at the exact points identified by the
   one-line comments left in Prompt 5's webhook work, plus at
   createDraft (submission... actually fire this on the SUBMITTED
   transition, not draft creation, since draft isn't yet a real
   commitment) and adminUpdateStatus (under_review/more_info_requested/
   approved/rejected).
4. Confirm nothing throws if SMS sending fails or if a phone number is
   missing/malformed — the fire-and-forget helper must swallow errors, same
   as marriage's.
5. Manually trigger each of the 7 events in a dev environment (or via a
   test hitting a mocked SmsService) and confirm the right template fires
   at the right transition, with no duplicate/missing notifications across
   the full happy path.

Do not implement certificate-ready logic beyond the SMS template itself —
actual certificate issuance is Prompt 8.
```

---

## Prompt 7 — Frontend: Request Form, Payment Step & Status Tracking

```
You are working in the RMC App frontend (Next.js App Router,
apps/frontend/src/, Tailwind, next-intl for en/rw/ar). Read
docs/good-conduct-service-implementation-plan.md §2, §5, and §8.1 in full.
Assume all backend endpoints referenced below already exist (they were
built in prior prompts) — if you find one missing or shaped differently
than the plan doc describes, adapt to what actually exists and note the
discrepancy rather than blocking.

The services catalogue already reserves a "Coming Soon" placeholder for
this service at slug "conduct" (apps/frontend/src/app/[locale]/services/
page.tsx and services/[slug]/page.tsx's SERVICE_META['conduct']). Do NOT
touch or remove that placeholder yet — a later prompt handles the cutover.
Build the real pages at a new route instead:
apps/frontend/src/app/[locale]/services/good-conduct/.

Use apps/frontend/src/app/[locale]/services/marriage/{apply,status}/ as
your structural and visual precedent, but do not copy marriage's multi-step
wizard complexity — this form is much simpler (no witnesses, no ceremony
scheduling). A single page or a 2-step flow is enough.

Do this:
1. Build services/good-conduct/apply/page.tsx:
   - Step/section 1: full names, father's name, mother's name, district
     (dropdown), sector (dependent dropdown), cell (free text), village
     (free text), email, phone.
   - Step/section 2: mosque (dropdown, existing public mosques endpoint —
     find it, likely something like /public/mosques used elsewhere), imam
     name (free text), motif (select: employment/visa/school/other, with a
     conditional free-text field when "other" is chosen).
   - Client-side validation matching the backend DTO rules from Prompt 3
     before allowing submit.
   - On submit: POST /good-conduct/requests, then route to the payment step
     for the returned request id.
2. Build the payment step (a sub-route or a state within the apply flow,
   your call — check how marriage structures this and follow it): fee
   amount display (from the created request's amountDue), phone number
   entry + "Pay Now" calling POST /good-conduct/requests/:id/pay, a
   polling loop checking payment confirmation (mirror marriage's polling
   interval/timeout), and a "Pay by bank transfer instead" alternative
   showing RMC bank details with an "I've made the transfer" button calling
   POST /good-conduct/requests/:id/pay/bank-notice.
3. Build services/good-conduct/status/page.tsx: lookup by application/
   certificate number (plus phone for basic verification), rendering
   distinct UI for each status in the plan's state machine (§5) —
   especially more_info_requested, which must let the applicant edit and
   resubmit their request (route back into a pre-filled apply form).
4. Add all new strings to messages/en.json, messages/rw.json, and
   messages/ar.json — no hardcoded English left in components.
5. Test the full flow (submit -> pay -> track) manually in a dev server,
   at a 375px mobile viewport, and in the Arabic (RTL) locale.

Do not touch the admin panel, certificate generation, or the services
catalogue placeholder — those are separate prompts.
```

---

## Prompt 8 — Certificate Generation, Issuance & Public Verification

```
You are working across both the RMC App backend and frontend. Read
docs/good-conduct-service-implementation-plan.md §11 and §6.4 in full.

Certificates in this codebase are rendered CLIENT-SIDE via pdf-lib
overlaying a static flattened template PDF — there is no server-side PDF
generation. Study apps/frontend/src/lib/provisionalCertificate.ts closely;
it is your exact template for the pixel-to-point coordinate overlay
technique. Also study apps/backend/src/members/members.service.ts's use of
the `qrcode` package's QRCode.toDataURL() combined with pdf-lib's
embedPng() — that is the pattern for embedding a REAL SCANNABLE QR CODE
IMAGE, which marriage's certificate does not do (marriage only prints a
verify URL as text — do not copy that specific gap; Good Conduct should
have an actual embedded QR image).

Do this:
1. If no template PDF exists yet at
   apps/frontend/public/templates/good-conduct-certificate.pdf, flag this
   clearly as a blocker requiring a designer deliverable, and build against
   a simple clearly-labeled placeholder layout (plain text/borders) so the
   engineering work isn't blocked — do not fabricate an official-looking
   RMC seal or letterhead yourself.
2. Backend: implement POST /admin/good-conduct/requests/:id/certificate
   (permission good_conduct:certificate) in good-conduct.service.ts /
   good-conduct-admin.controller.ts: allocates the certificate number from
   good_conduct_request_seq (format RMC-GC-<district-code>-<YYYYMM>-<5-digit
   seq>, reusing apps/backend/src/marriage/district-codes.ts — if it's
   marriage-specific and not exported/shared, move it to a common location
   rather than duplicating the file), stores it on the request, and
   advances status to 'closed'. Never allocate a certificate number
   anywhere on the client.
3. Backend: implement GET /good-conduct/requests/:id/certificate-data
   (member's own request, only when status is 'closed') returning the data
   payload the frontend needs to render the PDF.
4. Backend: implement GET /good-conduct/public/verify/:certificateNumber
   (no auth): returns ONLY full name, mosque name, imam name, issue date,
   and motif — NEVER phone, email, or residence — and only when status is
   'closed'. Return an identical-looking 404 for both nonexistent
   certificate numbers and real-but-not-yet-issued ones, so pending/
   rejected requests can't be enumerated from the outside.
5. Frontend: create apps/frontend/src/lib/goodConductCertificate.ts —
   overlay engine drawing full name, parents' names, residence, mosque
   name, imam name, motif, certificate number, and issue date onto the
   template, plus an embedded QR PNG (generate via qrcode's toDataURL
   client-side, encoding https://<domain>/verify/good-conduct/
   <certificateNumber>, then pdf.embedPng() it in).
6. Frontend: create
   apps/frontend/src/app/[locale]/certificates/good-conduct/[number]/
   page.tsx — loads certificate-data, builds the PDF blob client-side,
   shows it in an iframe with Print/Download buttons (mirror
   certificates/[number]/page.tsx's structure).
7. Frontend: create
   apps/frontend/src/app/[locale]/verify/good-conduct/[number]/page.tsx —
   a clean public page calling the verify endpoint and showing either the
   minimal verified details or a clear "not found / not yet issued"
   message.
8. Add an "Issue Certificate" action button to the admin detail view
   (apps/frontend/src/app/[locale]/admin/good-conduct/[id]/page.tsx —
   built in Prompt 9 if that lands first, otherwise add a small stub call
   site now and note it for that prompt to wire up).

Test the full loop yourself: get a test request approved, issue the
certificate, download the PDF, follow the QR's URL, and confirm the verify
page shows correct minimal data and correctly rejects a made-up certificate
number. Report the template-asset blocker prominently if it applies.
```

---

## Prompt 9 — Admin Dashboard (List, Detail, Reports)

```
You are working in the RMC App frontend (apps/frontend/src/app/[locale]/
admin/). Read docs/good-conduct-service-implementation-plan.md §9 and §13.
All backend admin endpoints from Prompts 4 and 8 already exist.

Use apps/frontend/src/app/[locale]/admin/marriage/page.tsx and
admin/marriage/[id]/page.tsx as your direct structural precedent — same
stats-cards-plus-filterable-table layout, same detail-view-with-action-
panel layout.

Do this:
1. Add a "Good Conduct" entry to components/admin/AdminSidebar.tsx's
   NAV_ITEMS array, gated by Permission.GOOD_CONDUCT_VIEW (mirror the
   marriage entry's shape; add GOOD_CONDUCT_* to the frontend's Permission
   enum/lib if it's a separate mirror of the backend one — check
   lib/permissions.ts first).
2. Build admin/good-conduct/page.tsx: stats cards (total, pending, under
   review, approved this month), filters (status, payment status, mosque,
   search by name/phone, date range), paginated table, wrapped in
   ProtectedRoute gated by Permission.GOOD_CONDUCT_VIEW.
3. Build admin/good-conduct/[id]/page.tsx: full request detail (identity,
   parents, residence, contact, masjid/imam, motif), a status action panel
   (Approve / Reject-with-required-reason / Request-More-Info-with-
   required-notes) gated by Permission.GOOD_CONDUCT_APPROVE, an
   "Assign Imam" control (searchable dropdown of MosqueImam records scoped
   to the request's mosque, with a manual-note fallback) gated by
   GOOD_CONDUCT_MANAGE, a payment section with payment_status display and a
   manual "Confirm Cash/Bank Payment" action gated by GOOD_CONDUCT_MANAGE,
   an "Issue Certificate" button gated by GOOD_CONDUCT_CERTIFICATE (wire it
   to the endpoint from Prompt 8 if not already connected), and a status
   history timeline component reading from the request's status history.
4. Build a reports tab/page showing counts by status and revenue collected,
   gated by Permission.GOOD_CONDUCT_REPORTS, with a CSV export button
   calling the export endpoint.
5. Localize all admin-facing strings in en/rw/ar.
6. Test that a user without GOOD_CONDUCT_VIEW cannot see the sidebar entry
   or load /admin/good-conduct pages directly by URL (should redirect/403,
   not silently render empty).

Do not touch the public verification page or the services catalogue
placeholder.
```

---

## Prompt 10 — QA, Hardening & Launch Cutover

```
You are doing pre-launch QA and cutover for the Good Conduct Certificate
service in the RMC App. Read
docs/good-conduct-service-implementation-plan.md in full — §14 (sprint
plan), §15 (testing strategy), §16 (risk register). All backend, frontend,
payment, and certificate work from Prompts 1-9 should already be merged —
confirm what's actually landed (check git log / recent commits/PRs
mentioning "good conduct" or "good-conduct") before assuming anything is
done; do not assume the numbered prompts above ran in a vacuum without
deviation.

Do this:
1. Run the three critical end-to-end paths manually (or via Playwright if
   a suite pattern already exists for marriage):
   a. Happy path: login -> submit request -> pay (MoMo sandbox, or bank/
      cash manual flow if sandbox unavailable) -> admin approves ->
      certificate issued -> download -> verify via public page.
   b. More-info-requested path: submit -> admin requests more info ->
      applicant edits and resubmits -> admin approves.
   c. Rejection path: submit -> admin rejects with reason -> applicant
      sees the reason on their status page.
2. Confirm, by calling the API directly (curl/Postman), that a request
   cannot be approved while payment_status is 'unpaid' — this must be a
   server-side 4xx rejection, not merely a disabled frontend button.
3. Confirm the public verify endpoint never returns phone/email/residence,
   and returns indistinguishable responses for nonexistent vs. not-yet-
   issued certificate numbers.
4. Run an accessibility check (axe-core or manual) and RTL rendering check
   on the apply form, status page, and admin detail page.
5. Confirm all new strings render correctly in en, rw, and ar (no raw
   translation keys visible anywhere in the UI).
6. Only after all of the above pass: update
   apps/frontend/src/app/[locale]/services/page.tsx and
   services/[slug]/page.tsx to remove the 'conduct' coming-soon placeholder
   entry and point the tile at the real /services/good-conduct route.
7. Produce a short launch checklist / sign-off note (what was tested, what
   passed, any known issues deferred to follow-up) rather than a long
   report — keep it terse and actionable.

Do not make functional changes to already-merged code beyond what's needed
to unblock cutover, except for trivial, obviously-in-scope fixes (typos,
off-by-ones) discovered while testing — file/flag anything larger instead
of silently expanding scope.
```

---

## Notes for whoever runs these

- Prompts 1–6 are backend-sequential; Prompt 7 (frontend apply/status) can start as soon as Prompt 3 lands, in parallel with Prompts 4–6.
- Prompt 8 (certificates) touches both backend and frontend and needs a real template PDF asset from a designer — flag that blocker early rather than at Prompt 8 itself.
- Prompt 9 (admin dashboard) can start as soon as Prompts 3–4 land; it doesn't need to wait for payments/certificates to be fully wired, only their endpoints to exist as stubs.
- Prompt 10 is the only one that touches the public-facing services catalogue — do not run it early "just to see how it looks."
