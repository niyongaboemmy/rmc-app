# Dawah — Community Discussions (Q&A) — Implementation Plan

**Status:** proposed, not started · **Drafted:** 16 July 2026 · **Rev. 2** (moderation model)
**Scope:** a public, searchable question-and-answer section under `/dawah`, where members
ask about religion and community life, the community answers, and RMC scholars mark the
answer that is authoritative.

> **Rev. 2 changes the moderation model.** Rev. 1 applied one policy to questions and
> answers alike; Rev. 2 splits them, because the risk is not symmetric — and adds
> community auto-hide so the exposure window does not depend on a moderator being awake.
> Touches §0, §2.1–2.3, §2.5, §6, §7, §9, §10, §11. **Schema is additive** (one column on
> `dawah_categories`, two on the post tables, extra status values); roles, language
> handling and the security posture are unchanged.

---

## 0. The decision that shapes everything else

This is not a comments feature. **An answer here is a religious ruling that someone will
act on.** If a stranger tells a sister she may skip prayers in a given circumstance and
she does, the harm is real, it happened on RMC's domain, under RMC's logo, and it is
indexed by Google. Every design choice below follows from taking that seriously.

The four decisions were taken by RMC (16 July 2026):

| Decision | Choice |
|---|---|
| Who answers | **Anyone answers; scholars verify.** A new `Scholar` role marks one answer "Verified by RMC"; it pins to the top with a badge. |
| Visibility | **Asymmetric** (Rev. 2) — see below. |
| Access | **Public reads, members post.** Anonymous visitors and crawlers read; posting requires sign-in. |
| Anonymity | **Opt-in per question.** The name is hidden publicly; `user_id` is always stored for moderation. |

### 0.1 Moderation is asymmetric, because the risk is asymmetric

Rev. 1 applied one policy to everything. That was wrong, and it is worth being precise
about why: **a question and an answer are not the same object.**

- A bad **question** is noise — off-topic, clumsy, occasionally rude. It embarrasses.
- A bad **answer** is a false ruling that a reader acts on. It harms.

Applying one policy to both forces a choice between a dead section and an unvetted one.
Splitting them dissolves the trade:

| Content | Policy | Rationale |
|---|---|---|
| **Questions** — every category | **Post-moderation.** Live immediately. | Liveliness where it is harmless. An unanswered question is the point of the section. |
| **Answers** — categories flagged `scholar_review` (`fiqh`, `aqeedah`, `family-life`, `new-muslims`) | **Held `pending_review`** until a Scholar releases or verifies. Author sees their own, marked "awaiting review". | Caution exactly where the harm lives. Nothing that reads as a ruling is public unreviewed. |
| **Answers** — open categories (`arabic-language`, `seerah`, `hadith`, `quran-studies`) | **Post-moderation.** Live immediately. | Grammar and history are discussion, not fatwa. |
| **Anything reported ≥ `REPORT_AUTOHIDE_THRESHOLD` (3)** | **Auto-hidden** pending review. | The community is the first line; the rota is the appeal court. |

**Which categories are which is RMC's call, stored per category, and the default is
`scholar_review`** (§2.3). A category added in two years inherits caution, not permission
— the safe default must be the lazy one.

### 0.2 The consequences, said out loud

1. **Questions are still briefly public before anyone vets them.** Accepted. Auto-hide
   shortens that window from *hours* to *minutes* without waking anyone up.
2. **Scholars become a bottleneck on exactly the content where a bottleneck is wanted** —
   but a bottleneck with no SLA is a queue that rots in private instead of in public. §9
   makes a scholar turnaround commitment a launch gate, not a nicety.
3. **Auto-hide is abusable.** Three coordinated members can silence a question. Mitigated
   (§6) by reporter eligibility and by logging every auto-hide so a pattern is visible —
   never eliminated. This is the correct trade against a thin volunteer rota.
4. **All of this still assumes a rota.** Auto-hide needs it least, post-moderation needs
   it fastest. If RMC cannot staff moderation at all, the honest build is narrower still:
   scholars answer, the community only asks — the one shape that needs nobody watching.

---

## 1. What exists today (surveyed, not assumed)

