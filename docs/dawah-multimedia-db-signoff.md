# DB-1 — Data-Contract Sign-off (Dawah Multimedia, Phase A)

**Role:** Senior Database Engineer · **Prompt:** `DB-1` · **Date:** 2026-07-15
**Verdict:** ✅ **No migration required for Phase A.** The media seam is present, correct, and already persisted. This note certifies the data contract, hands BE the enforcement rules, hands FE the exposure confirmation, records the orphan policy, and sketches the (deferred) Phase B migration.

---

## 1. Seam certification — verified three ways (no migration needed)

`dawah_course_lessons` carries the full media seam, and **entity ⇄ migration ⇄ live DB agree exactly**:

| Column | Entity (`dawah-course-lesson.entity.ts`) | Migration (`052-dawah-tables.ts`) | Live DB (`\d dawah_course_lessons`) |
|---|---|---|---|
| `content_type` | `varchar(20)`, default `'text'`, enum `text\|video\|audio\|pdf\|link` (L77-78) | `varchar(20) NOT NULL DEFAULT 'text'` | `character varying(20) NOT NULL DEFAULT 'text'` ✓ |
| CHECK | `CHK_dawah_lesson_content_type` (mirror) | `CHECK content_type IN (text,video,audio,pdf,link)` | `CHK_dawah_lesson_content_type CHECK (…ARRAY[text,video,audio,pdf,link])` ✓ |
| `media_key` | `varchar(500)` nullable (L84-85) | `varchar(500)` | `character varying(500)` nullable ✓ |
| `media_url` | `varchar(500)` nullable (L91-92) | `varchar(500)` | `character varying(500)` nullable ✓ |
| `duration_minutes` | `int` nullable (L94-95) | `int` | `integer` nullable ✓ |
| `is_preview` | `boolean` default `false` (L102-103) | `boolean NOT NULL DEFAULT false` | `boolean NOT NULL DEFAULT false` ✓ |
| `sort_order` | `int` default `0` (L98-99) | `int NOT NULL DEFAULT 0` | `integer NOT NULL DEFAULT 0` ✓ |
| Index | `IDX_dawah_course_lessons_course_sort (courseId, sortOrder)` (L35) | same | `btree (course_id, sort_order)` ✓ |
| FK | `course_id → dawah_courses ON DELETE CASCADE` (L44) | same | `ON DELETE CASCADE` ✓ |
| Soft delete | **none** (hard delete, by design) | none | no `deleted_at` column ✓ |

**Why no migration:** every column, the CHECK values, the index, and the FK that Phase A needs already exist and match the running database. The service already writes `content_type`/`media_key`/`media_url` (see §3). Phase A adds behaviour (an upload endpoint, validation, a player), **not schema**. This honours the original plan's "additive only — no migration, no API break" promise (`052` header comment; plan §4.3).

> **Do not** add a cross-column CHECK for the content-type⇄media rules in Phase A. A partial CHECK (`content_type='video' ⇒ media_url IS NOT NULL`) blocks legitimate two-step edit sequences (change type, then set the URL) and fights the additive-only promise. The rules live in the service (§2), enforced atomically per write.

---

## 2. Invariant rule table — hand to Backend (BE-2 enforces in `addLesson`/`updateLesson`)

Media is **public** and **video is external-URL only** (per the locked decisions). The rules:

| `content_type` | `media_url` | `media_key` | `body_*` | On switching **into** this type (update) |
|---|---|---|---|---|
| `text`  | must be `null` | must be `null` | the lesson content | null **both** media columns |
| `video` | **required** — `https:` + host ∈ allowlist (MED-1) | must be `null` | optional (transcript/notes, shown under the player) | null `media_key` |
| `audio` | must be `null` | **required** — a `dawah-media/…` key from the upload endpoint | optional (transcript/notes) | null `media_url` |
| `pdf` / `link` | Phase B — keep selectable-but-inert | Phase B | — | leave inert |

