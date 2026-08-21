# Dawah Q&A — Interface Contract

**Revised 27 July 2026 (migration 049).** Supersedes the Phase-A contract frozen on
16 July 2026, which described a **community forum**. RMC now authors the answers, and that
change invalidated most of the shapes it froze — this is a replacement, not an amendment.

Changing anything here is a contract change with a security review — not a quick
`toPublic()` addition.

---

## 0. What changed, and why the old contract could not simply be edited

The frozen contract encoded one asymmetry as its organising idea: *a question goes live on
submit; an answer is held for review, because a bad answer is a false ruling someone acts
on.* Members asked, members answered, scholars blessed the best answer, and the crowd
reported the bad ones.

RMC now writes every answer. That single fact **inverts** the asymmetry and dissolves the
rest of the model:

| Old concept | Why it is gone |
|---|---|
| Member-authored answers | RMC authors them. There is no submission path for an answer. |
| `AnswerStatus`, scholar review queue | Nothing to hold: the author *is* the authority. |
| Release vs verify | Both meant "a scholar judged a member's answer". |
| `voteScore`, `DawahVote` | Nothing to rank — there is one answer per question. |
| Reports, auto-hide, `reportCount` | An appeal to the moderators against content the moderators wrote. |
| Anonymity (`author: null`) | The published entry names **nobody who asked**. See §2.1. |
| `sort=active` / `sort=unanswered` | Every entry is published complete; there is no activity, and nothing is ever unanswered. |
| `answer_policy` on a category | It decided who reviewed member answers. |

Questions are now what waits. A member submits one; it is invisible until an admin answers
it and publishes.

---

## 1. Enums — one spelling, both sides

Backend: string unions on the entity + DTO. Frontend: the same unions in
`src/lib/dawahApi.ts`. **Copy these verbatim; do not paraphrase.**

```ts
type QuestionStatus = 'pending' | 'published' | 'rejected' | 'hidden' | 'deleted';
type PostLanguage   = 'en' | 'rw' | 'ar';
type DiscussionSort = 'new';
```

`QuestionStatus` **has** `pending`, and that is the whole model — if you find yourself
removing it so questions go live on submit, you are re-litigating the editorial decision.

`rejected` ≠ `hidden`: rejected means RMC declined to answer a submission; hidden means a
published entry was withdrawn. Both are invisible publicly, but a reviewer working the
queue must be able to tell them apart.

`AnswerStatus` is **gone**. `DawahAnswer` survives as a retired entity so migration 049's
`down()` can rebuild counts from real rows; nothing reads it.

---

## 2. Public projection — exactly what `toPublic()` emits

**This is the only shape that ever leaves the API.**

```ts
/** The RMC person who answered. `null` only if their account was deleted. */
interface PublicAuthor {
  name: string;
  isScholar: boolean;  // renders the scholar badge
}

interface DiscussionQuestion {
  id: string;
  slug: string;
  title: string;
  bodyHtml: string;              // the question — rendered + SANITISED server-side
  answerHtml: string;            // RMC's answer — likewise. Never empty on a published row.
  language: PostLanguage;        // drives `dir` on THIS entry — not the page locale
  category: DawahCategory | null;
  answeredBy: PublicAuthor | null;
  answeredAt: string | null;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
}
```

There is no `DiscussionThread` and no `DiscussionAnswer`. `GET /:slug` returns a
`DiscussionQuestion` directly.

### 2.1 Fields that are deliberately ABSENT

Not oversights. Adding any of them requires a security review:

| Absent | Why |
|---|---|
| **any asker at all** (`author`, `authorId`, `isAnonymous`) | A published entry is RMC's answer to a question the community raised; who raised it is not part of the record. This is *stronger* than the old anonymity flag — there is no field to leak, in any status, for any caller. |
| `body` / `answerBody` (markdown source) | The client renders nothing. Only the sanitised HTML is transmitted. Admin editors use a separate `AdminEntry` shape. |
| `status` | Only `published` rows reach a public route. Sending it invites a client to branch on it. |
| reports, votes, verification flags | Removed from the product — see §0. |

**FE:** if you need one of these, that is a conversation, not a patch.

---

## 3. Routes

### Public

```
GET  /api/v1/dawah/discussions          @Public()   Paginated<DiscussionQuestion>
GET  /api/v1/dawah/discussions/:slug    @Public()   DiscussionQuestion
POST /api/v1/dawah/discussions          members     { id, title, status } — a RECEIPT
POST /api/v1/dawah/discussions/preview  members     { html }
```

List query: `category` (slug) · `language` · `sort` (`new`) · `search` · `page` ·
`limit` (default 12, max 50). Only `status='published'` rows are ever returned.

- Default order: `published_at DESC` — **not** `created_at`. A question asked in March and
  answered in July belongs at the top of the list in July.