| Thing | State | Consequence for us |
|---|---|---|
| Forum / comments anywhere in the app | **None** | Greenfield. No pattern to copy, and no existing UGC surface to learn from. |
| Roles | Admin, Good Conduct Officer, Good Conduct Reviewer, Marriage Officer, Member, Operator, Super Admin | **No Scholar role exists.** We create one. |
| Permissions | `Permission` enum, `apps/backend/src/common/types/permissions.enum.ts`, values like `dawah:view` / `dawah:manage`; granted to roles by migration (`030-subscribers-permissions.ts` is the pattern) | Follow it exactly. |
| Throttling | `ThrottlerModule` global: **100 req / 60s** | Far too loose for posting. Needs per-route limits (§6). |
| Email | `integrations/email/email.service.ts`, shared `wrapHtml()` shell | Reuse for notifications. **Never trigger a real broadcast to test.** |
| Status-workflow precedent | `contact-messages` (entity + status + admin inbox) | The moderation queue should look like this, not be invented. |
| HTML sanitisation | `apps/frontend/src/lib/sanitize.ts` (`sanitizeRichHtml`, server-only) | **Necessary but NOT sufficient here** — see §5. |
| Rich text editor | `components/ui/RichTextEditor.tsx` (TipTap) | **Do not reuse for public UGC** — see §5. |
| Tri-lingual content | Catalogue rows carry `_en/_rw/_ar` columns | **Does not apply to UGC** — see §4. |

---

## 2. Data model

Five new tables, plus one column on an existing one (§2.3). Migration numbering continues
the existing sequence (`<timestamp>-036-dawah-discussions.ts`, etc.).

### 2.1 `dawah_questions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | varchar(180) unique | `/dawah/discussions/{slug}` — permalink, SEO |
| `title` | varchar(200) | plain text, never HTML |
| `body` | text | markdown source (§5), not HTML |
| `language` | varchar(20) | `en` / `rw` / `ar` — **the language the member wrote in** (§4) |
| `category_id` | uuid FK → `dawah_categories` | **reuses the existing Dawah categories** — one taxonomy, not two |
| `author_id` | uuid FK → users, NOT NULL | always stored, even when anonymous |
| `is_anonymous` | boolean default false | hides the name in the API projection, never in the row |
| `status` | varchar(20) | `published` \| `auto_hidden` \| `hidden` \| `locked` \| `deleted` |
| `answer_count` | int default 0 | denormalised; see §2.7 |
| `report_count` | int default 0 | denormalised; drives auto-hide (§2.5) |
| `view_count` | int default 0 | same counter discipline as `dawah_books` |
| `verified_answer_id` | uuid null | the scholar-verified answer, denormalised for list queries |
| `last_activity_at` | timestamptz | sort key for "active" — **not** `updated_at`, which an edit would bump |
| `created_at` / `updated_at` / `deleted_at` | timestamptz | soft delete, as elsewhere |

Indexes: `(status, last_activity_at DESC)` for the default list; `(category_id)`;
`(author_id)`; GIN on `to_tsvector(title || body)` for search (§7).

Questions are never `pending_review` — that state exists only for answers (§0.1). A
question goes live on submit and can only be pulled *back* (auto-hidden, hidden, locked).

### 2.2 `dawah_answers`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `question_id` | uuid FK, cascade delete | |
| `body` | text | markdown source |
| `author_id` | uuid FK → users NOT NULL | |
| `is_anonymous` | boolean default false | |
| `status` | varchar(20) | `pending_review` \| `published` \| `auto_hidden` \| `hidden` \| `deleted` |
| `is_verified` | boolean default false | set only by a Scholar |
| `verified_by_id` | uuid null FK → users | **who** verified — accountability, not decoration |
| `verified_at` | timestamptz null | |
| `released_by_id` | uuid null FK → users | released without endorsing — see below |
| `vote_score` | int default 0 | denormalised from votes |
| `report_count` | int default 0 | denormalised; drives auto-hide (§2.5) |
| `created_at` / `updated_at` / `deleted_at` | | |

**The initial status is computed, never supplied.** On create, the service reads the
question's category policy: `scholar_review` → `pending_review`, otherwise `published`.
It must never come from the DTO — a client-settable status is a client-settable
publication gate.

