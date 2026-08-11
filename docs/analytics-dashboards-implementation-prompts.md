# Analytics & Dashboards — Implementation Prompts (team task assignments)

Companion to **`docs/analytics-dashboards-implementation-plan.md`**. Read the plan first —
these prompts do not restate it, they assign it. Section refs like §2.1 point there.

**Drafted:** 5 August 2026 · **Status:** ready to assign

---

## Decisions locked — read before any prompt

| # | Decision |
|---|---|
| 1 | **One analytics contract.** Every domain returns a `MetricSet`. No new bespoke `/stats` shapes — ever. |
| 2 | **Permission filtering is server-side.** The registry filter *is* the guard. The browser never decides which cards exist. |
| 3 | **Aggregates are separable from records.** `<domain>:reports` = counts and sums. `<domain>:view` = case files. Never conflate. |
| 4 | **No charting library.** Inline SVG primitives in `components/admin/analytics/`. |
| 5 | **`REPORTS_VIEW` opens the hub; it grants no data.** Every officer role gets it. |
| 6 | **`FINANCE_VIEW` becomes real** and gates the consolidated ledger. |

Still open — **chase, do not guess**: whether the Analyst role should see the consolidated
ledger (§3.3 ᶠ); who is appointed Finance Officer; whether the small-cell suppression
threshold of 5 is right for RMC's district sizes.

---

## Team & ownership

| Role | Owns | Prompts |
|---|---|---|
| **Senior Database Engineer** | Permissions migration, role grants, seed parity, indexes | `DB-1` … `DB-3` |
| **Senior Backend Engineer** | Analytics module, registry, cache, providers, exports | `BE-1` … `BE-9` |
| **Senior Frontend Engineer** | Chart kit, DashboardShell, analytics client, pages, sidebar | `FE-1` … `FE-9` |
| **QA** | Permission matrix coverage, timezone correctness, cache behaviour | `QA-1` … `QA-3` |

---

## Golden rules (every prompt inherits these — violating one is a revert, not a review comment)

1. **No number reaches a screen unless it came from the database.** The current admin home
   ships literal trend percentages and a hardcoded "100% uptime". Nothing like that ships
   again. If a figure cannot be computed yet, it does not render — no placeholder, no
   plausible-looking constant.
2. **Bucket dates in `Africa/Kigali`, server-side.** `AT TIME ZONE 'Africa/Kigali'`, and the
   *server* resolves "last 7 days". The browser must never compute a date boundary — that is
   the existing bug in `members.getWeeklyStats` (UTC buckets, browser-local labels) and it must
   not be reintroduced per-provider.
3. **A provider never returns a record.** No names, no emails, no IDs of people. Counts, sums,
   and label→value slices only. If a dashboard needs a record, it links to the domain page,
   which has its own guard.
4. **Permission goes on the provider, not the page.** `DomainAnalyticsProvider.permission` is
   the single declaration. The controller reads it, the registry filters on it, the sidebar
   reads the same enum value. Three places, one source.
5. **Every permission change lands in BOTH the migration and `02-roles-admin.seed.ts`,
   and the migration matches on `roles.slug`.** Migration `049` exists solely because a
   previous one matched `WHERE name IN ('superadmin','admin')` when those are `slug` values,
   and because the seed loop overwrites `permissions` wholesale so a reseed silently strips
   what migrations added. Both halves, every time.
6. **Superadmin bypasses `PermissionsGuard` entirely** (`user.role === 'superadmin'` returns
   true before the permission list is read). Never test an access rule as superadmin — it
   proves nothing. Every permission test uses a real role.
7. **Money is tagged, not hidden.** A metric the caller may not see is stripped from the
   response by the provider. Never rendered-then-hidden, never `display:none`.
8. **Admin UI is English-only** — the existing convention, noted in `admin/reports/page.tsx`.
   No `next-intl` keys for analytics.
