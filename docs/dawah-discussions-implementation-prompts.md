# Dawah Community Discussions — Implementation Prompts (team task assignments)

Companion to **`docs/dawah-discussions-implementation-plan.md` (Rev. 2)**. Read the plan
first — these prompts do not restate it, they assign it. Section refs like §2.3 point there.

---

## ✅ Decisions locked (2026-07-16, confirmed by RMC) — read before any prompt

| # | Decision |
|---|---|
| 1 | **Anyone answers; scholars verify.** New `Scholar` role marks one answer "Verified by RMC". |
| 2 | **Moderation is asymmetric.** Questions post-moderate (live on submit). Answers in `scholar_review` categories are held `pending_review`. Anything reported ×3 auto-hides. |
| 3 | **Public reads, members post.** Anonymous visitors and crawlers read; posting requires sign-in. |
| 4 | **Anonymity is opt-in per question.** Name hidden publicly; `author_id` **always** stored. |

Still open (§10) — **chase, do not guess**: who the scholars are; the `answer_policy` seed;
whether threshold 3 is right; moderator role vs `Operator`; Kinyarwanda ownership.

---

## Team & ownership

| Role | Owns | Prompts |
|---|---|---|
| **Senior Database Engineer** | Schema, constraints-as-truth, indexes, roles/permissions migrations, seed data | `DB-1`, `DB-2`, `DB-3` |
| **Senior Backend Engineer** | Module, projections, markdown pipeline, rate limits, moderation + scholar gate | `BE-1`…`BE-4` |
| **Senior Frontend Engineer** | API client, public list/thread, post forms, admin + scholar queues, i18n | `FE-1`…`FE-4` |

---

## Golden rules (every prompt inherits these — violating one is a revert, not a review comment)

1. **Markdown in, sanitised HTML out. Never store HTML.** Store the markdown source;
   render server-side; sanitise the **output**. Input-time sanitisation bakes today's
   DOMPurify into the database — next year's bypass is already stored. Two gates, not one.
2. **Do NOT reuse `components/ui/RichTextEditor.tsx` (TipTap) for public posts.** It emits
   HTML. It is for admins. This is the first surface in the app where a stranger's text is
   stored and shown to others; the whole threat model is different.
3. **No images, no embeds, no `data:` URIs in v1.** Links render `rel="nofollow ugc noopener"`.
   An image URL in a post is an IP logger pointed at everyone reading a religious question.
4. **`author_id` is always written.** Anonymity is stripped in `toPublic()` — one
   projection, like `DawahBookService.toPublic` does for `file_key`. Never at the query.
   A nullable author means an unbannable poster.
5. **Integrity lives in the database.** One verified answer per question = partial unique
   index. One vote per person = unique constraint. A TypeScript check loses that race.
6. **Answer status is computed server-side** from the category's `answer_policy`. It must
   never come from the DTO — a client-settable status is a client-settable publication gate.
7. **Hidden/deleted/pending → 404, not 403.** A status code must not leak a moderation
   decision.
8. **Verify against the running stack.** `tsc` passing is not evidence. Drive the real
   endpoint with curl and the real page in a browser. This repo has burned people who
   assumed: a 100KB body silently 500'd, seeded XSS rendered on a live page, `line-clamp-2`
   sat inert behind a `display:block`. Assume you are next.
9. **i18n:** new keys under `dawah.discussions.*`, all three locales, `rw` as an English
   placeholder — then **regenerate `docs/i18n/dawah-rw.csv`** (see its README). Never
   machine-translate Kinyarwanda. `dawah` is 4% translated; you are adding to that debt
   knowingly.
10. **RTL follows the POST's `language` column, not the page locale.** An Arabic answer on
    the English page needs `dir="rtl"` on that post. Logical props everywhere
    (`ps-/pe-/ms-/me-/start-/end-`).
11. **House style, already settled:** `rounded-lg` (8px), `border-gray-200`, **no
    box-shadow**, `PageHero` with `paddingClassName="pt-32 pb-10"` to match the Courses and
    Library heroes. A third hero height reads as a bug.
