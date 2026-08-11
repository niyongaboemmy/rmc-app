# Analytics & Dashboards — Implementation Plan

Status: proposed
Author: architecture review, 2026-08-05
Scope: every admin/member surface that should display aggregate data but currently does not,
plus the access model that governs who sees which numbers.

---

## 1. Findings

The gap is not "some pages are missing charts". There are five structural problems, and
adding twelve more report pages on top of the current foundation would multiply all five.

### F1 — There is no analytics contract

Eight domains expose stats, and no two agree on a shape:

| Endpoint | Shape |
|---|---|
| `GET /members/stats` | `{ total, approved, pending, rejected }` |
| `GET /members/weekly-stats` | `[{ day, count }]` |
| `GET /admin/hajj/stats` | `{ total, byStatus: Record<status, number> }` |
| `GET /admin/marriage/stats` | `{ total, revenue, … }` |
| `GET /admin/donations/stats` | `{ count, byCurrency: [{ currency, received }] }` |
| `GET /admin/good-conduct/reports` | `{ total, revenue }` |
| `GET /admin/tenders/reports` | `{ total, awardedValue }` |
| `GET /admin/jobs/reports` | `{ total, byStatus }` |
| `GET /admin/funeral/stats` | `{ … }` |

Consequence: [`/admin/reports`](../apps/frontend/src/app/%5Blocale%5D/admin/reports/page.tsx)
hardcodes four client APIs, four response shapes, four label mappings and four unit
formatters — ~70 lines of `DOMAINS` config for four domains. Extending it to the fifteen
domains this plan proposes means fifteen client round-trips on one page load, over Rwandan
mobile connections, and fifteen bespoke adapters to maintain.

### F2 — The report permission model locks out the people who own the data

`/admin/reports` is gated on `REPORTS_VIEW`. Only `operator`, `admin` and `superadmin` hold it.

But `marriage_officer` holds `MARRIAGE_REPORTS`, `tender_officer` holds `TENDER_REPORTS`,
`scholarship_officer` holds `SCHOLARSHIP_REPORTS` — and **none of them hold `REPORTS_VIEW`**,
so none of them can open the hub that would show their own domain's card. Their per-domain
pages (`/admin/tenders/reports`, `/admin/scholarship/reports`) work because those gate on the
domain permission directly; the hub does not.

Worse: neither `good_conduct_reviewer` nor `good_conduct_officer` holds `GOOD_CONDUCT_REPORTS`
at all. Outside `superadmin` (which short-circuits the guard) and `admin`, nobody can read
Good Conduct figures — including the two roles whose entire job is Good Conduct.

`REPORTS_VIEW` and `<domain>:reports` are currently used as if they were the same kind of
gate. They are not, and the plan below separates them explicitly.

### F3 — `FINANCE_VIEW` / `FINANCE_MANAGE` are dead permissions

Both exist in [`permissions.enum.ts`](../apps/backend/src/common/types/permissions.enum.ts).
Nothing gates on either. The one finance endpoint,
[`GET /admin/finance/payments/export`](../apps/backend/src/finance/finance.controller.ts),
gates on `DONATIONS_VIEW`, and the sidebar's "Finance" entry points at `/admin/donations`.

So there is no way to grant someone the consolidated money view without also granting them
donation campaign management. That is the single most access-sensitive surface in the app
and it has no gate of its own.

### F4 — The admin home displays fabricated data

[`/admin/page.tsx`](../apps/frontend/src/app/%5Blocale%5D/admin/page.tsx):

- Trend percentages are literals — `trend: 12`, `-3`, `8`, `0` (lines 255–258). They never change.
- The System Status panel is five hardcoded `ok={true}` rows plus a hardcoded "100% uptime"
  badge (lines 403–417), while a real `health` controller exists and is never called.
