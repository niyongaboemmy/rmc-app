# Dawah Multimedia — Implementation Prompts (team task assignments)

**Companion to:** `docs/dawah-multimedia-implementation-plan.md` (read it first — the *why* lives there; this doc is the *who/what/in-what-order*).
**Status:** Ready to execute · **Date:** 2026-07-15 · **Target:** Phase A (public video + audio on Dawah course lessons).

Each prompt below is written to be handed **directly** to one specialist. It is self-contained: objective, exact files, gotchas, and the handoff contract. Where full rationale is needed, it points back to a plan section (e.g. §6.3) rather than repeating it.

---

## ✅ Decisions locked (2026-07-15, confirmed by RMC) — read before any prompt

These override any contrary wording in the prompts below:

1. **All media is public.** No members-only anything. Golden rule 3 is now absolute — there is no gating work, no Phase C.
2. **Video = external URL only** (`media_url`, YouTube/Vimeo). **No video uploads.** Therefore:
   - `content_type='video'` ⇒ **requires `media_url`**, `media_key` must be null (no XOR).
   - `MEDIA_MIME_TYPES` (BE-1) and the upload field (FE-2) are **audio-only**.
   - `LessonVideo` (FE-3) is a **facade embed only** — no native `<video>`/self-host path.
   - Audio is the *only* thing ever uploaded; it stays self-hosted under public `dawah-media/`.

---

## Team & ownership

| Role | Owns | Prompts |
|---|---|---|
| **Senior Database Engineer** | The lesson data contract, invariants, and the (deferred) forward-migration spec | `DB-1` |
| **Senior Backend Engineer** | Media upload endpoint, DTO/service validation, serving decision, tests | `BE-1`, `BE-2` |
| **Media Expert** | Hosting strategy, formats/encoding, embed-URL derivation, host allowlist, file-server media ops, seek/verify | `MED-1`, `MED-2` |
| **UI/UX Expert** | Player + admin-form UX spec, accessibility, RTL, states — the binding design | `UX-1` |
| **Senior Frontend Engineer** | API client, admin form, page threading, player components, i18n | `FE-1`, `FE-2`, `FE-3` |

## Golden rules (every prompt inherits these)

1. **Phase A is migration-free.** The columns `content_type`, `media_key`, `media_url`, `duration_minutes` already exist and are already persisted by the service. Do not add a migration in Phase A. Do not "tidy" or remove these columns.
2. **Video = external (`media_url`), Audio = self-host (`media_key`).** See plan §4. Do not build a self-hosted video pipeline.
3. **Media is public in Phase A.** Store under the **non-protected** `dawah-media/` prefix. Do **not** add `dawah-media/` to `DEFAULT_PROTECTED_PREFIXES`, and do **not** route public media through the backend (the file-server already serves Range/206).
4. **No members-gating, no DRM, no transcoding, no new runtime dependency.** Native `<audio>` for audio + a lite iframe embed for video. If you think you need a player library, re-read plan §2.4 first.
5. **Honor the seam.** Media is "a new `content_type` value plus a player component — not a new subsystem."
6. Match existing conventions: `DAWAH_VIEW`/`DAWAH_MANAGE` permissions, tri-lingual `_en/_rw/_ar`, i18n via `useTranslations`, tokens `rmc-green`/`rounded-2xl`, logical CSS props (`ps-/pe-/ms-/me-/start-/end-`), no hardcoded English in user-facing UI.

## Sequencing / dependency graph

```
Wave 1 (start in parallel, day 1)
  ├─ PROMPT-0  Shared contract      → everyone codes to these shapes
  ├─ UX-1      Design spec          → unblocks FE-2, FE-3
  ├─ MED-1     Media contract       → unblocks BE-2, FE-3
  └─ DB-1      Data contract        → informs BE-1/BE-2

Wave 2
  ├─ BE-1      Upload endpoint      (needs MED-1 folder/limits, DB-1 invariants)
  ├─ BE-2      Validation+allowlist (needs MED-1 host list)
  ├─ MED-2     File-server media ops + verify (independent; needs BE-1 to end-to-end test)
  └─ FE-3      Players (build against PROMPT-0 shapes + UX-1; mock data OK)

Wave 3
  ├─ FE-1      API client           (needs BE-1 endpoint shape)
  ├─ FE-2      Admin form           (needs UX-1, FE-1, MED-1)
  └─ Integration + DoD              (all)
```