12. **Throttle on `user_id`, never IP.** Posting requires auth, and IP keying punishes
    shared connections — in Kigali that is many people on one address.
13. **Never trigger a real email broadcast to test.** See the subscribers module's warning.
14. **`npm install` with the dev server running can leave a stale webpack cache** and 500
    every page. If it happens: `rm -rf apps/frontend/.next/cache`.

---

## Sequencing / dependency graph

```
Wave 1 — Phase A (parallel)
  ├─ PROMPT-0  Shared contract        → everyone codes to these shapes
  ├─ DB-1      Tables + constraints   → unblocks all BE
  └─ DB-2      Roles/permissions      → unblocks BE-3, BE-4, FE-4

Wave 2 — Phase A/B
  ├─ BE-1      Public read + toPublic (needs DB-1)
  ├─ FE-1      API client             (needs PROMPT-0; mock data OK)
  └─ FE-2      Public list + thread   (needs FE-1)

Wave 3 — Phase B  ⚠ BE-3 ships WITH BE-2, never after
  ├─ BE-2      Ask + markdown + limits
  ├─ BE-3      Reports + auto-hide + moderation log
  ├─ FE-3      Ask form
  └─ FE-4a     Moderation queue

Wave 4 — Phase C
  ├─ DB-3      Search index + counter audit
  ├─ BE-4      Answer + pending_review + release/verify
  ├─ FE-3b     Answer form + pending state
  └─ FE-4b     Scholar review queue
```

**The one ordering rule that is not negotiable:** the phase that introduces a risk ships
its control. Questions go live on submit → **BE-3 lands in the same PR train as BE-2**.
Answers can be rulings → the scholar gate lands with answering, not after.

---

## PROMPT-0 — Shared interface contract (all three engineers, agree before coding)

**Objective:** Freeze the wire shapes so BE and FE build in parallel without a merge fight.

**Do this:** Agree and write down, in one short doc committed before code:
1. The `DiscussionQuestion` / `DiscussionAnswer` public projections — exactly what
   `toPublic()` emits. Include `author: { name } | null` (null ⇒ anonymous), never
   `author_id`. Include `language`, `status`, `answerCount`, `verifiedAnswerId`.
2. The status enums as strings, shared verbatim between `permissions.enum.ts`-style
   backend constants and the frontend `dawahApi.ts` types.
3. Error shapes: 404 for hidden/missing, 401 unauthenticated, 403 lacks-permission, 429
   throttled (FE must render 429 as "you're posting too quickly", not "something broke").
4. Pagination + sort params: `sort=active|new|unanswered`, `category`, `language`, `page`.

**Deliverable:** `docs/dawah-discussions-contract.md`. **Gotcha:** if FE needs a field the
projection does not expose, that is a contract change with a security review — not a
quick `toPublic()` addition.

---

## DB-1 — Senior Database Engineer (schema + constraints)

**Objective:** Ship the five tables and the `answer_policy` column, with every integrity
rule expressed as a **constraint**, not a convention.

**Depends on:** — · **Unblocks:** every BE prompt.

**Do this:**
1. One additive migration, numbering continued from the existing sequence (look at
   `ls apps/backend/src/database/migrations | sort -V | tail`; follow the
   `<timestamp>-0NN-name.ts` form). Tables per plan §2.1–2.6: `dawah_questions`,
   `dawah_answers`, `dawah_votes`, `dawah_reports`, `dawah_moderation_log`.
2. `ALTER TABLE dawah_categories ADD COLUMN answer_policy varchar(20) NOT NULL DEFAULT
   'scholar_review'` + CHECK in `('scholar_review','open')`. **The default is the strict
   value** — forgetting must fail safe (§2.3).
3. **Constraints that carry the design:**
   - `CREATE UNIQUE INDEX ... ON dawah_answers (question_id) WHERE is_verified` — one
     verified answer per question, race-proof.
   - `CHECK (NOT is_verified OR status = 'published')` — "verified but hidden" is incoherent.
   - `UNIQUE (answer_id, user_id)` on votes; `CHECK (value IN (-1,1))`.
   - `UNIQUE (target_type, target_id, reporter_id)` on reports.
   - Status CHECKs on both post tables (answers include `pending_review`; questions do
     **not** — §2.1).