Rules for BE:
1. **Presence at write time.** `video` without `media_url` → 400; `audio` without `media_key` → 400. Enforce on create and on update-that-sets-type.
2. **Clear-on-switch.** When `content_type` changes, null the now-irrelevant media column(s) so no stale `media_url`/`media_key` survives (e.g. `video → text` must clear `media_url`). This is the single most important integrity rule — without it, a retyped lesson keeps a dangling reference.
3. **`duration_minutes`** is optional for every type; **`is_preview`** is independent of type (a video can be a free preview). Do not couple them.
4. Preserve the existing **"unchanged vs clear"** update semantics (`!== undefined`) — an omitted field means "leave as is", an explicit `null` means "clear". The clear-on-switch rule (2) is applied *after* that, keyed off the new `content_type`.

---

## 3. Read-path & public-exposure — hand to Frontend (FE-3)

- **The public API already returns the media fields.** `DawahCourseService.findBySlugPublic` (`dawah-course.service.ts:137-148`) loads `relations: { lessons: true }` and sorts `course.lessons` by `sortOrder`. Lessons are returned **as the raw entity — there is no lesson `toPublic()` projection** (grep confirms; only *books* strip keys via `toPublic`). So `contentType`, `mediaKey`, `mediaUrl`, `durationMinutes`, `isPreview` are all present on the wire today. Adding them to the frontend `OutlineLesson` costs **zero** backend change — they are already selected and serialised.
- **`media_key` is safe to expose.** Unlike `dawah_books.file_key` (protected `dawah-library/` prefix, deliberately stripped by `toPublic`), lesson media lives under the **public** `dawah-media/` prefix. FE may resolve `fileUrl(mediaKey)` **client-side** and hand it straight to `<audio src>`. There is no secret in a media key and no policy to enforce at read time — that is the whole point of keeping media public.
- **Ordering guarantee.** Lessons render in `sort_order` (maintained by the reorder endpoint, backed by the composite index). FE can rely on the returned order.

---

## 4. Orphan / cleanup policy

Lessons **hard-delete** (no `deleted_at`, by design — `entity.ts:27-29`), and audio bytes live on the file-server. Therefore:
- Deleting a lesson, or switching an `audio` lesson to another type (clear-on-switch, §2 rule 2), or replacing its file, **leaves the previous `dawah-media/` object orphaned** on the file-server. Nothing deletes it.

**Phase A decision: accepted.** Media is public, low-volume, and small (audio). An orphaned public audio file is wasted storage, not a leak. Building reconciliation now is premature.

**Phase B options** (pick when volume justifies it): (a) a periodic reconciliation job that lists `dawah-media/` keys and deletes any not referenced by a lesson `media_key`; or (b) delete-on-unset in the service (best-effort file-server delete when a `media_key` is cleared/replaced) — simpler but couples the write path to the file-server. Prefer (a) — it also catches failed-mid-save uploads.

---

## 5. Phase B migration sketch (spec only — do NOT ship in Phase A)

A single additive migration, in the plan §5.2 spirit (all nullable, no data backfill, no API break):

```sql
-- Phase B (deferred) — additive only
ALTER TABLE dawah_course_lessons
  ADD COLUMN media_mime          varchar(100),   -- exact <source type>; avoids inferring from key extension
  ADD COLUMN media_thumbnail_key varchar(500);   -- OPTIONAL: custom audio artwork. Likely unnecessary —
                                                  -- external video gets a provider poster, audio uses the
                                                  -- course cover. Add only if product asks.
-- Transcripts/captions: REUSE the existing body_en/rw/ar as the transcript in Phase A/B
-- (a media lesson keeps its text body, rendered under the player). Add transcript_* columns
-- only if a transcript must coexist with a separate rich body — not expected.
```

**Standalone media** (a khutbah belonging to no course): **decision deferred to §13-Q4.** Two shapes were pre-modelled — a nullable `course_id` on lessons, or a small `dawah_media` table. Recommendation stands: model standalone media as lessons inside a **container/playlist course** (zero schema change, reuses the whole courses/lessons UI). Only add `dawah_media` if product genuinely needs media that must not appear under any course. Do not decide this now.

---

## Sign-off

The Phase A data contract is **certified and unblocked**. Backend may proceed with `BE-1` (upload endpoint) and `BE-2` (validation) against the invariant table in §2; Frontend may rely on §3 for the read shape and public `fileUrl(mediaKey)` exposure. **No migration, no entity change, no API version bump is required for Phase A.**

— Senior Database Engineer, per prompt `DB-1`