- `search` overrides that with `ts_rank` relevance, matching `title + body + answer_body`
  (migration 050). The answer is included deliberately: it is the substance of an entry,
  and the phrase a reader remembers is often only there.

> **Changing the searched text is a two-part change.** A GIN index on an expression is only
> used when the query repeats it byte-for-byte. Widening the `to_tsvector(...)` call without
> rebuilding the index does not error and does not return wrong rows — Postgres silently
> stops using the index and recomputes the vector per row. The expression therefore lives in
> ONE constant, `FTS_VECTOR` in `dawah-discussions.service.ts`, and the migration spells the
> same thing with bare column names. Move both, or neither.

`POST /dawah/discussions` returns a receipt, never an entry: there is nothing public yet.

### Admin

```
GET    /admin/dawah/discussions/submissions        @Permissions(DISCUSSIONS_VERIFY)
GET    /admin/dawah/discussions/entries            @Permissions(DISCUSSIONS_VERIFY)
POST   /admin/dawah/discussions/entries            @Permissions(DISCUSSIONS_VERIFY)
GET    /admin/dawah/discussions/entries/:id        @Permissions(DISCUSSIONS_VERIFY)
PATCH  /admin/dawah/discussions/entries/:id        @Permissions(DISCUSSIONS_VERIFY)
POST   /admin/dawah/discussions/entries/:id/answer @Permissions(DISCUSSIONS_VERIFY)
POST   /admin/dawah/discussions/entries/:id/reject @Permissions(DISCUSSIONS_VERIFY)
POST   /admin/dawah/discussions/:id/:action        @Permissions(DISCUSSIONS_MODERATE)
```

`DISCUSSIONS_VERIFY` (`discussions:verify`) keeps its **string** but not its meaning: it
authorised blessing a member's answer, and now authorises writing and publishing the answer
itself. The same authority — speaking for RMC on a point of religion — pointed at the thing
that actually reaches a reader. The string is unchanged so no role has to be re-granted.

`DISCUSSIONS_MODERATE` governs withdrawal only (`hide` / `restore` / `delete`), so RMC may
put authoring and withdrawal in different hands.

`/submissions` and `/entries` are declared **before** `:id/:action` — Nest matches in
declaration order, and `submissions` would otherwise parse as an `:id`.

---

## 4. Errors — and what FE renders for each

| Code | When | FE renders |
|---|---|---|
| **404** | Not found, **or** pending / rejected / hidden / deleted | The normal not-found page. **Never** "this was declined" — a status code must not reveal that RMC chose not to answer someone. |
| **401** | Submitting while signed out | "Sign in to ask" with `?redirect=` back to the form |
| **403** | Signed in, lacks the permission | Not-authorised. Only reachable on admin routes. |
| **409** | Answering an already-published entry, or submitting the same question twice | "Already published — edit it instead." |
| **429** | Rate limited | **"You're posting too quickly — try again in a few minutes."** Never a generic error. |

`error.code` is `CONFLICT` for 409 and `RATE_LIMITED` for 429. Both used to arrive as
`INTERNAL_ERROR` — the platform's status→code map covered only 400/401/403/404/500, so a
deliberate conflict was labelled identically to a crash and the honest messages above were
unreachable without string-matching the prose. Fixed in `http-exception.filter.ts`; it
applies to every module, not just this one.

**404-not-403 for non-published content is load-bearing.** 403 confirms the thing exists.

---

## 5. Rules this contract encodes

1. **`bodyHtml` and `answerHtml` are rendered and sanitised server-side.** The client never
   sees markdown and never renders it. One pipeline, one place to fix.
2. **The asker is never projected.** Not nulled — absent. See §2.1.
3. **A published entry always has an answer.** Enforced by
   `CHK_dawah_questions_published_has_answer`, so the UI renders the answer unconditionally
   with no unreachable "coming soon" branch.
4. **`language` is per entry.** FE sets `dir` from it, not from the page locale.
5. **`answeredBy` is a person, not a badge.** An institution hiding behind itself is exactly
   what naming the answerer prevents.
6. **Editing a published entry is silent.** It does not re-notify the asker; fixing a typo
   must not email somebody "your question has been answered" a second time.

---

## 6. Frontend client surface

```ts
dawahApi.discussions = {
  list(query: DiscussionsQuery): Promise<Paginated<DiscussionQuestion>>,
  bySlug(slug: string): Promise<DiscussionQuestion>,
  submit(payload: CreateQuestionPayload): Promise<SubmittedQuestion>,
  preview(body: string): Promise<{ html: string }>,
};

dawahApi.admin.discussions = {
  submissions(), entries(query), entry(id),
  createEntry(payload), updateEntry(id, payload),
  answer(id, payload), reject(id, reason), moderate(id, action, reason),
};
```

A typed `ThrottledError` (429) so the UI can render rule §4 without string-matching.