4. Indexes: `(status, last_activity_at DESC)`, `(category_id)`, `(author_id)` on questions;
   `(question_id, status)` on answers; `(status, created_at)` on reports for the queue.
5. Seed `answer_policy` per §2.3 — and **flag in your sign-off that RMC has not yet
   confirmed it** (§10-Q2). Seed the values as proposed; do not invent new categories.
6. Write `down()` and actually run it. A migration you cannot reverse is a migration you
   cannot deploy on a Friday.

**Deliverable:** migration + a `DB sign-off` note: the constraint table, what each one
prevents, and the confirmed `answer_policy` seed. **Gotchas:** `dawah_categories` is shared
with courses and books — your column must be nullable-safe for them (it is: they never read
it). Do not cascade-delete answers when a *user* is deleted; §10-Q7 is unanswered, so leave
the FK restrictive and raise it.

---

## DB-2 — Senior Database Engineer (roles & permissions)

**Objective:** Create the `Scholar` role and the two new permissions, granted correctly.

**Depends on:** — · **Unblocks:** BE-3, BE-4, FE-4.

**Do this:**
1. Add to `apps/backend/src/common/types/permissions.enum.ts`:
   `DISCUSSIONS_MODERATE = 'discussions:moderate'`, `DISCUSSIONS_VERIFY = 'discussions:verify'`.
   **Do not reuse `dawah:manage`** — uploading a PDF and passing religious judgement are
   different authorities held by different people (§3.1).
2. Migration granting them, following `030-subscribers-permissions.ts` **exactly** (the
   `jsonb_agg(DISTINCT elem)` pattern — copy it, do not improvise).
3. Create the `Scholar` role holding `discussions:verify` **only**. A scholar has no
   business in the members table.
4. **Super Admin does NOT get `discussions:verify`** (§3.2). This will look like a bug to
   the next engineer — put the reason in the migration comment: running the platform is not
   being qualified to rule on religious practice.
5. Raise §10-Q4 (moderator: new role or `Operator`?) before granting
   `discussions:moderate` to anyone beyond Admin/Super Admin.

**Deliverable:** enum entries + migration + a one-line note per role explaining the grant.
**Gotcha:** verify the `down()` removes only what you added — the jsonb pattern will
happily strip a permission another migration also granted.

---

## DB-3 — Senior Database Engineer (search + counter audit)

**Objective:** Make search work and prove the denormalised counters cannot drift.

**Depends on:** DB-1, BE-2/BE-3 landed. · **Unblocks:** list performance.

**Do this:**
1. GIN index on `to_tsvector('simple', title || ' ' || body)`. **Use `'simple'`, not
   `'english'`** — the corpus is Kinyarwanda, Arabic and English mixed in one column, and
   an English stemmer mangles the other two. Document the trade (no stemming) rather than
   pretending it is solved.
2. Audit every counter write (`answer_count`, `vote_score`, `report_count`,
   `last_activity_at`) and confirm it is in the **same transaction** as the row it counts.
   `view_count` is the deliberate exception: fire-and-forget, like
   `dawah-book.service.ts:bumpCounter` — a view counter must never break a read.
3. Write a reconciliation query per counter (`SELECT` that finds drift) and hand it to ops.
4. Note for whoever tests: **React StrictMode double-invokes effects in dev**, so a
   client-triggered view counter reads double locally and correct in production. Do not
   "fix" that. This exact confusion has already cost this repo a day.

**Deliverable:** index migration + drift queries + the counter-transaction audit.

---

## BE-1 — Senior Backend Engineer (public read + the projection chokepoint)

**Objective:** Public list + thread endpoints, and the single `toPublic()` every route
funnels through.

**Depends on:** DB-1, PROMPT-0. · **Unblocks:** FE-1, FE-2.

**Do this:**
1. Module at `apps/backend/src/dawah/discussions/` — inside the existing `dawah` module,
   not a new top-level one. It shares categories and the surface.