---

## PROMPT-0 — Shared interface contract (all engineers, agree before coding)

Everyone implements against these exact shapes so waves can proceed in parallel. This is the source of truth; if it changes, announce it.

**Lesson media fields** (already on the read type `DawahCourseLesson` in `lib/dawahApi.ts:71-92`):
- `contentType: 'text' | 'video' | 'audio' | 'pdf' | 'link'`
- `mediaKey: string | null` — file-server key under `dawah-media/` (self-hosted **audio only**)
- `mediaUrl: string | null` — external URL (YouTube/Vimeo) for video (the **only** video path)
- `durationMinutes: number | null` — admin-entered

**Write payload** (`LessonPayload`) gains the same three optional fields: `contentType?`, `mediaKey?`, `mediaUrl?`.

**Upload endpoint** (new): `POST /api/v1/admin/dawah/media/upload` (multipart, field `file`, `@Permissions(DAWAH_MANAGE)`) → `{ fileKey, fileName, fileSize, mimeType }`. Same envelope as `POST /admin/dawah/books/upload`.

**Content-type ⇄ media invariant** (enforced backend + mirrored client-side):
- `video` ⇒ `mediaUrl` set, `mediaKey` null (external URL only).
- `audio` ⇒ `mediaKey` (self-host).
- `text` ⇒ neither (uses `body_*`).
- `pdf` / `link` ⇒ Phase B; keep selectable-but-inert for now.
- Any media lesson may still carry `body_*` — it renders **below** the player as transcript/notes.

**Serving:** public media → frontend resolves `fileUrl(mediaKey)` and the file-server range-streams it. No backend byte path.

---

## DB-1 — Senior Database Engineer

**Objective:** Certify the data contract, encode the integrity rules, and pre-design the (deferred) forward migration so Phase B is a drop-in. **You are not shipping a migration in Phase A.**

**Depends on:** — · **Unblocks:** BE-1, BE-2 (invariants).

**Do this:**
1. **Certify the seam.** Confirm in `entities/dawah-course-lesson.entity.ts` + `migrations/052-dawah-tables.ts` that `content_type` (CHECK `text|video|audio|pdf|link`), `media_key`, `media_url`, `duration_minutes`, `is_preview`, and index `IDX_dawah_course_lessons_course_sort` are present and correct. Write a one-paragraph sign-off: "no migration required for Phase A, and here is why." Note lessons are **hard-delete** (no `deleted_at`) — orphaned media keys are possible; see step 4.
2. **Specify the invariants** BE must enforce (they live in the service/DTO, not as DB constraints in Phase A, because a partial cross-column CHECK is brittle):
   - `content_type='video'` ⇒ `media_url` set, `media_key` null (external URL only).
   - `content_type='audio'` ⇒ `media_key` is set, `media_url` null.
   - `content_type='text'` ⇒ `media_key` and `media_url` both null.
   - Switching a lesson's `content_type` must null the now-irrelevant media column(s) (no stale `media_url` left on a lesson turned back to `text`). Hand BE the exact rule table.
