# Dawah Discussions — Interface Contract (PROMPT-0)

**Frozen 16 July 2026.** Agreed by DB / BE / FE before any code. Changing anything here is
a contract change with a security review — not a quick `toPublic()` addition.

Scope: **Phase A (read-only)** shapes are `STABLE`. Shapes marked `PHASE B/C` are
reserved so the types do not churn when posting lands; they are documented now and
implemented later.

---

## 1. Enums — one spelling, both sides

Backend: string unions on the entity + DTO. Frontend: the same unions in
`src/lib/dawahApi.ts`. **Copy these verbatim; do not paraphrase.**

```ts
type QuestionStatus = 'published' | 'auto_hidden' | 'hidden' | 'locked' | 'deleted';
type AnswerStatus   = 'pending_review' | 'published' | 'auto_hidden' | 'hidden' | 'deleted';
type PostLanguage   = 'en' | 'rw' | 'ar';
type AnswerPolicy   = 'scholar_review' | 'open';
type DiscussionSort = 'active' | 'new' | 'unanswered';
```

`QuestionStatus` has no `pending_review` — questions go live on submit (plan §0.1). If you
find yourself adding it, you are re-litigating the moderation model.

---

## 2. Public projections — exactly what `toPublic()` emits

**These are the only shapes that ever leave the API.** Anything not listed here does not
exist as far as the frontend is concerned.

```ts
/** Author, as the public sees them. `null` ⇒ the post is anonymous. */
interface PublicAuthor {
  name: string;        // "Ali Habimana" — display only
  isScholar: boolean;  // renders the scholar badge next to an answer
}

interface DiscussionQuestion {
  id: string;
  slug: string;
  title: string;
  bodyHtml: string;              // rendered + SANITISED server-side. Never markdown source.
  language: PostLanguage;        // drives `dir` on THIS post — not the page locale
  category: DawahCategory | null;
  author: PublicAuthor | null;   // null ⇒ anonymous
  status: QuestionStatus;        // only ever 'published' on a public response
  answerCount: number;           // excludes pending_review answers
  viewCount: number;
  verifiedAnswerId: string | null;
  lastActivityAt: string;        // ISO
  createdAt: string;
}

interface DiscussionAnswer {
  id: string;
  questionId: string;
  bodyHtml: string;              // rendered + SANITISED
  language: PostLanguage;
  author: PublicAuthor | null;
  status: AnswerStatus;
  isVerified: boolean;
  verifiedBy: PublicAuthor | null;  // WHO verified — accountability, shown in the badge
  verifiedAt: string | null;
  voteScore: number;
  createdAt: string;
}

/** Thread = question + its answers, verified first. */
interface DiscussionThread {
  question: DiscussionQuestion;
  answers: DiscussionAnswer[];
}
```

### 2.1 Fields that are deliberately ABSENT

Not oversights. Adding any of them requires a security review:

| Absent | Why |
|---|---|
| `authorId` | Anonymity would be one `JSON.stringify` from being undone. The name is resolved server-side or nulled; the id never crosses the wire. |
| `isAnonymous` | Redundant *and* leaky: `author === null` already says it. A separate flag invites `author` being sent anyway "for admins". |
| `body` (markdown source) | The client renders nothing. Only `bodyHtml`, already sanitised, is transmitted. |
| `reporterId`, report rows | Reporters are never public. Not on any public route, ever. |
| `releasedById` | Internal. "Released" means *not harmful* — it is not a public claim, unlike verification. |
| `reportCount` | Publishing it tells an abuser exactly how many more reports they need. |

**FE:** if you need one of these, that is a conversation, not a patch.

---

## 3. Routes — Phase A

### `GET /api/v1/dawah/discussions` — `@Public()` · STABLE

Query: `category` (slug) · `language` (`PostLanguage`) · `sort` (`DiscussionSort`, default
`active`) · `page` (1-based) · `limit` (default 12, max 50) · `search` (Phase D — accepted
and ignored until then).

```ts
{ items: DiscussionQuestion[], total: number, page: number, limit: number }
```

Mirrors the existing `Paginated<T>` in `dawahApi.ts` — same shape as courses and books.

- `sort=active` → `last_activity_at DESC` (default)
- `sort=new` → `created_at DESC`
- `sort=unanswered` → `answer_count = 0`, then `created_at DESC`
- Only `status='published'` rows are ever returned.

### `GET /api/v1/dawah/discussions/:slug` — `@Public()` · STABLE

Returns `DiscussionThread`. Answer order: **verified first**, then `voteScore DESC`,
then `createdAt ASC`.

### PHASE B/C — reserved, not implemented in A

```
POST   /dawah/discussions                    ask
POST   /dawah/discussions/:slug/answers      answer
POST   /dawah/discussions/answers/:id/vote
POST   /dawah/discussions/report
POST   /dawah/discussions/answers/:id/release   @Permissions(DISCUSSIONS_VERIFY)
POST   /dawah/discussions/answers/:id/verify    @Permissions(DISCUSSIONS_VERIFY)
GET    /admin/dawah/discussions/pending         @Permissions(DISCUSSIONS_VERIFY)
GET    /admin/dawah/discussions/reports         @Permissions(DISCUSSIONS_MODERATE)
```

---

## 4. Errors — and what FE renders for each

| Code | When | FE renders |
|---|---|---|
| **404** | Not found, **or** hidden / auto_hidden / locked / deleted / draft | The normal not-found page. **Never** "this was removed" — a status code must not leak a moderation decision. |
| **401** | Posting while signed out | "Sign in to ask" with `?redirect=` back to the thread |
| **403** | Signed in, lacks the permission | Not-authorised. Only reachable on admin/scholar routes. |
| **409** | Second verify on a question that already has one | "Another scholar verified an answer — refresh." Comes from a DB unique index, not a service check. |
| **429** | Rate limited (§6 of the plan) | **"You're posting too quickly — try again in a few minutes."** Never a generic error. |

**404-not-403 for hidden content is load-bearing.** 403 confirms the thing exists.

---

## 5. Rules this contract encodes

1. **`bodyHtml` is rendered and sanitised server-side.** The client never sees markdown and
   never renders it. One pipeline, one place to fix.
2. **`author: null` is the single source of truth for anonymity.** No flag, no id.
3. **`answerCount` excludes `pending_review`.** "3 answers" with none visible is a bug report.
4. **`language` is per post.** FE sets `dir` from it, not from the page locale.
5. **`verifiedBy` is a person, not a boolean.** "Verified by RMC" without a name is an
   institution hiding behind itself.

---

## 6. Frontend client surface (`FE-1` implements exactly this)

```ts
dawahApi.discussions = {
  list(query: DiscussionsQuery): Promise<Paginated<DiscussionQuestion>>,
  bySlug(slug: string): Promise<DiscussionThread>,
};
```

Extends the existing `dawahApi` object; same conventions as `dawahApi.books`. A typed
`ThrottledError` (429) so the UI can render rule §4 without string-matching.