2. `GET /dawah/discussions` (filters: category, language, `sort=active|new|unanswered`) and
   `GET /dawah/discussions/:slug`. Both `@Public()`.
3. **`toPublic()` is the only way a row reaches a response.** It strips `author_id` when
   `is_anonymous`, strips `reporter_id` always, and never emits internal moderation fields.
   Model it on `DawahBookService.toPublic` and its comment — that method is the single most
   important line in that file for the same reason.
4. Thread ordering: verified answer first, then `vote_score DESC, created_at ASC`.
   `pending_review` answers are visible **only** to their own author (§10-Q9 — recommended
   yes; confirm).
5. Non-published questions → `NotFoundException`, never 403 (§7 of the golden rules).
6. `view_count` bump: fire-and-forget, swallow errors, copy `bumpCounter`.

**Deliverable:** module + endpoints + projection, with curl output for: anonymous list,
anonymous thread, a hidden question (404), an anonymous question (no name leaked).
**Gotcha:** the anonymity test must assert on the **raw JSON**, not the rendered page. A
name absent from the UI but present in the payload is a leak.

---

## BE-2 — Senior Backend Engineer (asking + the markdown pipeline)

**Objective:** Members can ask. Nothing stored is executable.

**Depends on:** BE-1. · **Ships with:** BE-3 (non-negotiable — a live question needs a
report queue in the same train).

**Do this:**
1. `POST /dawah/discussions` — authenticated. DTO: `title`, `body` (markdown), `categoryId`,
   `language`, `isAnonymous`. **No `status` field. Ever.**
2. Store markdown verbatim. Render + sanitise **on read**, not on write (golden rule 1).
   Strip images/embeds at render; allow links with `nofollow ugc noopener`.
3. Slug from title + short random suffix; uniqueness enforced by the DB, retried on
   conflict — not by a pre-check `SELECT` (that races).
4. Rate limits per §6: 5 questions/hour/user, keyed on `user_id`. The global throttler is
   100/60s — a DoS guard, not a spam guard. Add `NEW_ACCOUNT_POST_DELAY` (24h) and the
   identical-to-last-post rejection.
5. Put the tunables (§6.1) in config, not literals.
6. `last_activity_at = now()` on create; same transaction.

**Deliverable:** endpoint + a **security note** showing a stored XSS attempt
(`<img src=x onerror=alert(1)>`, `[click](javascript:alert(1))`) rendering inert on the
public page — with the actual response body pasted. **Gotchas:** Express's JSON body limit
is raised to 2mb in `main.ts` — a long question is fine, but confirm rather than assume; an
over-limit body 500s rather than 413ing, which has already fooled someone here. Markdown
link syntax can smuggle `javascript:` — test it explicitly.

---

## BE-3 — Senior Backend Engineer (reports, auto-hide, moderation)

**Objective:** The community can pull bad content down in minutes without waking a moderator.

**Depends on:** DB-1, DB-2. · **Ships with:** BE-2.

**Do this:**
1. `POST /dawah/discussions/report` — authenticated, 10/hour/user.
2. **Auto-hide, in one transaction with the report insert** (§2.5): increment
   `report_count`; if it reaches `REPORT_AUTOHIDE_THRESHOLD` (3) **and** status is
   `published`, set `auto_hidden` and write a `dawah_moderation_log` row with
   `moderator_id = NULL, action = 'auto_hide'`.
3. **Only reporters with accounts older than `REPORT_MIN_ACCOUNT_AGE` (7d) count toward the
   threshold.** Others still file a report. Without this, three throwaways silence anything.
4. `auto_hidden` is a **distinct status**, never folded into `hidden` — a moderator must see
   at a glance whether a human or a threshold made the call. That distinction is the only
   way abuse is ever noticed.
5. **A question with a verified answer is exempt from auto-hide.** Once RMC has endorsed an
   answer, three members must not be able to pull the page down.
6. Moderator endpoints (`@Permissions(DISCUSSIONS_MODERATE)`): report queue
   (`auto_hidden` first — the crowd already flagged it), hide/restore/lock, and
   `PATCH` category `answer_policy`. Restore resets `report_count` to 0 and dismisses the
   reports, so the same three cannot instantly re-trip it.