**Release and verify are two different acts, and conflating them would be a lie.**

- *Release* → `published`, `released_by_id` set. Means: **not harmful.** No badge.
- *Verify* → `is_verified`, `verified_by_id` set, pinned with the badge. Means: **RMC
  says this is correct.**

A scholar clearing a queue of twenty answers is doing the first. If the UI only offers
"approve", every released answer silently acquires RMC's endorsement, which is precisely
the outcome the whole design exists to prevent.

**Invariants — in the database, not in service code:**

- At most one verified answer per question:
  `CREATE UNIQUE INDEX ... ON dawah_answers (question_id) WHERE is_verified` — two
  scholars verifying different answers concurrently is the race a TypeScript check loses.
- A verified answer must be published:
  `CHECK (NOT is_verified OR status = 'published')` — "verified but hidden" is incoherent.

### 2.3 `dawah_categories.answer_policy` (one new column on an existing table)

```sql
ALTER TABLE dawah_categories
  ADD COLUMN answer_policy varchar(20) NOT NULL DEFAULT 'scholar_review';
-- CHECK (answer_policy IN ('scholar_review','open'))
```

The table is shared with courses and books, and a discussions-specific column on it is a
mild coupling — accepted deliberately, because the alternative is a second taxonomy, and
two category lists that drift apart is a worse problem than one column that some rows
ignore. Courses and books simply never read it.

**The default is `scholar_review`.** Opting a category *out* is an explicit act by RMC,
so the failure mode of forgetting is "answers wait for a scholar", not "unvetted rulings
went live". Seed values (RMC to confirm, §10):

| Category | Policy | Why |
|---|---|---|
| `fiqh`, `aqeedah`, `family-life`, `new-muslims` | `scholar_review` | Jurisprudence, creed, marriage/divorce, practice for reverts — answers here *are* rulings |
| `arabic-language` | `open` | Grammar. Nobody is harmed by a wrong plural |
| `seerah`, `hadith`, `quran-studies` | `open`, provisionally | History and study — but they slide into rulings easily. Start `open`; move on evidence |

Editable in the admin categories page, gated on `DISCUSSIONS_MODERATE`. Changing the
policy is **not retroactive** — flipping a category to `scholar_review` does not un-publish
what is already live. If RMC needs that, it is a deliberate bulk action with a moderation
log entry, not a side effect of a dropdown.

### 2.4 `dawah_votes`

`(id, answer_id FK, user_id FK, value smallint CHECK (value IN (-1, 1)), created_at)`
with **`UNIQUE (answer_id, user_id)`**. The unique constraint *is* the "one vote per
person" rule; a service-level check would race.

### 2.5 `dawah_reports` — and auto-hide

`(id, target_type ENUM('question','answer'), target_id uuid, reporter_id uuid FK,
reason varchar(40), note text, status ENUM('open','actioned','dismissed'),
handled_by_id uuid null, handled_at timestamptz null, created_at)`.

`UNIQUE (target_type, target_id, reporter_id)` — one report per person per item, so a
single angry member cannot manufacture a queue.

**Auto-hide (Rev. 2).** In the same transaction as the insert: increment the target's
`report_count`; if it reaches `REPORT_AUTOHIDE_THRESHOLD` (3) **and** the target is
`published`, set `status = 'auto_hidden'` and write a `dawah_moderation_log` row with
`moderator_id = NULL, action = 'auto_hide'`.

Why it earns its place: it is roughly half a day of work and it converts the exposure
window from *however long until a moderator wakes up* to *minutes*. It is the highest-
leverage item in this design, and the only part of the moderation story that degrades
gracefully when the rota is thin — which, with volunteers, it will be.

Three rules that make it survivable:

1. **Only reporters with an account older than `REPORT_MIN_ACCOUNT_AGE` (7 days) count
   toward the threshold.** Others still file a report; it just does not trip the hide.
   Without this, three throwaway accounts silence anything.
2. **`auto_hidden` is a distinct status, never `hidden`.** A moderator must be able to see
   at a glance whether a human made the call or a threshold did. Collapsing them destroys
   exactly the signal needed to notice abuse.