- `getWeeklyStats` buckets by `created_at AT TIME ZONE 'UTC'`
  ([members.service.ts:265](../apps/backend/src/members/members.service.ts#L265)) while the page
  labels the buckets from browser-local dates. Kigali is UTC+2, so every registration between
  00:00 and 02:00 local is attributed to the previous day.

This must be fixed before anything is built on top of it. A dashboard that is known to lie is
worse than no dashboard — it trains people to ignore the ones that don't.

### F5 — Data is already being collected and never shown

These columns are written on every request today and surfaced nowhere:

| Column | Table | Never displayed |
|---|---|---|
| `view_count`, `download_count` | `dawah_books` | Which books are actually read |
| `view_count` | `dawah_questions` | Which questions draw traffic |
| `enrollment_count`, `lesson_count` | `dawah_courses` | Course uptake |
| `last_login_at` | `users` | Dormant accounts, admin activity |
| `capacity`, `district_id`, `sector_id` | `mosques` | Coverage and capacity vs. membership |
| `number_of_positions`, `applications_count` | `job_postings` | Applications per opening |
| `answered_at` − `created_at` | `dawah_questions` | Q&A response time |

Phase 2 below is built entirely from these. It requires no new writes, no new columns, and no
backfill — only aggregation queries and pages.

### Correction to the earlier verbal audit

I previously said the Good Conduct export endpoint was unreachable from the UI. It is
reachable — `goodConductAdminApi.exportCsv` is called from the Good Conduct list page
([good-conduct/page.tsx:147](../apps/frontend/src/app/%5Blocale%5D/admin/good-conduct/page.tsx#L147)).
What Good Conduct actually lacks is a dedicated reports page with date-range breakdowns,
like Jobs, Scholarship and Tenders have.

---

## 2. Target architecture

### 2.1 Backend — one analytics contract, one registry, one endpoint

```
apps/backend/src/analytics/
  analytics.module.ts
  analytics.controller.ts      GET /admin/analytics/overview?from&to
                               GET /admin/analytics/:domain?from&to
                               GET /admin/analytics/:domain/export?from&to
  analytics.registry.ts        multi-provider DI collection
  analytics.cache.ts           Redis, 60s TTL, key = domain:from:to
  dto/metric-set.dto.ts
```

The contract every domain returns:

```ts
export type MetricFormat = 'count' | 'currency' | 'percent' | 'hours' | 'bytes';

export interface Metric {
  key: string;
  label: string;
  value: number;
  format: MetricFormat;
  currency?: string;                       // when format === 'currency'
  delta?: { pct: number; basis: 'previous_period' };   // computed, never hardcoded
  sensitivity?: 'financial';               // stripped unless caller holds the money gate
}

export interface Series   { key: string; label: string; points: { t: string; v: number }[] }
export interface Breakdown{ key: string; label: string; slices: { label: string; value: number }[] }

export interface MetricSet {
  domain: string;                          // 'members' | 'hajj' | 'dawah' | …
  title: string;
  metrics: Metric[];
  series?: Series[];
  breakdowns?: Breakdown[];
  range: { from: string; to: string };
  generatedAt: string;
}
```

Each domain module contributes one provider and nothing else:

```ts
export interface DomainAnalyticsProvider {
  readonly domain: string;
  readonly permission: Permission;         // the gate for this domain's numbers
  getMetrics(range: DateRange): Promise<MetricSet>;
}

// in e.g. hajj.module.ts
providers: [{ provide: ANALYTICS_PROVIDER, useClass: HajjAnalyticsProvider, multi: true }]
```

`GET /admin/analytics/overview` iterates the registry, **filters by the caller's permissions
server-side**, and returns `MetricSet[]`. One request. Adding a domain is one provider class
and one `providers:` line — the hub page changes not at all.

Two rules that fall out of this and are worth stating explicitly:

- **Permission filtering is server-side.** Today the hub filters cards in the browser with
  `hasPermission(d.permission)`; the real protection is the per-endpoint guard. Under the
  registry the filter *is* the guard, so the two can never drift.
- **Aggregate access is separable from record access.** `<domain>:reports` returns counts and
  sums; `<domain>:view` returns case files. A board member can be given every `*_reports`
  permission and see no individual's marriage application, funeral request or conduct record.
  This is the property that makes an Analyst role safe (§3.3).

Day bucketing uses `AT TIME ZONE 'Africa/Kigali'` throughout, and the range boundaries are
resolved server-side, so the browser never decides what "today" means.

### 2.2 Frontend — a chart kit, not a chart dependency

```
apps/frontend/src/components/admin/analytics/
  StatCard.tsx          extracted — three near-identical copies exist today
  MetricGrid.tsx
  BarChart.tsx  LineChart.tsx  DonutChart.tsx  Sparkline.tsx    inline SVG
  DateRangePicker.tsx
  DashboardShell.tsx    header + range + export + grid; every report page is a config of this
  useAnalytics.ts       @tanstack/react-query (already a dependency)
```

**Decision: no charting library.** Four chart forms are needed; `recharts` adds roughly 100 kB
gzipped to an admin bundle served over mobile connections in Rwanda; the app already hand-rolls
its one chart. Inline SVG primitives cost about 400 lines total and stay under our control.
Follow the `dataviz` skill's palette, axis and legend rules when writing them — the colours must
be one system across all fifteen dashboards, not per-page choices.

Each domain report page becomes a thin config over `DashboardShell`, and each domain *list* page
keeps a `MetricGrid` strip at the top (the pattern Hajj, Marriage and Good Conduct already use).

---

## 3. Access model

### 3.1 New permissions

Added to the enum, to a migration, **and** to `02-roles-admin.seed.ts` (see §5 — the seed and
the migrations have already drifted once, in `049-fix-hajj-good-conduct-permissions`):

```
MEMBERS_REPORTS            members:reports
MOSQUES_REPORTS            mosques:reports
SCHOOLS_REPORTS            schools:reports
DONATIONS_REPORTS          donations:reports
HAJJ_REPORTS               hajj:reports
FUNERAL_REPORTS            funeral:reports
JOB_APPLICATIONS_REPORTS   job_applications:reports
DAWAH_REPORTS              dawah:reports
DISCUSSIONS_REPORTS        discussions:reports
CONTACT_MESSAGES_REPORTS   contact_messages:reports
USERS_REPORTS              users:reports
```

`MARRIAGE_REPORTS`, `GOOD_CONDUCT_REPORTS`, `TENDER_REPORTS`, `SCHOLARSHIP_REPORTS` already
exist and keep their meaning. `FINANCE_VIEW` stops being dead and becomes the gate for the
consolidated cross-service ledger and for any metric tagged `sensitivity: 'financial'`.

### 3.2 The two-tier rule

- `REPORTS_VIEW` — *may open the cross-service Reports hub and the executive overview.*
  Grants no data by itself; the hub shows the intersection of this and the domain permissions.
  **Granted to every officer role**, which fixes F2.
- `<domain>:reports` — *may see that domain's aggregate numbers, wherever they appear* (hub
  card, dedicated page, list-page strip, export).
- `<domain>:view` — unchanged; individual records.
- `FINANCE_VIEW` — the consolidated ledger, and revenue figures inside other domains'
  dashboards. A domain officer keeps seeing their own domain's fee revenue (they reconcile it);
  what `FINANCE_VIEW` gates is the *combined* money view across services.
- `REPORTS_EXPORT` — required in addition to `<domain>:reports` to pull XLSX/CSV.

### 3.3 Role → dashboard matrix

Legend: ● full · ◐ own domain only · ○ none

| Dashboard | super&shy;admin | admin | operator | marriage officer | good conduct rev./off. | tender officer | scholarship officer | scholar | moderator | **finance officer** ᴺ | **analyst** ᴺ | member |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Executive overview (`/admin`) | ● | ● | ◐ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ● | ○ |
| Reports hub (`/admin/reports`) | ● | ● | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ● | ○ |
| Members & community | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| Mosques & coverage | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| Schools | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| Finance — consolidated ledger | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ ᶠ | ○ |
| Donations | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ● | ○ |
| Marriage | ● | ● ᵃ | ○ | ● | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| Good conduct | ● | ● | ○ | ○ | ● | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| Hajj | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| Funeral | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| Jobs & postings | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| Scholarship | ● | ● | ○ | ○ | ○ | ○ | ● | ○ | ○ | ○ | ● | ○ |
| Tenders | ● | ● | ○ | ○ | ○ | ● | ○ | ○ | ○ | ○ | ● | ○ |
| Dawah content (courses/library) | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| Discussions (Q&A ops) | ● | ● | ○ | ○ | ○ | ○ | ○ | ● | ● | ○ | ● | ○ |
| Inbox / contact | ● | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |
| Users & access | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Own member dashboard | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● |

ᵃ `admin` gains `MARRIAGE_REPORTS` — aggregate figures only. It does **not** gain `MARRIAGE_VIEW`,
so individual applications stay with the Marriage Officer. This is the aggregate/record split
working as intended.
ᶠ The analyst sees each service's own revenue but not the consolidated ledger; that stays with
Finance. Flip this with a single `FINANCE_VIEW` grant if leadership wants it.
ᴺ New roles, see §3.4.

### 3.4 Two new roles

**Finance Officer** (`finance_officer`, `isSystem: false`)
`FINANCE_VIEW`, `DONATIONS_VIEW`, `DONATIONS_REPORTS`, `MARRIAGE_REPORTS`,
`GOOD_CONDUCT_REPORTS`, `HAJJ_REPORTS`, `REPORTS_VIEW`, `REPORTS_EXPORT`.
Rationale: today the only way to see money is `admin`, which also carries user management,
content deletion and tender evaluation. Reconciliation should not require that.
Note it holds **no** `*_MANAGE` and no `DONATIONS_MANAGE` — it reads and exports, it does not
edit campaigns.

**Analyst** (`analyst`, `isSystem: false`)
`REPORTS_VIEW`, `REPORTS_EXPORT`, and every `<domain>:reports` **except** `FINANCE_VIEW` and
`USERS_REPORTS`. No `*_VIEW`, no `*_MANAGE`.
Rationale: leadership and board reporting. Because aggregate access is separable from record
access (§2.1), this role can see every number in the organisation and not one person's file.

### 3.5 Guard changes

- `GET /admin/analytics/overview` — `@Permissions(REPORTS_VIEW)`; the registry filters per domain.
- `GET /admin/analytics/:domain` — `@Permissions(REPORTS_VIEW)` + provider's own permission.
- `…/export` — additionally `REPORTS_EXPORT`.
- `GET /admin/finance/**` — change from `DONATIONS_VIEW` to `FINANCE_VIEW`
  ([finance.controller.ts:30](../apps/backend/src/finance/finance.controller.ts#L30)).
  **Breaking**: the Payment History export on the donations page currently works for anyone with
  `DONATIONS_VIEW`. The migration must grant `FINANCE_VIEW` to `admin` and `superadmin` in the
  same transaction, or the export silently 403s for admins.
- Metrics tagged `sensitivity: 'financial'` are stripped from the response, not hidden in the UI.

---

## 4. Delivery phases

### Phase 0 — Foundation and truth (no new dashboards)

1. `analytics` module: contract, registry, Redis cache, `overview` + `:domain` endpoints.
2. Frontend chart kit + `DashboardShell` + extracted `StatCard`.
3. Port the four existing report pages (jobs, scholarship, tenders, hub) onto the contract.
4. **Fix F4**: real period-over-period deltas; wire System Status to the `health` controller or
   delete the panel; re-bucket `getWeeklyStats` to `Africa/Kigali`.

Exit criterion: `/admin` and `/admin/reports` display nothing that isn't computed from the database.

### Phase 1 — Access model

5. New permissions in the enum + a migration matched on `roles.slug` + the same set in
   `02-roles-admin.seed.ts`.
6. Grant `REPORTS_VIEW` to `marriage_officer`, `good_conduct_reviewer`, `good_conduct_officer`,
   `tender_officer`, `scholarship_officer`, `scholar`, `moderator` — fixes F2.
7. Grant `GOOD_CONDUCT_REPORTS` to both good-conduct roles — fixes the second half of F2.
8. `finance_officer` and `analyst` roles; move `/admin/finance/**` onto `FINANCE_VIEW` — fixes F3.
9. Sidebar entries gated on the new permissions.

### Phase 2 — Zero-new-data dashboards (highest return)

Everything here reads columns already written (F5). No schema changes, no backfill.

10. **Dawah content** — views/downloads per book, top 10, by language and category, published vs.
    draft, course enrolment and lesson completion.
11. **Discussions ops** — unanswered queue depth and age, median time to first answer, verified
    answer rate, report queue, moderation actions per moderator. Built for `scholar`/`moderator`.
12. **Jobs & postings** — applications per posting, applications per position, funnel by status,
    time-to-decision, open vs. closed vs. expired. Extends the existing jobs report page.
13. **Mosques & coverage** — mosques by district and sector, members per mosque, capacity vs.
    registered membership, imam coverage gaps, mosques with no registered members.
14. **Users & access** — role distribution, active vs. dormant by `last_login_at`, admin action
    volume from the audit log, accounts with elevated permissions.
15. **Inbox** — volume over time, median response time, unanswered backlog by age.

### Phase 3 — Service dashboards

16. Dedicated report pages for **Hajj**, **Funeral**, **Good Conduct**, **Marriage**
    (date range, status funnel, turnaround time, revenue where applicable, export).
17. **Schools** — by level, district, status.
18. **Members & community** — growth over time, by category/district/mosque, approval turnaround,
    rejection reasons.
19. Extend the hub to all fifteen domains (now a registry read, not fifteen adapters).

### Phase 4 — Finance and executive

20. **Consolidated finance ledger** — revenue across donations, marriage, good conduct and hajj;
    by period, method, currency; reconciliation gaps (initiated vs. confirmed vs. reconciled);
    IntouchPay failure rate. Gated on `FINANCE_VIEW`.
21. **Executive overview** — rebuild `/admin` on the registry: cross-service KPI row, real trends,
    service health, attention queue (anything pending beyond its SLA).

### Phase 5 — Member self-service

22. `/member/dashboard` gains the member's own data: donation history and receipts, every
    application they hold across hajj/marriage/good-conduct/jobs/scholarship with current status,
    course progress, documents. Scoped to `userId` at the query level, not filtered in the UI.

---

## 5. Risks and standing rules

**Seed ↔ migration drift.** `049-fix-hajj-good-conduct-permissions` exists because a migration
matched `WHERE name IN ('superadmin','admin')` when those are `slug` values, and because the
seed loop overwrites `permissions` wholesale — so a reseed strips whatever migrations added.
Every permission change in this plan lands in **both** places, and migrations match on `slug`.
Add a test that asserts the seed's `ADMIN_PERMISSIONS` is a superset of everything the
migrations grant to `admin`.

**Query cost.** Aggregations over `created_at` on tables that only have a primary-key index will
table-scan as data grows. Phase 0 adds `created_at` (and `created_at, status` where the dashboard
groups on both) indexes for every table a provider touches.

**Timezone.** All bucketing is `AT TIME ZONE 'Africa/Kigali'`, server-side. The browser never
computes date boundaries — that is the F4 bug and it must not be reintroduced per-provider.

**Small-cell disclosure.** Breakdowns by mosque or sector can identify individuals where counts
are 1–2 (e.g. "1 good conduct rejection in Sector X"). Providers suppress slices below a
threshold of 5 for any breakdown carrying an outcome, and label them "fewer than 5".

**Admin UI is English-only** by existing convention — see the note in `admin/reports/page.tsx`.
Dashboards follow it; no `next-intl` keys for admin analytics.

**Cache staleness.** 60s Redis TTL is invisible for daily figures and wrong for the attention
queue on the executive overview. The queue reads live; everything else is cached.