7. **Every** moderator action writes the log. No exceptions, including auto-hide.

**Deliverable:** endpoints + a test proving: 3 aged reports auto-hide; 3 fresh accounts do
not; restore resets; a verified-answer question is exempt; every action logged.
**Gotcha:** the increment-and-check must be one atomic statement or two concurrent reports
both read `2` and neither trips the hide.

---

## BE-4 — Senior Backend Engineer (answering + the scholar gate)

**Objective:** Answers exist, and nothing that reads as a ruling is public unreviewed.

**Depends on:** BE-2, DB-2. · **Unblocks:** FE-3b, FE-4b.

**Do this:**
1. `POST /dawah/discussions/:slug/answers` — 20/hour/user. **Initial status is computed**:
   read the question's category `answer_policy`; `scholar_review` → `pending_review`,
   `open` → `published` (§2.2). Never from the DTO.
2. `PATCH` own answer within `ANSWER_EDIT_WINDOW` (15 min), then frozen.
3. **Release and verify are two endpoints, not one** (§2.2, §7):
   - `POST .../release` → `published`, `released_by_id` set. Means *not harmful*. **No badge.**
   - `POST .../verify` → published + `is_verified` + `verified_by_id` + pinned. Means
     *RMC says this is correct.* Unique per question (the DB enforces it — handle the
     conflict as a clean 409, not a 500).
   - `DELETE .../verify` → un-verify, stays published.
   Both `@Permissions(DISCUSSIONS_VERIFY)`. **If you ship one "approve" button that does
   both, you have shipped the bug this design exists to prevent** — every answer a scholar
   merely triaged would silently carry RMC's endorsement.
4. `GET /admin/dawah/discussions/pending` — the scholar queue, oldest first, with an age
   field. Surface the oldest pending age for the dashboard alarm.
5. Votes: `POST .../vote`, 60/hour. Unique constraint is the rule; re-voting updates.
6. Maintain `answer_count`, `verified_answer_id`, `last_activity_at` in the same transaction.

**Deliverable:** endpoints + tests proving: an answer in `fiqh` is `pending_review` and
invisible to others but visible to its author; the same answer in `arabic-language` is live;
release ≠ verify; a second verify on the same question 409s.
**Gotcha:** `pending_review` answers must not count toward `answer_count` — a question
showing "3 answers" with none visible is a bug report.

---

## FE-1 — Senior Frontend Engineer (API client + types)

**Objective:** Typed client in `src/lib/dawahApi.ts`, matching PROMPT-0 exactly.

**Depends on:** PROMPT-0 (build before BE lands; mock the shapes).

**Do this:** Extend the existing `dawahApi` object — same conventions as `admin.books`.
Types mirror the projection: `author: { name } | null`, never an id. Handle 429 as a typed
error the UI can render as "you're posting too quickly". **Deliverable:** client + types.
**Gotcha:** do not add fields the projection does not send "for later" — a type that lies
is worse than a missing field.

---

## FE-2 — Senior Frontend Engineer (public list + thread)

**Objective:** The read experience. Public, indexed, tri-lingual chrome.

**Depends on:** FE-1. · **Unblocks:** everything user-facing.

**Do this:**
1. `/dawah/discussions` (list) and `/dawah/discussions/[slug]` (thread).
2. `PageHero` with `paddingClassName="pt-32 pb-10"` and `minHeightClassName="min-h-[20vh]"`
   — **matched to Courses and Library**. The `pt-32` floor exists because the navbar is
   transparent and measures 114px; less tucks the back link under it.
3. Cards: `rounded-lg`, `border-gray-200`, **no shadow**. The verified answer pins first
   with a gold badge; community answers below, visually subordinate.
4. **`dir` per post, from its `language` column** — not the page locale (golden rule 10).
5. Language filter defaults to the current locale but **shows other languages behind a
   visible control**. If Kinyarwanda speakers silently never see the Arabic questions, the
   section looks empty on day one and dies.
6. Add the fourth item to the navbar Dawah dropdown. It stays **one column** (the `columns`
   prop on `NavLinkItem` switches to 2 at 8 items — Services uses that; Dawah does not).