3. **Read-path review.** Confirm the public course fetch returns lessons ordered by `sort_order` and that adding media columns to the projection costs nothing (they're already selected). Confirm `toPublic`-style projections do **not** leak anything sensitive — `media_key` under a *public* prefix is safe to expose (unlike book `file_key`); state this explicitly so FE can resolve `fileUrl(mediaKey)` client-side.
4. **Orphan/cleanup policy.** Because lessons hard-delete and media lives on the file-server, deleting/retyping a lesson leaves the file orphaned. For Phase A, document this as accepted (public, low volume) and define a Phase B cleanup approach (e.g. a reconciliation job, or delete-on-unset in the service). Do not build it now.
5. **Pre-design the Phase B migration** (spec only, in the plan's §5.2 spirit) — a single additive migration adding `media_mime varchar(100)`, `media_thumbnail_key varchar(500)`, and either reusing `body_*` for transcripts or adding `transcript_*`. Also spec the **standalone-media** decision (nullable `course_id` vs a `dawah_media` table) but mark it "decide on §13-Q4 answer, not now."

**Deliverable:** a short `DB sign-off` note (paste into the PR / plan appendix) covering: no-migration confirmation, the invariant rule table (handed to BE), the public-exposure confirmation (handed to FE), the orphan policy, and the Phase B migration sketch.

**Gotchas:** Do not add a cross-column CHECK constraint in Phase A (it fights the "additive only" promise and blocks legitimate edit sequences). Do not widen `varchar(500)` — YouTube/Vimeo URLs and file keys fit.

---

## MED-1 — Media Expert (media contract & hosting strategy)

**Objective:** Define, precisely, the media formats, hosting rules, host allowlist, and the URL-normalisation logic that BE validates and FE renders. This is a *specification* deliverable that unblocks BE-2 and FE-3.

**Depends on:** RMC decisions §13-Q1/Q2 (chase them). · **Unblocks:** BE-2, FE-3.

**Do this:**
1. **Video hosting spec.** Confirm external (YouTube/Vimeo unlisted). Produce:
   - The **host allowlist** (exact hosts): `youtube.com`, `www.youtube.com`, `youtu.be`, `youtube-nocookie.com`, `vimeo.com`, `player.vimeo.com`. Scheme `https:` only.
   - **ID-extraction + canonical embed derivation** rules for each provider (e.g. `youtu.be/<id>`, `youtube.com/watch?v=<id>`, `youtube.com/embed/<id>` → embed `https://www.youtube-nocookie.com/embed/<id>?rel=0`; Vimeo `vimeo.com/<id>` / `player.vimeo.com/video/<id>` → `https://player.vimeo.com/video/<id>`). Store the **raw** admin-entered URL; derive the embed URL at render. Provide a tiny pure-function pseudocode both BE (validate) and FE (render) can implement identically.
   - Privacy/embed params: `youtube-nocookie`, `rel=0`, no autoplay.
2. **Audio format spec.** Recommended container/codec (MP3 as the safe default; optionally AAC/`.m4a`, Ogg/Opus), a **target bitrate** (voice content: 96–128 kbps mono/joint-stereo) and the resulting **size envelope** (so we can set `MEDIA_MAX_BYTES` and the nginx ceiling sensibly). Confirm ≤ ~80 MB per file keeps us under the 100 MB nginx cap; if longer khutbahs are expected, give BE/ops the number to raise.
3. **File-server MIME facts** (hand to BE/ops and MED-2): the exact `Content-Type` each accepted extension must serve as, the `MEDIA_MIME_TYPES` upload allowlist, and confirmation that the DB-backed Upload-Settings allowlist must be empty or include these.
4. **Player behavior spec** (hand to UX-1 + FE-3): lite/facade embed for video (no third-party JS until click), `preload="none"` for audio/self-host video, poster strategy (external = provider thumbnail; audio = course cover/icon), and the **seek verification** procedure (curl a `Range` request, expect `206` + `Content-Range` + `Accept-Ranges: bytes`).
5. **Captions/transcripts** (Phase B guidance): note the `<track kind="captions">` path for self-host and that external platforms handle their own; recommend reusing `body_*` as the transcript in Phase A.

**Deliverable:** a `media-contract.md` section (or an appendix in the plan) with: host allowlist, the normalise-URL pseudocode, audio encoding targets + size ceiling, MIME table, and the seek-verification recipe.

**Gotchas:** Never allow arbitrary hosts or non-`https` (embed-injection / mixed-content). Do not recommend HLS/transcoding for Phase A. Confirm the audio size number **before** BE sets `MEDIA_MAX_BYTES`.

---

## MED-2 — Media Expert (file-server media ops & verification)

**Objective:** Make the file-server actually serve audio correctly and verify seeking end-to-end. This is the one **required code fix** on the file-server plus ops confirmations.

**Depends on:** MED-1 (MIME table); can land independently of BE. · **Unblocks:** true end-to-end audio playback.

**Do this:**
1. **[REQUIRED CODE FIX]** Extend `EXT_MIME` in `apps/file-server/src/storage/storage.service.ts:44-56` to map audio extensions to correct MIME types (`.mp3→audio/mpeg`, `.m4a→audio/mp4`, `.aac→audio/aac`, `.ogg→audio/ogg`, `.wav→audio/wav`). Without this, disk-served audio returns `application/octet-stream` and **will not play**. Confirm `.mp4`/`.webm` (video) are already present.
2. **[OPS]** Ensure the Admin → Upload Settings MIME allowlist (DB-backed, enforced at `storage.controller.ts:76-83`) is empty (allow-all default) **or** includes `MEDIA_MIME_TYPES`. Document the current prod value.
3. **[OPS]** Confirm nginx `client_max_body_size` (`DEPLOYMENT.md:319`, currently 100 MB) covers MED-1's max audio size; if not, raise it (and tell BE to raise `MEDIA_MAX_BYTES` in lockstep) and consider `proxy_request_buffering off`.
4. **[OPS/VERIFY]** Confirm the prod **storage driver + creds** (root `.env` has no `STORAGE_DRIVER`, code defaults to `s3`, empty AWS keys — plan §7.5). Media at scale must not silently fail S3 or run single-node disk unknowingly.
5. **[VERIFY — the acceptance gate]** After BE-1 lands, upload a real audio file and prove: `curl -I <fileUrl>` → `Content-Type: audio/mpeg` + `Accept-Ranges: bytes`; `curl -H 'Range: bytes=0-1023' <fileUrl>` → `206 Partial Content` + `Content-Range`. Paste the raw output.
6. **[PERF, optional]** Note (don't necessarily change) that serve `Cache-Control` is hardcoded `private, max-age=3600` and global `compression()` is on — for public media a longer public cache and excluding media from gzip would help; leave as a Phase B recommendation unless trivial.

**Deliverable:** the `EXT_MIME` PR + an ops-confirmation note + the pasted curl seek-verification.

**Gotchas:** Do not add `dawah-media/` to the protected-prefix list. Do not gzip media. The `EXT_MIME` fix is load-bearing — audio silently fails without it.

---

## BE-1 — Senior Backend Engineer (media upload endpoint)

**Objective:** Give the admin a way to produce a `media_key`. Mirror the book-upload path exactly, targeting a **public** prefix.

**Depends on:** MED-1 (folder name, size ceiling, MIME list), DB-1 (invariants). · **Unblocks:** FE-1, FE-2, MED-2 verify.

**Do this:**
1. Add constants (new `apps/backend/src/dawah/dawah-media.constants.ts` or in the course service):
   ```ts
   export const DAWAH_MEDIA_FOLDER = 'dawah-media';        // PUBLIC — do NOT add to protected prefixes
   export const MEDIA_MAX_BYTES = <from MED-1, e.g. 100*1024*1024>;
   export const MEDIA_MIME_TYPES = [<from MED-1: AUDIO/* ONLY — video is external-URL, never uploaded>];
   ```
2. Add the endpoint to `DawahAdminController` mirroring `books/upload` (`dawah-admin.controller.ts:191-198`):
   ```ts
   @Post('media/upload') @Permissions(Permission.DAWAH_MANAGE) @ApiConsumes('multipart/form-data')
   @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MEDIA_MAX_BYTES } }))
   uploadMedia(@UploadedFile() file) { return this.media.uploadFile(file); }
   ```
3. Service method mirroring `DawahBookService.uploadFile` (`dawah-book.service.ts:326-332`): `this.storage.upload(file, DAWAH_MEDIA_FOLDER, { maxBytes: MEDIA_MAX_BYTES, mimeTypes: MEDIA_MIME_TYPES, typeErrorMessage: 'Lesson media must be an audio file.' })`. Return `{ fileKey, fileName, fileSize, mimeType }`. (No video MIME types — video is a URL, handled by BE-2, not uploaded.)
4. Reuse `PublicUploadService` (already imported by `DawahModule`). Dual size enforcement (multer + service) is automatic via the rules object.

**Do NOT:** build any serving/streaming route for public media (the file-server serves it directly). Do not add a backend Range implementation. Do not add `dawah-media/` to protected prefixes. Do not raise the anonymous-form defaults in `PublicUploadService`.

**Acceptance:** `curl -F file=@clip.mp3 -H 'Authorization: Bearer <manage>' .../admin/dawah/media/upload` → `{ fileKey: 'dawah-media/<uuid>.mp3', … }`; a `dawah:view`-only token → 403; a `.txt` → 400 with the type message; an oversize file → 413.

---

## BE-2 — Senior Backend Engineer (validation, host allowlist, content-type integrity)

**Objective:** Make the already-writable media fields **safe** and **consistent**. This is the security-critical piece (plan §6.3, §9).

**Depends on:** MED-1 (host allowlist + normalise rules), DB-1 (invariant table). · **Unblocks:** FE trust.

**Do this:**
1. **`media_url` host allowlist** in the create/update lesson DTO or service: beyond the existing `@IsUrl()`, reject any `media_url` whose scheme ≠ `https:` or whose host ∉ MED-1's allowlist → `400 BadRequest` with a clear message. Implement the shared normalise/validate pure function (MED-1 pseudocode) so BE and FE agree.
2. **Content-type ⇄ media invariant** (DB-1's table) in the service `addLesson`/`updateLesson` (`dawah-course.service.ts:327-368`): enforce the rules (video ⇒ `media_url` only + `media_key` null; audio ⇒ `media_key` only; text ⇒ both null); on a `content_type` change, null the now-irrelevant media column(s) so no stale `media_url`/`media_key` survives a switch back to `text`.
3. **Keep the existing "unchanged vs clear" update semantics** (`!== undefined`) intact — don't regress book/lesson editing.
4. **Tests:** unit-test the normaliser (valid YT/Vimeo forms, hostile hosts, `http:`, `javascript:`), and the invariant transitions (text→video needs a url; video→text clears url).

**Do NOT:** render or reflect `media_url` anywhere via string interpolation into HTML; it's data, validated here and rendered as an `iframe src` on the client only. Do not weaken `@IsUrl()`; add to it.

**Acceptance:** POST `contentType:'video', mediaUrl:'https://evil.example/x'` → 400; `https://youtu.be/abc` → 200 and stored; PATCH a video lesson to `contentType:'text'` → `media_url` becomes null.

---

## UX-1 — UI/UX Expert (binding design spec)

**Objective:** Produce the design the Frontend Engineer implements against — for both the **admin lesson form** and the **public players** — consistent with the existing Dawah visual language, accessible, and RTL-correct.

**Depends on:** MED-1 (player behavior). · **Unblocks:** FE-2, FE-3.

**Do this — Admin lesson form (`admin/dawah/courses/[id]/lessons`):**
1. Spec the **content-type switch** UX: today the `<select>` is disabled with "coming soon" (`page.tsx:438-450`). Design the enabled experience — selecting *video* reveals a URL field (with an inline validity hint + a tiny live embed preview once valid); *audio* reveals the upload field; *text* keeps the rich editor. Specify transitions, and what happens to entered data when the type changes (mirror BE-2's clearing rule visually — warn before discarding).
2. Spec the **media upload field** states (clone `PdfUploadField`, library page 359-426): idle drop-zone, uploading (progress %, cancel), filled (filename + size + Replace/Remove), error. Give copy for each (i18n keys).
3. Spec the **duration** input and where the text **body-as-transcript** sits (labelled clearly so admins know it shows under the player).

**Do this — Public player (`CourseOutline` accordion panel):**
4. Spec **`LessonVideo`** (facade): poster + centered play button, aspect-ratio box (16:9), click → swap in the `iframe`; loading + error (broken/removed video → fall back to the text body). Spec the members/preview badge placement (all public in Phase A).
5. Spec **`LessonAudio`**: a compact, branded player row (native `<audio controls>` styled or a thin custom skin over the native element), with title + duration; mobile-friendly touch targets.
6. **Accessibility:** keyboard operation, visible focus, `aria-label` naming the lesson, caption/track affordance (Phase B), and reduced-motion. Note: if a full-screen overlay is used, `PreviewOverlayShell` `FOCUSABLE` (`PreviewOverlayShell.tsx:44`) must add `video`/`audio`.
7. **RTL & i18n:** all new controls mirror correctly (logical props); no hardcoded English — deliver the full en/rw/ar key list for FE (with Arabic; rw may mirror English per the namespace's current state). Player *control chrome* stays LTR (correct for media).
8. **States:** loading, empty (media set but failing), and the "no media, text only" default — the accordion must never show a blank box.

**Deliverable:** a short UX spec (annotated wireframes or precise prose keyed to existing tokens `rmc-green`/`rounded-2xl`/`rounded-xl`, the `SearchableSelect`/`PdfUploadField` primitives) + the i18n key list. This is **binding** for FE-2/FE-3.

**Gotchas:** Keep the course page fast — video must be a facade (no auto-loaded third-party JS), audio `preload="none"`. Don't introduce a heavyweight player skin; native controls are the baseline. Honor the accordion's unmount-on-close (don't defeat it with persistent state).

---

## FE-1 — Senior Frontend Engineer (API client)

**Objective:** Extend the typed client so the admin can write media and upload files with progress.

**Depends on:** BE-1 (endpoint shape via PROMPT-0). · **Unblocks:** FE-2.

**Do this:**
1. In `lib/dawahApi.ts`: add `contentType?`, `mediaKey?`, `mediaUrl?` to the **write** type `LessonPayload` (241-254).
2. Add `uploadLessonMedia(file, onProgress)` mirroring `uploadBookFile`/`sendBookUpload` (282-352): raw XHR → `POST ${API_BASE_URL}/admin/dawah/media/upload`, `xhr.upload.onprogress`, token from `localStorage`, once-only `refreshAccessToken()` retry on 401, 3-min timeout. Expose as `dawahApi.admin.media.upload`.
3. Add the shared **`normalizeMediaEmbed(url)`** pure helper (MED-1 pseudocode) in a small `lib/dawah/media.ts` so both the admin preview and the public player derive the embed URL identically to BE-2.

**Acceptance:** types compile; `uploadLessonMedia` reports progress and returns `{ fileKey, … }`; `normalizeMediaEmbed` matches BE's normaliser on the MED-1 test vectors.

---

## FE-2 — Senior Frontend Engineer (admin lesson form)

**Objective:** Implement UX-1 in the lesson builder so an admin can set video/audio.

**Depends on:** UX-1, FE-1, MED-1. · **Unblocks:** content creation.

**Do this:**
1. In `admin/dawah/courses/[id]/lessons/page.tsx`: **enable** the content-type `<select>` (remove `disabled` on the media options, `page.tsx:438-450`) and drive the conditional fields per UX-1 (video URL input + live preview via `normalizeMediaEmbed`; audio `MediaUploadField`; text unchanged).
2. Build `MediaUploadField` by cloning `PdfUploadField` (library page 359-426): `accept="audio/*"` (audio only — video is never uploaded), ceiling `MEDIA_MAX_BYTES`, calls `dawahApi.admin.media.upload`. Reuse all four visual states from UX-1.
3. Include `contentType`/`mediaKey`/`mediaUrl` in the `LessonPayload`; client-side mirror BE-2's invariants (fast feedback) and the host allowlist (reject bad URLs before submit).
4. Add the UX-1 i18n keys to `messages/{en,rw,ar}.json` under `admin.dawah.lessons.*`.

**Gotchas:** Don't send a media field that contradicts the content type (BE-2 will 400). Keep the existing tri-lingual title/summary/body and reorder/drag behavior intact. Match the surrounding form's `inputClass`/`labelClass` and logical props.

**Acceptance:** set a lesson to video + paste a YouTube link → preview shows; save → reload shows it persisted; set another to audio + upload → progress → saved; a bad URL is blocked client-side; view-only admin sees none of these controls.

---

## FE-3 — Senior Frontend Engineer (public players + page threading)

**Objective:** Render the media on the public course-detail page per UX-1, with zero new deps.

**Depends on:** UX-1, MED-1 (embed derivation), PROMPT-0 (can build against mock data before BE lands). · **Unblocks:** the feature.

**Do this:**
1. **Thread media through** in `app/[locale]/dawah/courses/[slug]/page.tsx:95-104`: stop dropping the media fields. Extend the `OutlineLesson` map + interface (`CourseOutline.tsx:18-26`) to carry `contentType`, `mediaUrl`, and a **server-resolved** `mediaSrc = mediaKey ? fileUrl(mediaKey) : null` (resolve `fileUrl` on the server; the client gets a plain URL). Do **not** import the sanitizer/dompurify into the client component.
2. Build **`components/dawah/LessonVideo.tsx`** (`'use client'`): **facade embed only** per UX-1 using `normalizeMediaEmbed` (`youtube-nocookie`/Vimeo); inject `iframe` only on click. There is no native `<video>`/self-host path. Broken/removed → fall back to the text body.
3. Build **`components/dawah/LessonAudio.tsx`** (`'use client'`): native `<audio controls preload="none" src={mediaSrc}>` styled per UX-1; show duration.
4. In `CourseOutline.tsx`, render the correct player in the open panel **above** `bodyHtml` (the slot at 117-124). Rely on the existing unmount-on-close so nothing buffers while collapsed.
5. **(Optional, Phase B seed)** emit `VideoObject`/`AudioObject` JSON-LD on the course page when lessons carry media — mirror the existing `Course`/`Book` JSON-LD.

**Gotchas:** `CourseOutline` is a client component and must not import `isomorphic-dompurify` (build breaks) — media needs only plain strings/URLs. `preload="none"` is mandatory (perf). Facade-only for video. Verify seeking works (MED-2's curl) — if audio won't seek, it's almost certainly the `EXT_MIME` fix (MED-2) not the player.

**Acceptance:** a published course with a video lesson shows the facade → plays on click; an audio lesson plays with a working scrubber on desktop + mobile; text lessons unchanged; nothing loads until a lesson is opened; Lighthouse on the page unchanged; all three locales render; no console errors.

---

## Integration & Definition of Done (whole team)

Ship Phase A only when all are true (from plan §14):
1. Admin (`dawah:manage`) sets a video lesson (YouTube link) → lite embed on the public page; a non-allowlisted URL is rejected (BE-2 + FE-2).
2. Admin uploads an audio file (progress) → plays inline with **working seek**; MED-2's `curl -I` shows `audio/*` + `Accept-Ranges: bytes`, and a `Range` request returns `206`.
3. `dawah:view`-only admin sees media **read-only**; public visitor needs no account.
4. Media loads **only on demand**; Lighthouse on `/dawah/courses/[slug]` unchanged vs baseline.
5. Three locales render; RTL correct; no console errors; **no new dependency** in either `package.json`.
6. **Migration-free**; existing text lessons unaffected; `tsc` + lint clean across backend, frontend, file-server.

**Handoff order to merge:** MED-2 (`EXT_MIME`) → BE-1/BE-2 → FE-1 → FE-2 → FE-3, with UX-1 and MED-1 landed as docs before FE starts. Each PR references its prompt ID and the plan section it satisfies.

---

*These assignments deliberately keep the blast radius small: one required file-server line (audio MIME), one new backend endpoint + one validation guard, three focused frontend pieces, and two specification deliverables. That is the whole of Phase A — because the seam was built for exactly this.*