9. **Load the `dataviz` skill before writing the first line of chart code.** Fifteen dashboards
   must read as one system; per-page colour choices are how that fails.
10. **Cache aggregates, never the attention queue.** 60 s Redis TTL on `MetricSet`s; anything
    that says "N items need action right now" reads live.

---

# Phase 0 — Foundation and truth

Nothing user-visible ships except correctness fixes. Exit criterion: **`/admin` and
`/admin/reports` display nothing that isn't computed from the database.**

---

## `DB-1` — Report indexes

**Goal.** Every column an analytics provider groups or filters on is indexed before the first
provider ships.

**Do.** New migration `1790000000062-058-analytics-indexes.ts`.

For each table a Phase 0–3 provider touches, add `created_at`, and a composite
`(status, created_at)` where the dashboard groups on both:

```
member_profiles         (created_at), (approval_status, created_at)
donations               (created_at), (status, created_at)
marriage_applications   (created_at), (status, created_at)
good_conduct_requests   (created_at), (status, created_at)
hajj_registrations      (created_at), (status, created_at)
funeral_requests        (created_at)
job_applications        (created_at), (status, created_at)
tender_applications     (created_at), (status, created_at)
scholarship_applications(created_at), (status, created_at)
dawah_questions         (created_at), (status, created_at), (answered_at)
dawah_books             (status, view_count)
contact_messages        (created_at), (status, created_at)
users                   (last_login_at)
```

Use `CREATE INDEX IF NOT EXISTS`; verify each table and column name against the entity before
writing the line — several of the above are guesses at table names taken from module names.

**Acceptance.** `EXPLAIN` on each provider's main aggregation shows an index scan, not a
sequential scan, on a table seeded with 100 k rows.

**Don't.** Don't add indexes for tables no provider reads yet. Dead indexes cost writes.

---

## `BE-1` — The analytics contract

**Goal.** One type every domain returns, in one place, before any provider is written.

**Files.**
```
apps/backend/src/analytics/dto/metric-set.dto.ts
apps/backend/src/analytics/analytics.types.ts
```

**Contract.** Exactly as §2.1 of the plan — `Metric`, `Series`, `Breakdown`, `MetricSet`,
`DateRange`, `DomainAnalyticsProvider`, `ANALYTICS_PROVIDER` token.

Two details the plan leaves to you:

- `Metric.delta` is **computed by the provider** by running the same aggregation over the
  immediately preceding window of equal length. A provider that cannot compute a delta omits
  the field. It does not send `0`.
- `MetricSet.range` echoes back the **resolved** range, so the UI displays what the server
  actually measured rather than what the user asked for.

**Acceptance.** The file compiles with no imports from any domain module. The dependency
arrow points domain → analytics, never the reverse.

---

## `BE-2` — Registry, cache and controller

**Goal.** One endpoint that returns every `MetricSet` the caller is allowed to see.

**Files.**
```
apps/backend/src/analytics/analytics.module.ts
apps/backend/src/analytics/analytics.registry.ts
apps/backend/src/analytics/analytics.cache.ts
apps/backend/src/analytics/analytics.controller.ts
```

**Routes.**

| Route | Guard |
|---|---|
| `GET /admin/analytics/overview?from&to` | `@Permissions(REPORTS_VIEW)` — registry filters per provider |
| `GET /admin/analytics/:domain?from&to` | `@Permissions(REPORTS_VIEW)` + the provider's own permission, checked in the handler |
| `GET /admin/analytics/:domain/export?from&to` | the above **+** `REPORTS_EXPORT`; `@Res()` + `sendXlsx` |

**Registry.** Collect providers with a `multi: true` DI token:

```ts
@Inject(ANALYTICS_PROVIDER) private readonly providers: DomainAnalyticsProvider[]
```

`overview` maps providers → `getMetrics(range)` for those whose `permission` the caller holds,
in parallel, with `Promise.allSettled`. **A provider that throws yields a `MetricSet` with an
`error: true` marker, never a failed response** — one broken domain must not blank the hub.
The current hub already gets this right client-side; keep the property when it moves server-side.