3. **Auto-hide is reversible and logged.** Restoring resets `report_count` to 0 and marks
   the reports `dismissed`, so the same three cannot immediately re-trip it.

**A question with a verified answer is exempt from auto-hide.** Once RMC has publicly
endorsed an answer, three reports must not be able to pull that page down; that is a
moderator's decision to make deliberately.

### 2.6 `dawah_moderation_log`

`(id, moderator_id, action varchar(30), target_type, target_id, reason text, created_at)`.

Append-only. **Not optional.** Hiding a member's religious question is a social act in a
real community; "who hid my question and why" must have an answer that is not "nobody
knows". This is also the audit trail if a decision is ever disputed.

### 2.7 On the denormalised counters

`answer_count`, `vote_score`, `last_activity_at` are caches. Update them in the **same
transaction** as the thing they count, not in an event handler — a drifting answer count
is a bug report every time. `view_count` is the exception: bump it fire-and-forget,
exactly like `dawah-book.service.ts` already does, because a view counter must never
break a read.

---

## 3. Roles & permissions

### 3.1 New permissions (`permissions.enum.ts`)

```ts
// ── Dawah Discussions ──────────────────────────────────────────────
DISCUSSIONS_MODERATE = 'discussions:moderate',  // hide/lock/restore, handle reports
DISCUSSIONS_VERIFY   = 'discussions:verify',    // mark an answer "Verified by RMC"
```

Deliberately **not** reusing `dawah:manage`. Managing the course catalogue and passing
religious judgement on an answer are different authorities held by different people. A
content admin who can upload a PDF must not thereby be able to stamp RMC's endorsement on
a ruling.

### 3.2 New role: `Scholar`

Created by migration; holds `discussions:verify` only. Not an admin — a scholar has no
business in the members table.

| Role | `discussions:moderate` | `discussions:verify` |
|---|---|---|
| Super Admin | ✓ | ✗ (see below) |
| Admin | ✓ | ✗ |
| **Scholar** (new) | ✗ | ✓ |
| **Moderator** (new) | ✓ | ✗ |
| Member | ✗ | ✗ |

> ⚠ **FINDING (17 July, during BE build) — the withholding does not actually hold.**
> `AuthService.loadUserPermissions` returns `['*']` for any user whose legacy `role`
> column is `'superadmin'`, and the PermissionsGuard treats `'*'` as "has every
> permission". So a superadmin USER passes `@Permissions(DISCUSSIONS_VERIFY)` regardless
> of the fact that the superadmin ROLE was never granted it. The intent of §3.2 is
> defeated by the wildcard. This does not affect Phase A/B (neither uses verify), but
> **BE-4 must not rely on the permission alone** to keep superadmins out of verification —
> the verify path needs an explicit `role.slug === 'scholar'` check, or `loadUserPermissions`
> needs to stop short-circuiting to `'*'`. Raised for RMC + the auth owner.

**Super Admin deliberately does not get `discussions:verify`.** Being able to run the
platform is not the same as being qualified to rule on religious practice. If RMC
disagrees this is a one-line migration — but it should be a conscious decision, not an
accident of "superadmin gets everything".

**Answered (16 July):** `Moderator` is a **new role** holding `discussions:moderate` only.
`Operator` is left alone — moderating religious discussion is not an operations duty, and
coupling them would hand it to whoever happens to hold Operator next.

---

## 4. Language — the part that differs from everything else in this app

Every other Dawah surface stores tri-lingual columns (`title_en/_rw/_ar`) because an
admin types all three. **User-generated content has exactly one language: the one the
member wrote in.** Do not add `_en/_rw/_ar` columns to questions. Nobody will fill them.

So:

- `language` on the question, set from the member's current locale at post time, editable
  by the author.
- The listing filters by language, defaulting to the current locale **but showing others**
  behind a visible "also showing other languages" control. Kinyarwanda speakers are the
  largest group; if the default silently hides Arabic and English questions, the section
  looks empty on day one and dies.
- **The chrome is translated; the content is not.** A question written in Kinyarwanda
  stays in Kinyarwanda on the Arabic page. That is correct and must not be papered over
  with machine translation.
- **RTL:** an Arabic question rendered on the English page needs `dir="rtl"` on that
  post's body specifically, driven by its `language` column — not by the page locale. Get
  this wrong and Arabic punctuation lands on the wrong side.