7. Empty state: honest. "No questions yet" — never "be the first!", which reads as
   abandoned.

**Deliverable:** both pages + i18n keys + screenshots at 1500px and 390px, EN and AR.
**Gotcha:** `line-clamp-N` needs `display:-webkit-box`; a sibling `block` class silently
kills it — this exact bug shipped in the navbar dropdown last week and rendered 3 lines
where 2 were specified.

---

## FE-3 — Senior Frontend Engineer (ask + answer forms)

**Objective:** Members can post. The editor cannot emit HTML.

**Depends on:** FE-1, BE-2 (ask) / BE-4 (answer).

**Do this:**
1. **Plain markdown textarea with a preview tab. NOT `RichTextEditor`** (golden rule 2). A
   small formatting hint row (bold, link, list) that inserts markdown characters is fine.
2. Preview renders through the **same server-side pipeline** as the real page — if you
   render markdown client-side for preview, the preview and the published post will
   eventually disagree, and the day they do is the day someone finds the gap.
3. Ask form: title, body, category, language (default: current locale), **anonymous
   checkbox with honest copy** — "Your name will not be shown publicly. Moderators can
   still see it." Do not imply anonymity from RMC.
4. Answer form on the thread. In a `scholar_review` category, show **before** submitting
   that the answer will be reviewed — a surprise queue reads as censorship.
5. After posting into a review category, show the author their own answer marked "awaiting
   review", with a note that only they can see it.
6. Render 429 as "you're posting too quickly, try again in a few minutes".

**Deliverable:** both forms + the pending state. **Gotcha:** the anonymous checkbox is per
*question*, not per account, and it must default to **off** — an accidental anonymous post
cannot be un-anonymised by the author.

---

## FE-4 — Senior Frontend Engineer (moderation + scholar queues)

**Objective:** The two admin surfaces the whole model depends on.

**Depends on:** BE-3 (a), BE-4 (b), DB-2. **FE-4a ships with FE-3's ask form.**

**Do this:**
1. **(a) `/admin/dawah/discussions`** — report queue. `ProtectedRoute[DISCUSSIONS_MODERATE]`,
   every write gated on the same. Mirror `/admin/content` + the `contact-messages` inbox —
   do not invent a layout. **`auto_hidden` items first and visually distinct** from
   human-hidden: a moderator must see at a glance which were pulled by the crowd.
2. Show the reporters and the reason on each row. The moderation log is only a defence if
   someone reads it (§9 gate 5) — make reading it the easy path, not a DB query.
3. **(b) `/admin/dawah/discussions/pending`** — scholar queue,
   `ProtectedRoute[DISCUSSIONS_VERIFY]`, oldest first, **age prominently displayed**. Two
   distinct buttons: **Release** (neutral, no badge) and **Verify** (gold, "RMC says this
   is correct"). Their difference must be obvious in the UI, not just the API — if they
   look like one action with two labels, scholars will treat them as one.
4. Category `answer_policy` editor on the admin categories page, gated on
   `DISCUSSIONS_MODERATE`. Copy must say plainly that changing it is **not retroactive**.

**Deliverable:** both queues + a walkthrough as a moderator, as a scholar, and as a
`Member` (who must see 403/redirect, not a broken page). **Gotcha:** verify with a
view-only account too. "Works as superadmin" is not a permission test.

---

## Definition of done (all prompts)

- [ ] `npx tsc --noEmit` and `npx eslint` clean in both apps.
- [ ] Every claim demonstrated against the **running stack** — curl output or a browser
      screenshot pasted, not "should work".
- [ ] Permission checks proven with a **non-admin** account.
- [ ] Stored-XSS attempt pasted, rendering inert.
- [ ] Anonymity verified in the **raw JSON payload**, not the rendered page.
- [ ] i18n keys in all three locales; `docs/i18n/dawah-rw.csv` regenerated; no hardcoded
      English in user-facing UI.
- [ ] AR checked at 390px and 1500px; `dir` driven per post.
- [ ] Nothing merged that ships a risk without its control (see the sequencing rule).