**Permission read.** The request principal carries `permissions?: string[]`; mirror
`PermissionsGuard` exactly — `role === 'superadmin'` or `permissions.includes('*')` sees all.
Extract that predicate into one shared helper and have the guard use it too, so the two can
never diverge (they already have, in `finance.controller.ts`'s hand-rolled `canViewMarriage`).

**Cache.** `@InjectRedis()`, key `analytics:{domain}:{from}:{to}`, TTL 60 s, JSON value.
Cache **per provider**, not per overview response — otherwise every distinct permission set
gets its own cache entry and the hit rate collapses.

**Acceptance.**
- An operator calling `overview` gets only the domains they hold `*:reports` for.
- A role without `REPORTS_VIEW` gets 403 from `overview`.
- One provider throwing returns 200 with that domain marked errored.
- Second identical call inside 60 s issues no database queries.

**Don't.** Don't let `:domain` accept an unregistered name and 200 with an empty set — 404.

---

## `BE-3` — Port the four existing report endpoints onto the contract

**Goal.** The contract is proven against real domains before new ones are built on it.

**Do.** Write providers for the four domains the hub already shows, each wrapping the existing
service method — no new SQL in this task:

```
marriage/marriage-analytics.provider.ts       ← marriage.service.getStats()
good-conduct/good-conduct-analytics.provider.ts ← .adminGetReports()
tenders/tender-analytics.provider.ts          ← .adminGetReports()
donations/donations-analytics.provider.ts     ← .getStats() + .getDaily()
job-applications/job-analytics.provider.ts    ← .adminGetReports()
scholarship/scholarship-analytics.provider.ts ← .adminGetReports()
```

Tag marriage/good-conduct/donations revenue metrics `sensitivity: 'financial'`.

Keep the old endpoints alive and untouched this phase — `FE-3` migrates the pages, and the old
routes are deleted in a follow-up once nothing calls them.

**Acceptance.** `GET /admin/analytics/overview` as an `admin` returns six `MetricSet`s whose
figures match the current hub's cards exactly, number for number.

---

## `BE-4` — Fix the fabricated data (F4)

**Goal.** Delete every lie on the admin home.

**Do.**

1. **Timezone.** `members.service.getWeeklyStats` — change both the `SELECT` and the `GROUP BY`
   from `AT TIME ZONE 'UTC'` to `AT TIME ZONE 'Africa/Kigali'`, and return the full 7-day
   series with explicit zeros for empty days so the client stops reconstructing the day list
   from browser-local dates.
2. **Real deltas.** The members provider computes `delta` against the preceding period (rule
   above). The hardcoded `trend: 12 / -3 / 8 / 0` in `admin/page.tsx` dies with `FE-4`.
3. **System status.** Either surface the real `GET /health` (it already reports `database` and
   `redis`), or delete the panel. A panel that reports five services when the backend knows
   about two is not a status panel. **Recommendation: extend `/health` to report the file
   server too, then render the three it actually checks.** Delete the "100% uptime" badge
   outright — nothing measures uptime.

**Acceptance.** A member registered at 00:30 Kigali time appears on that day's bar, not the
previous day's. Killing Redis turns the Redis row red within one poll.

---

## `FE-1` — Chart kit

**Goal.** Four chart primitives and one stat card, used by all fifteen dashboards.

**Files.**
```
apps/frontend/src/components/admin/analytics/
  StatCard.tsx  MetricGrid.tsx  BarChart.tsx  LineChart.tsx
  DonutChart.tsx  Sparkline.tsx  DateRangePicker.tsx  formatMetric.ts
```

**Do.**
- **Load the `dataviz` skill first** (golden rule 9).
- Extract `StatCard` from the three near-identical copies that exist today
  (`admin/page.tsx`, `good-conduct/page.tsx`, `hajj/page.tsx`) and delete them.
- `formatMetric.ts` renders by `Metric.format` — `count` → `toLocaleString()`,
  `currency` → `12,000 RWF`, `percent`, `hours`, `bytes`. **Formatting is driven by the
  contract, never by the call site.** Today each page formats RWF its own way.
- Charts take `Series` / `Breakdown` from the contract directly. No per-page data reshaping.
- Inline SVG, `viewBox` + `preserveAspectRatio`, no fixed pixel widths — these render on
  phones.

**Acceptance.** No new dependency in `package.json`. Every chart legible at 360 px wide.
Empty series renders an explicit "No data in this range", not a blank box.

**Don't.** Don't reuse the div-and-percentage-height bar chart from `admin/page.tsx`. It
cannot do axes, negative values, or more than one series.

---

## `FE-2` — `DashboardShell` and the analytics client

**Goal.** A report page becomes a config object, not a bespoke page.

**Files.**
```
apps/frontend/src/components/admin/analytics/DashboardShell.tsx
apps/frontend/src/lib/analyticsApi.ts
apps/frontend/src/hooks/useAnalytics.ts
```

**Do.**
- `analyticsApi.overview(range)` and `.domain(name, range)` via `apiClient`;
  `.export(name, range)` via the existing `downloadXlsx` helper.
- `useAnalytics` wraps `@tanstack/react-query` (already a dependency) — 60 s `staleTime` to
  match the server cache.
- `DashboardShell` renders: title, `DateRangePicker`, export button (only when the caller has
  `REPORTS_EXPORT`), `MetricGrid`, then series and breakdown sections. It takes a `MetricSet`.

**Acceptance.** A new domain dashboard is a page file under 40 lines.

---

## `FE-3` — Port the four existing report pages

**Goal.** Prove `DashboardShell` against what exists, and delete the four bespoke adapters.

**Do.** Rewrite `/admin/reports` as a `.map()` over `analyticsApi.overview()` — **delete the
`DOMAINS` array entirely**, including its per-domain `load()` functions, label strings and
`rwf()`/`num()` formatters. Rewrite `/admin/jobs/reports`, `/admin/scholarship/reports`,
`/admin/tenders/reports` on `DashboardShell`.

**Acceptance.** `/admin/reports` makes **one** network request. The rendered figures are
identical to the pre-port page for the same role.

---

## `FE-4` — Rebuild the admin home on the contract

**Goal.** The home page stops lying.

**Do.** Replace the five `Promise.allSettled` calls with one `overview()`. Delete the hardcoded
`trend:` literals. Wire System Status to `/health` per `BE-4`, or delete the panel. Keep the
count-up animation and the layout — this is a data change, not a redesign.

**Acceptance.** Every number and every arrow on `/admin` traces to a query. Grep for
`trend: 1`, `ok={true}` and `100% uptime` returns nothing.

---

# Phase 1 — Access model

## `DB-2` — New permissions and role grants

**Goal.** The permission set from §3.1 exists, and the F2/F3 lockouts are fixed.

**Files.**
```
apps/backend/src/common/types/permissions.enum.ts
apps/frontend/src/lib/permissions.ts                  ← mirror, keep in sync
apps/backend/src/database/migrations/1790000000063-059-analytics-permissions.ts
apps/backend/src/database/seeds/02-roles-admin.seed.ts
```

**Do.**

1. Add the eleven new `*_REPORTS` permissions (§3.1) to the backend enum **and** the frontend
   mirror in the same commit.
2. Migration, matched on `roles.slug` (golden rule 5):
   - grant `REPORTS_VIEW` to `marriage_officer`, `good_conduct_reviewer`,
     `good_conduct_officer`, `tender_officer`, `scholarship_officer`, `scholar`, `moderator`;
   - grant `GOOD_CONDUCT_REPORTS` to both good-conduct roles;
   - grant `MARRIAGE_REPORTS` to `admin` (aggregates only — **not** `MARRIAGE_VIEW`);
   - grant `DISCUSSIONS_REPORTS` to `scholar` and `moderator`;
   - grant the domain `*_REPORTS` set to `admin` and `superadmin`;
   - grant `FINANCE_VIEW` to `admin` and `superadmin` **in the same transaction as `BE-5`'s
     guard change**, or the Payment History export 403s for every admin the moment it deploys.
3. Mirror every grant into the seed's permission arrays.
4. `down()` removes only what `up()` added, using the `jsonb_array_elements_text` filter
   pattern from migration `049`.

**Acceptance.** A test asserts, for each system role, that the seed's array is a superset of
everything the migrations grant it. This test is the whole point — write it first.

---

## `DB-3` — Finance Officer and Analyst roles

**Goal.** Money is viewable without admin, and numbers are viewable without records.

**Do.** Insert both roles (§3.4) in the migration and the seed, `isSystem: false`.

Analyst gets `REPORTS_VIEW`, `REPORTS_EXPORT`, and every `<domain>:reports` **except**
`FINANCE_VIEW` and `USERS_REPORTS`. It gets **no** `*_VIEW` and **no** `*_MANAGE` — that
absence is the feature.

**Acceptance.** An Analyst can open every dashboard and receives 403 on
`/admin/members`, `/admin/marriage/:id`, `/admin/hajj` and every other record route. Test this
explicitly; it is the security property the role exists for.

---

## `BE-5` — Move finance onto `FINANCE_VIEW`

**Do.** `finance.controller.ts`: `@Permissions(DONATIONS_VIEW)` → `@Permissions(FINANCE_VIEW)`.
Replace the hand-rolled `canViewMarriage()` helper with the shared predicate from `BE-2`.

**Ship in the same release as `DB-2`.** Sequenced wrongly this is a live 403 for every admin.

---

## `FE-5` — Sidebar and route gating

**Do.** Add the new dashboards to `NAV_ITEMS` in `AdminSidebar.tsx` with their `permission`
values; group the per-domain reports as `children` under their domain, following the existing
Scholarship/Jobs pattern. Add a "Finance" entry gated on `FINANCE_VIEW` pointing at the new
ledger (Phase 4) — until then it stays out of the nav rather than pointing at `/admin/donations`.

Each new page wraps in `ProtectedRoute permissions={[<DOMAIN>_REPORTS]}`.

**Acceptance.** Log in as each of the eleven roles; the sidebar matches the §3.3 matrix row for
row. This is the QA-1 checklist too — do it once, together.

---

# Phase 2 — Zero-new-data dashboards

Every metric here reads a column already written. No schema changes, no backfill. Ship in this
order — highest value per line of code first.

## `BE-6` / `FE-6` — Dawah content, Discussions, Jobs & postings

| Provider | Metrics | Series | Breakdowns |
|---|---|---|---|
| `dawah` (`DAWAH_REPORTS`) | books published, total views, total downloads, courses published, total enrolments | views over time | top 10 books by views, by language, by category, published vs. draft |
| `discussions` (`DISCUSSIONS_REPORTS`) | unanswered count, oldest unanswered (hours), median time to first answer, verified-answer rate, open reports | questions asked / answered over time | by category, by status, moderation actions per moderator |
| `jobs` (`JOB_APPLICATIONS_REPORTS`) | open postings, total applications, applications per position, median time to decision | applications over time | funnel by status, applications per posting, open vs. closed vs. expired |

Discussions time-to-answer is `answered_at − created_at` on `dawah_questions`; use
`percentile_cont(0.5)`, not `avg` — one question answered after six months makes a mean
meaningless.

The Dawah pages are the strongest argument for this whole programme: `view_count` and
`download_count` have been incrementing on every read since launch and no one has ever seen them.

## `BE-7` / `FE-7` — Mosques, Users & access, Inbox

| Provider | Metrics | Breakdowns |
|---|---|---|
| `mosques` (`MOSQUES_REPORTS`) | total, active, total capacity, mosques with no registered members | by district, by sector, members per mosque, capacity vs. registered membership, imam coverage gaps |
| `users` (`USERS_REPORTS`) | total accounts, active in 30 d, dormant 90 d+, accounts with elevated permissions | by role, logins over time, admin actions from the audit log |
| `inbox` (`CONTACT_MESSAGES_REPORTS`) | unread, median response time, backlog older than 7 d | volume over time, by status |

**Small-cell suppression applies here** (golden rule 3 + plan §5): any breakdown slice carrying
an *outcome* — rejections, conduct results, complaint types — is suppressed below 5 and labelled
"fewer than 5". Plain volume counts by district are not suppressed.

---

# Phase 3 — Service dashboards

## `BE-8` / `FE-8` — Hajj, Funeral, Good Conduct, Marriage, Schools, Members

Dedicated `/admin/<domain>/reports` pages on `DashboardShell`, each with: status funnel,
turnaround time (`percentile_cont(0.5)` on decision − submission), volume over time, revenue
where the service charges a fee (tagged `sensitivity: 'financial'`), and XLSX export.

Members additionally: growth over time, by category / district / mosque, approval turnaround,
rejection reasons.

The hub picks these up with **no change** — that is the registry earning its keep. If any of
these six requires editing `/admin/reports`, `BE-2` was built wrong; stop and fix that instead.

---

# Phase 4 — Finance and executive

## `BE-9` / `FE-9` — Consolidated ledger and executive overview

**Ledger** (`FINANCE_VIEW`): revenue across donations, marriage, good conduct and hajj by
period, method and currency; reconciliation gaps (initiated vs. confirmed vs. reconciled — the
data `donation-reconciliation.service.ts` already computes); IntouchPay failure rate.

**Executive overview**: rebuild `/admin` as a cross-service KPI row with real deltas, service
health, and an **attention queue** — everything pending past its SLA, across every service, one
list, each row linking to the domain page. The queue reads **live**, not cached (golden rule 10).

---

# Phase 5 — Member self-service

## `FE-10` — `/member/dashboard`

The member's own donation history and receipts, every application they hold across
hajj / marriage / good-conduct / jobs / scholarship with current status, course progress,
documents.

**Scope at the query, by `userId` from the JWT.** Never filter in the UI, never accept a
`userId` parameter. This is the only surface in the programme that returns records rather than
aggregates, and it returns exactly one person's.

---

# QA

## `QA-1` — Permission matrix

Log in as each of the thirteen roles (eleven existing + Finance Officer + Analyst). For each,
assert the visible sidebar, the reachable dashboards, and the 403s — against §3.3 row by row.
**Never test with superadmin** (golden rule 6).

The two rows that matter most, because they are the ones that are wrong today:

- `marriage_officer`, `tender_officer`, `scholarship_officer`, both good-conduct roles: can now
  open `/admin/reports` and see **exactly one** card.
- `analyst`: can open every dashboard and **no** record page.

## `QA-2` — Timezone

Seed rows at 23:30 and 00:30 Kigali time on consecutive days. Assert each lands on its own
Kigali day in every series, from a browser set to UTC, to `Africa/Kigali`, and to
`America/New_York`. The browser's timezone must not change a single figure.

## `QA-3` — Cache and failure

Assert: identical calls inside 60 s issue no queries; a provider throwing returns 200 with that
domain errored and the rest intact; a 100 k-row table returns `overview` in under 800 ms cold.

---

## Definition of done

1. `/admin` and `/admin/reports` contain no constant that pretends to be a measurement.
2. Adding a new domain dashboard = one provider class + one `providers:` line + one page config.
3. Every role in §3.3 sees exactly its row — verified by logging in, not by reading code.
4. `FINANCE_VIEW` gates the money, and no role holds it by accident.
5. The seed-vs-migration parity test passes.
6. No new frontend dependency.