- New UI strings go in the `dawah.discussions.*` namespace. **Kinyarwanda sits at 4% for
  the whole `dawah` namespace** — 6 of 89 keys, translated 16 July; the other 325 are
  queued in `docs/i18n/dawah-rw.csv` (see `docs/i18n/README.md`). This feature adds ~60
  more keys to that debt. Budget for it or the section ships English-only to its largest
  audience — on the one Dawah surface whose entire value is people talking.

---

## 5. Security — where this feature is genuinely dangerous

This is the first surface in the entire app where **an untrusted stranger's text is
stored and shown to other users.** Everything else is admin-authored. The existing
defences were built for that weaker threat model and do not simply transfer.

1. **Markdown, not HTML. Store the source, render on the server.**
   Do **not** reuse `RichTextEditor` (TipTap) here. It emits HTML, and accepting HTML from
   the public means the entire defence is `sanitizeRichHtml` never having a bug. Store
   markdown; render server-side; sanitise the *output*. Two independent gates instead of
   one, and the stored bytes are inert.

2. **Sanitise on the way out, not just on the way in.**
   Input-time sanitisation bakes today's DOMPurify version into the database. A bypass
   found next year is already stored. Render-time sanitisation is fixed by upgrading.

3. **No images, no embeds in v1.** No `<img>`, no iframes, no data: URIs. Links render as
   text-with-href, `rel="nofollow ugc noopener"`, `target="_blank"`. An image URL in a
   post is an IP-address logger pointed at every reader of a religious question.

4. **The XSS lesson from this codebase is not hypothetical.** Seeded `<img src=x
   onerror=...>` payloads survived in `dawah_courses.description` and rendered on the
   public course page. That was *admin* content. This feature invites the payload.

5. **Anonymity is a UI state, never a storage state.** `author_id` is always written. If
   it were nullable, "anonymous" would mean unbannable. Strip the name in `toPublic()` —
   one projection, like `dawah-book.service.ts` does for `fileKey` — never at the query.

6. **Enumeration.** A hidden or deleted question must 404, not 403 — otherwise the
   moderation state itself leaks ("your question was removed" is a message, not a status
   code).

7. **`toPublic()` is the single chokepoint.** Every discussion route funnels through it,
   the way every book route funnels through `DawahBookService.toPublic`. It strips
   `author_id` when anonymous, and `reporter_id` always.

---

## 6. Abuse & rate limiting

The global throttler is **100 req/60s** — that is a DoS guard, not a spam guard. It would
happily permit 100 questions a minute.

| Action | Limit | Why |
|---|---|---|
| Create question | 5 / hour / user | A human asking a 6th question in an hour is not asking questions |
| Create answer | 20 / hour / user | Answering is legitimately faster |
| Vote | 60 / hour / user | |
| Report | 10 / hour / user | Reporting is a weapon too |

Per-user, keyed on `user_id` (not IP — posting requires auth, and IP keying punishes
shared connections, which in Kigali is many people).

Also: minimum body length, a rejected-if-identical-to-last-post check, and **new accounts
cannot post for 24h** (blunt but effective against drive-by spam).

### 6.1 Tunables (Rev. 2)

Config, not literals scattered through services — these will be tuned against real
traffic, and hunting a magic `3` across the codebase at that point is misery.

| Name | Default | Notes |
|---|---|---|
| `REPORT_AUTOHIDE_THRESHOLD` | 3 | Eligible reports that auto-hide a post |
| `REPORT_MIN_ACCOUNT_AGE` | 7 days | Below this a report is filed but does **not** count toward the threshold |
| `ANSWER_EDIT_WINDOW` | 15 min | After which an answer is frozen |
| `NEW_ACCOUNT_POST_DELAY` | 24 h | |

### 6.2 Auto-hide abuse, honestly

The threshold hands members a lever, and levers get pulled. A question about a
contentious topic is exactly the one three people want gone.

What we do: only aged accounts count (above); every auto-hide is logged with its
reporters; restoring resets the counter and dismisses those reports so the same three
cannot re-trip it; a question with a verified answer is exempt entirely.

What we do **not** pretend: none of that stops three determined, aged accounts from
hiding something for as long as it takes a moderator to look. That is the accepted cost
of not making everyone wait for pre-moderation. **The mitigation is the moderation log
being read**, not the mechanism — if nobody reviews auto-hides, this becomes a heckler's
veto with an audit trail.

---

## 7. Backend shape

Module `apps/backend/src/dawah/discussions/` — inside the existing `dawah` module, not a
new top-level one; it shares categories and the Dawah surface.

**Public** (`@Public()`, read-only):
```
GET  /dawah/discussions                 list · filter category|language|status · sort active|new|unanswered
GET  /dawah/discussions/:slug           question + answers (verified answer first)
```

**Member** (authenticated):
```
POST   /dawah/discussions               ask            (throttled 5/h)
POST   /dawah/discussions/:slug/answers answer         (throttled 20/h)
PATCH  /dawah/discussions/answers/:id   edit own, 15-min window
POST   /dawah/discussions/answers/:id/vote
POST   /dawah/discussions/report
```

**Scholar** (`@Permissions(DISCUSSIONS_VERIFY)`):
```
GET    /admin/dawah/discussions/pending          the review queue — answers held by
                                                 category policy, oldest first
POST   /dawah/discussions/answers/:id/release    → published. "Not harmful." No badge.
POST   /dawah/discussions/answers/:id/verify     → published + badge + pinned.
                                                 "RMC says this is correct."
                                                 Unique per question, enforced by index.
DELETE /dawah/discussions/answers/:id/verify     un-verify (stays published)
```

Release and verify are **separate endpoints on purpose** (§2.2). One button that does
both would attach RMC's endorsement to every answer a scholar merely cleared from a
queue — the exact failure this design exists to prevent.

**Moderator** (`@Permissions(DISCUSSIONS_MODERATE)`):
```
GET    /admin/dawah/discussions/reports          the queue (mirror contact-messages)
                                                 filter: auto_hidden first — a post the
                                                 crowd already pulled down is the urgent one
POST   /admin/dawah/discussions/:id/hide|restore|lock
PATCH  /admin/dawah/categories/:id               answer_policy (§2.3)
```

Every moderator action writes `dawah_moderation_log`. No exceptions — and auto-hide
writes one too, with `moderator_id = NULL`, so "why did this vanish?" always has an
answer.

**The pending queue needs an age alarm.** An answer sitting in `pending_review` for a
week is invisible to everyone except its author, who concludes RMC ignored them. Surface
the oldest pending age on the admin dashboard, and if it is the thing that always goes
red, that is data telling RMC the scholar rota is under-staffed — not a reason to
weaken the gate.

---

## 8. Frontend shape

```
/dawah/discussions              list — filters, sort tabs, "Ask" CTA
/dawah/discussions/[slug]       thread — verified answer pinned, community below
/admin/dawah/discussions        report queue (ProtectedRoute[DISCUSSIONS_MODERATE])
```

- Reuse `PageHero` with `paddingClassName="pt-32 pb-10"` — **matched to the Courses and
  Library heroes**; a third height reads as a bug (see the comment in `LibraryPageClient`).
- Cards at `rounded-lg`, `border-gray-200`, no shadow — the radius language the Dawah
  surface now uses throughout.
- The navbar Dawah dropdown gains a fourth item. It is at 3 now; at 4 it stays one column
  (Services switches to two at 8 — see `columns` on `NavLinkItem`).
- **Empty state is the whole launch risk.** A Q&A with no questions looks abandoned and
  never recovers. Seed 15–20 real questions with verified answers *before* launch (§9).

---

## 9. Phasing, and the launch gate

**Phase A — read-only skeleton (no UGC).** Tables, `answer_policy` column + seed, public
list + thread, i18n chrome. Ships safely because nothing accepts input yet.

**Phase B — asking.** Questions only: ask, markdown pipeline, rate limits, `toPublic()`
projection, reports + auto-hide, the moderation queue and log.
*Questions go live on submit, so the report queue must exist in the same phase that
allows a question.* Answering is not enabled yet, which makes B genuinely shippable: the
worst case is a bad question, visible for minutes, hideable by three members.

**Phase C — answering.** Answers, the `pending_review` gate, the scholar review queue,
release/verify, votes, the pending-age alarm.

**Phase D — polish.** Notification emails, search, the admin category-policy editor.

Rev. 1 ordered this A → posting → trust → moderation and warned "B must not ship before
D". Rev. 2 makes that structural instead of a warning: **moderation is inside B, and the
scholar gate is inside C — the phase that introduces the risk also introduces its
control.** A phase boundary is a place work actually stops; a warning is not.

**The launch gate — all five, or do not launch:**
1. A named moderator rota with a response-time commitment.
2. At least one Scholar account, live, with an agreed turnaround — **and a fallback for
   when they are away.** Under Rev. 2 a silent scholar means answers in `fiqh`,
   `aqeedah`, `family-life` and `new-muslims` never appear at all. This gate is now
   load-bearing in a way it was not in Rev. 1.
3. 15–20 seeded real questions, several with verified answers.
4. A written takedown policy the moderators actually follow.
5. **Someone accountable for reading the moderation log**, specifically auto-hides. The
   log is the only defence against the threshold becoming a heckler's veto (§6.2), and an
   unread log defends nothing.

None of these are code. All of them are the difference between a dawah asset and a
liability with RMC's name on it.

---

## 10. Open questions for RMC

1. **Who are the scholars?** Named individuals, or a shared "RMC Fatwa Committee"
   account? A shared account is easier to staff and worse for accountability. **Rev. 2
   raises the stakes:** scholars are now a publication gate, not just a badge — if they
   go quiet, four categories accept no answers at all.
2. ~~**Confirm the `answer_policy` seed**~~ — **ANSWERED 16 July:** as proposed.
   `scholar_review` for `fiqh`, `aqeedah`, `family-life`, `new-muslims`; `open` for
   `arabic-language`, `seerah`, `hadith`, `quran-studies`. Revisit `seerah`/`hadith`/
   `quran-studies` on evidence — history and study slide into rulings easily.
3. **Is `REPORT_AUTOHIDE_THRESHOLD` = 3 right for this community?** With a few hundred
   members, 3 is a small conspiracy. 5 is safer against abuse and slower to protect.
4. ~~**Moderator role**~~ — **ANSWERED 16 July:** a **new `Moderator` role** holding
   `discussions:moderate` only, so RMC can appoint trusted community members without
   granting admin access.
5. **Should Super Admin be able to verify?** Recommended no (§3.2) — confirm.
6. **Kinyarwanda:** ~60 new keys land on a namespace that is 4% translated. Who translates,
   and does the section wait for it?
7. **Retention:** does a hidden question stay in the DB forever? What does a member's
   "delete my account" do to their questions — orphan or purge?
8. **Notifications:** email on answer / on verification / **on release from review**?
   Reuse the subscriber shell, and respect existing unsubscribe state.
   > **BUILT (17 July, Phase D) with a KNOWN GAP.** Notifications now fire on
   > answer-becomes-visible and on verification (fire-and-forget, so a dead SMTP never
   > breaks the action). But recipients are USERS (question/answer authors), and there is
   > no per-user "don't email me about discussions" opt-out — the subscribers table's
   > unsubscribe is a separate identity system. **Before enabling in production, a member
   > opt-out must exist**, or wire the two identity systems together. Until then the
   > notifications are safe in dev (SMTP logs to console) but should stay off in prod.
9. **Does an author see their own pending answer?** Recommended yes, marked "awaiting
   review" — the alternative is their answer vanishing with no explanation.

---

## 11. Estimate

| Phase | Backend | Frontend | Notes |
|---|---|---|---|
| A skeleton | 2–3 d | 2–3 d | tables, `answer_policy`, public read, i18n |
| B asking + moderation | 3–4 d | 3 d | markdown pipeline is the long pole; reports, auto-hide, queue, log |
| C answering + scholar gate | 2–3 d | 2 d | role, `pending_review`, review queue, release/verify, votes |
| D polish | 1–2 d | 1–2 d | emails, search, category-policy editor |
| **Total** | | | **~3.5 weeks** of one full-stack engineer, plus translation |

Excludes the launch-gate items in §9, which are RMC's, not engineering's, and which will
take longer to arrange than the code takes to write.
