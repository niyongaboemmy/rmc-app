# Dawah Learning — Multimedia (Video & Audio) Implementation Plan

**Status:** Proposed · **Date:** 2026-07-15 · **Author:** Architecture/PM pass
**Scope:** Add video and audio to Dawah course lessons on the RMC platform (Next.js 14 frontend, NestJS backend, NestJS file-server; monorepo).
**Companion docs:** `docs/dawah-learning-implementation-plan.md` (the original catalogue plan — this is its deferred "Phase 7: Media Resources"), `docs/dawah-learning-implementation-prompts.md`.

---

## ✅ Decisions locked (2026-07-15, confirmed by RMC)

Two §13 questions are answered. They **simplify** the plan and **override** any contrary text below:

1. **All media is public.** No members-only / paid media, ever. → The entire members-gating path is **removed**: no lesson/course `visibility` model, no backend proxy, no HTTP-Range pipe. **Phase C is dropped.** Ignore every "members-gated / deferred gating" mention below.
2. **Video is external-URL only** (`media_url`, YouTube/Vimeo unlisted on an RMC-owned channel). We do **not** upload or self-host video. → the "thin self-host video clip" option is **removed**: `MEDIA_MIME_TYPES` is **audio-only**, the video player is **facade-embed only**, and the `content_type='video'` rule is simply **requires `media_url`** (no XOR with `media_key`). **Audio stays self-hosted** (`media_key`, public `dawah-media/` prefix).

Net: the *only* uploaded media is audio; video is a validated URL; everything serves publicly and directly (no backend byte path). Effort shrinks slightly from the §1 estimate.

---

## 1. Executive summary

Dawah Learning was built catalogue-first with a **deliberate media seam** already in the schema and API. Adding video/audio is, as the original plan promised, *additive* — a new `content_type` value plus a player component, **not a new subsystem**. Three of the four hard pieces already exist:

- **Data + API + persistence** — the `dawah_course_lessons` table has `content_type` (CHECK: `text|video|audio|pdf|link`), `media_key`, `media_url`, `duration_minutes`; the create/update DTOs **already accept** these fields and the service **already persists** them (`dawah-course.service.ts` `addLesson`/`updateLesson`). No migration and no API version bump are required for the core.
- **Seekable serving** — the file-server's `GET /api/v1/files/:key` route **already supports HTTP Range / 206 partial content** (`storage.controller.ts:206-213`, `storage.service.ts:228-264`) in both disk and S3 mode. Video/audio scrubbing works today against a directly-served file.
- **A working native-player reference** — `components/drive/FilePreview.tsx` already renders `<video>`/`<audio>` with native controls; no player library is needed anywhere in the app.

What must be built is small and well-bounded: a **media upload endpoint**, a couple of **player components**, the **admin form** wiring (enable the already-present "coming soon" options), and one **required file-server fix** (audio MIME mapping).

### The recommendation, stated plainly

> **Video → external hosting (`media_url`, e.g. YouTube/Vimeo unlisted). Audio → self-hosted (`media_key`, public prefix, direct file-server serve). Launch media as public (free), matching the catalogue's "every course is free" ethos. Do NOT build a members-gated media proxy now.**

This is the cheapest path that is also the *correct* one for a community organisation:

- **Self-hosting video** would drag in the platform's weakest areas at once: 100–500 MB uploads buffered in RAM, **no transcoding** (a single bitrate is bad for Rwandan mobile connections), no adaptive streaming, unbounded storage growth, and backend/file-server bandwidth. The schema's own comment on `media_url` reads `-- external (YouTube…)`. External embeds give transcoding, adaptive bitrate, a global CDN, and captions **for free**, with zero RMC storage/bandwidth.
- **Self-hosting audio is genuinely viable** because audio files are small (a 60-min MP3 at 96–128 kbps ≈ 40–55 MB) *and the file-server already range-streams them*. Serve them from a **public** prefix via `fileUrl(mediaKey)` straight into a native `<audio>` element — the browser gets seeking for free and the backend is never in the byte path.
- **Members-gated media** is the one genuinely expensive option (the backend has **no** Range support and buffers whole files — `dawah.controller.ts` `sendPdf` does `res.end(buffer)`). It also has no data model yet: lessons have `is_preview` but courses/lessons have **no `visibility` column**. Since the product is a free catalogue, keep media public and defer gating to a later phase if it is ever actually required.

**Rough effort for the MVP (Phase A): ~3–5 engineer-days.** No new runtime dependencies.

---

## 2. Current-state assessment — what already exists

Ground-truth references (verified in code):

### 2.1 Data model — the seam is live
`apps/backend/src/dawah/entities/dawah-course-lesson.entity.ts`
```ts
export enum LessonContentType { TEXT='text', VIDEO='video', AUDIO='audio', PDF='pdf', LINK='link' }

@Column({ name:'content_type', default: LessonContentType.TEXT }) contentType: LessonContentType;
@Column({ name:'media_key',  length:500, nullable:true }) mediaKey: string | null;   // file-server key
@Column({ name:'media_url',  length:500, nullable:true }) mediaUrl: string | null;   // external (YouTube…)
@Column({ name:'duration_minutes', nullable:true })       durationMinutes: number | null;
@Column({ name:'is_preview', default:false })             isPreview: boolean;
```
CHECK constraint `CHK_dawah_lesson_content_type` (`migrations/052-dawah-tables.ts:121-133`) already allows all five values. Lessons are **hard-deleted** (no `deleted_at`).

### 2.2 API — already writable
- `dto/create-dawah-lesson.dto.ts:66-89` — `@IsEnum(LessonContentType) contentType?`, `@IsString()@MaxLength(500) mediaKey?`, `@IsUrl()@MaxLength(500) mediaUrl?`, `durationMinutes?`. (`update` DTO = `PartialType`.)
- `dawah-course.service.ts` `addLesson` (327-344) & `updateLesson` (366-368) persist `contentType`/`mediaKey`/`mediaUrl` verbatim; `content_type` is **not** forced to `text` — it only defaults to `text` when omitted. Lesson-count invariant kept via `syncLessonCount` inside a transaction.
- Routes (`dawah-admin.controller.ts`): `POST courses/:id/lessons`, `PATCH lessons/:id`, `POST courses/:id/lessons/reorder`, `DELETE lessons/:id` — all `@Permissions(DAWAH_MANAGE)`.

**Implication:** a client can already `POST { contentType:'video', mediaUrl:'https://youtu.be/…' }` and it stores. The only reason it isn't used is the frontend hasn't been wired and there is no way to produce a `mediaKey` (no media upload endpoint).

### 2.3 Serving — Range works on the file-server, not the backend
- **File-server** `storage.controller.ts:173-223` (`GET files/:key`, `@Public()`): honours `Range`, returns `206` + `Accept-Ranges: bytes` + `Content-Range`, and **streams** (`file.body.pipe(res)`) via `fs.createReadStream({start,end})` (disk) or S3 `Range` passthrough. **Seeking already works.**
- **Backend** streaming (`dawah.controller.ts` `sendPdf`, book preview/download) buffers the whole file and `res.end(buffer)` — **no Range anywhere in `apps/backend/src`** (grep confirms zero `206`/`Content-Range`/`Accept-Ranges`). Fine for 25 MB PDFs; unsuitable for large media.
- Two serving models already implemented on the frontend: **public** = `fileUrl(key)` direct (`lib/api.ts:8-10`, used for covers); **protected** = backend-proxied token-carrying blob (`dawahApi.books.previewBlobUrl`, `components/drive/FilePreview.tsx` `useAuthBlob`).

### 2.4 Frontend — player precedent + the exact slots
- **No player library** anywhere (`package.json` has none); native `<video>`/`<audio>` already used in `components/drive/FilePreview.tsx:144-166`; a YouTube `iframe` embed exists in `components/home/SocialMediaSection.tsx:143-145` (`youtube-nocookie.com`).
- **Course detail** (`app/[locale]/dawah/courses/[slug]/page.tsx:95-104`) maps lessons to `OutlineLesson` for the accordion but **currently drops `contentType`/`mediaKey`/`mediaUrl`** — these must be threaded through.
- **Accordion** (`components/dawah/CourseOutline.tsx:117-131`): the open panel is **unmounted when closed** (no background buffering) — the exact, correct slot for a per-lesson player is immediately above the `bodyHtml` block (line 124). It's a `'use client'` component, so an interactive player fits.
- **Admin lesson form** (`app/[locale]/admin/dawah/courses/[id]/lessons/page.tsx:438-450`): the `content_type` `<select>` renders video/audio/pdf/link **disabled + "coming soon"**; `LessonPayload` (`lib/dawahApi.ts:241-254`) omits the media fields. Upload UI template: `PdfUploadField` (library page 359-426) + the raw-XHR `uploadBookFile`/`uploadWithProgress` helper (`dawahApi.ts:282-352`).

### 2.5 File-server constraints
| Constraint | Value | Source |
|---|---|---|
| Multer upload ceiling | **500 MB** per-route (memory storage — buffers in RAM) | `storage.controller.ts:53` |
| **Production nginx** `client_max_body_size` | **100 MB** (the *real* upload ceiling) | `DEPLOYMENT.md:319` |
| Range/seeking | **Supported** (disk + S3) | `storage.service.ts:228-264` |
| MIME allowlist | Dynamic from DB; **empty = allow all** (default) | `storage.controller.ts:76-83` |
| Serve `EXT_MIME` map | knows `.mp4`/`.webm`; **no audio extensions** → audio served as `application/octet-stream` (won't play) | `storage.service.ts:44-56` |
| Storage driver | `disk` (dev) / `s3` (code default) → bucket `rmc-files` | `storage.config.ts:5` |
| Transcoding / HLS / thumbnails | **none** (no ffmpeg/sharp) | `package.json` |
| Cache-Control on serve | hardcoded `private, max-age=3600` (blocks shared/CDN caching) | `storage.controller.ts:205` |
| Protected prefixes | `hajj-proofs/`, `funeral-docs/`, `dawah-library/` | `jwt-auth.guard.ts:35-43` |

---

## 3. Goals & non-goals

**Goals (Phase A)**
1. An admin with `dawah:manage` can make a lesson a **video** (paste a YouTube/Vimeo link) or an **audio** lesson (upload a file), alongside optional text/transcript.
2. Public visitors play that media inline on the course-detail page, with seeking, on desktop and mobile, in all three locales, with no console errors.
3. Zero new runtime dependencies; native players; the catalogue stays fast (Lighthouse unaffected — media loads only on demand).

**Non-goals (explicitly deferred)**
- Members-only / paid media, DRM, download-gating for media (needs the backend streaming pipe + a lesson/course `visibility` model — Phase C, only if required).
- Transcoding, adaptive bitrate (HLS/DASH), thumbnail generation, auto-captions (external hosting provides these; self-host serves as-is).
- Enrolment, progress tracking, "resume where you left off" (separate LMS phase).
- A standalone media library page decoupled from courses (see §5.3 — modelled as a course/playlist for now).

---

## 4. The core architectural decision

Two hosting paths are already modelled by the schema: **`media_url`** (external) vs **`media_key`** (self-hosted file-server key). The decision is *per content type*, not global.

| | **Video** | **Audio** |
|---|---|---|
| **Recommendation** | **External** via `media_url` (YouTube/Vimeo unlisted) | **Self-host** via `media_key` (public prefix, direct serve) |
| File size | 200 MB–GBs | ~20–80 MB (fits under nginx 100 MB) |
| Transcoding / adaptive bitrate | Needed; **we have none** → external provides it | Not needed (audio is already small/compressed) |
| Bandwidth cost to RMC | ~zero (served by YouTube/Vimeo CDN) | Modest; file-server streams it |
| Seeking | Handled by the embed | **Works today** (file-server Range) |
| Storage growth | None on RMC | Bounded, manageable |
| Player | `iframe` facade (lite-embed) | native `<audio controls>` |
| Backend in byte path? | No | No (public prefix → `fileUrl`) |
| Captions/accessibility | Provided by platform | `<track>` if supplied (future) |

**Why not self-host video too?** Because it would require, all at once: raising the nginx ceiling well past 100 MB, moving off memory-buffered uploads, a transcoding pipeline we don't have, and accepting single-bitrate playback on mobile. For a community org that is cost and risk with little benefit. **Decided: video is external-URL only — no self-hosted video.**

**Why keep media public (no gating)?** The catalogue is free by design ("Every course is free"); there is no `visibility` column on courses/lessons; and members-gating is the only path that forces the expensive backend streaming pipe. Public media under a **non-protected** prefix is served directly by the file-server with Range — elegant and cheap. If gating is ever needed, §11 Phase C describes the lift honestly.

---

## 5. Data model

### 5.1 No migration required for the core
`content_type`, `media_key`, `media_url`, `duration_minutes` all exist and are accepted/persisted. Phase A ships **migration-free**, honouring the original plan's "additive only, no migration, no API break" promise.

### 5.2 Optional, deferrable additions (only if product asks)
A single tiny additive migration could later add:
- `media_mime varchar(100)` — to render the correct `<source type>` without inferring from the key extension (nice-to-have; extension inference is fine for v1).
- `media_thumbnail_key varchar(500)` — likely unnecessary: external video gets a provider poster automatically and audio uses the course cover; keep only if a custom audio artwork is ever wanted.
- `transcript_en/rw/ar text` — searchable transcripts (SEO + a11y win). Or simply reuse the existing `body_*` fields for the transcript. **Recommend reusing `body_*`** for v1: a media lesson keeps its text body as the transcript/notes, rendered under the player.

### 5.3 Standalone media (a khutbah belonging to no course)
The original plan left this open ("nullable `course_id` **or** a small `dawah_media` table — decide then"). **Decision for v1: model standalone media as lessons inside a container course** (e.g. a "Friday Khutbahs" course acting as a playlist). This needs zero schema change and reuses the entire courses/lessons UI and ordering. Revisit a dedicated `dawah_media` table only if product needs media that must *not* appear under any course — a genuine, separate requirement to confirm (see §13).

---

## 6. Backend work

### 6.1 Media upload endpoint — mirror `books/upload`
Add to `DawahAdminController` + `DawahCourseService` (or a small `DawahMediaService`):
```
POST /admin/dawah/media/upload        @Permissions(DAWAH_MANAGE)
  @UseInterceptors(FileInterceptor('file', { limits:{ fileSize: MEDIA_MAX_BYTES } }))
  → this.storage.upload(file, DAWAH_MEDIA_FOLDER, { maxBytes: MEDIA_MAX_BYTES, mimeTypes: MEDIA_MIME_TYPES, typeErrorMessage })
  → returns { fileKey, fileName, fileSize, mimeType }
```
New constants (in a `dawah-media.constants.ts` or the course service):
```ts
export const DAWAH_MEDIA_FOLDER = 'dawah-media';            // PUBLIC prefix — NOT added to protected list
export const MEDIA_MAX_BYTES = 100 * 1024 * 1024;           // stay at/under nginx 100 MB; raise both together if needed
export const MEDIA_MIME_TYPES = [
  'audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/x-m4a',
];  // AUDIO ONLY — video is external-URL, never uploaded (see Decisions locked)
```
Reuses `PublicUploadService.upload()` exactly as books do (dual size enforcement: multer + service; MIME-only validation). **Memory note:** both backend and file-server buffer the upload in RAM; at ≤100 MB that's acceptable for audio. For anything larger, the escape hatch is the existing **`POST presigned-upload`** direct-to-S3 path (S3 mode) — document it, don't build speculatively.

### 6.2 Serving — nothing to build for public media
Because `dawah-media/` is a **public** (non-protected) prefix, the frontend resolves `fileUrl(mediaKey)` and the file-server range-streams it directly. **No new backend streaming route, no backend Range code.** This is the single biggest simplification and the reason to keep media public.

### 6.3 Validation & the `media_url` host allowlist (security-critical)
`@IsUrl()` is not enough — an admin (or a compromised admin session) could set `media_url` to an arbitrary or hostile embed. Add server-side validation in the DTO/service:
- `content_type='video'` ⇒ require `media_url` (external only); `media_key` must be null.
- `content_type='audio'` ⇒ require `media_key` (self-host) — or allow a direct-file `media_url` under our own file-server host only.
- **Host allowlist** for `media_url`: scheme must be `https:` and host ∈ `{ youtube.com, www.youtube.com, youtu.be, youtube-nocookie.com, vimeo.com, player.vimeo.com }` (+ our own file-server host). Reject everything else with a 400. This is what prevents embed-injection.
- Normalise a pasted YouTube/Vimeo URL to a canonical embed form server-side (store the raw URL; derive the embed URL at render — see §8.4).

### 6.4 Duration
Keep `duration_minutes` **admin-entered** for v1 (the field exists; the form already has an input). Server-side probing needs ffprobe, which we don't have and shouldn't add now.

---

## 7. File-server work

1. **[REQUIRED] Extend `EXT_MIME`** in `storage.service.ts:44-56` to map audio extensions, or disk-served audio returns `application/octet-stream` and **won't play**:
   `.mp3→audio/mpeg`, `.m4a→audio/mp4`, `.aac→audio/aac`, `.ogg→audio/ogg`, `.wav→audio/wav`. (Video `.mp4`/`.webm` already present.)
2. **[OPS] MIME allowlist** (Admin → Upload Settings, DB-backed): ensure it is empty (allow-all, the default) **or** explicitly includes the `MEDIA_MIME_TYPES`. Otherwise uploads 400 with `UNSUPPORTED_MIME_TYPE` (`storage.controller.ts:76-83`).
3. **[OPS] nginx** `client_max_body_size` (`DEPLOYMENT.md:319`, currently **100 MB**): confirm it covers the largest expected audio; if self-hosting longer recordings, raise it *and* `MEDIA_MAX_BYTES` together, and consider `proxy_request_buffering off`.
4. **[PERF, optional] Public-media caching**: the hardcoded `Cache-Control: private, max-age=3600` (`storage.controller.ts:205`) blocks shared/edge caching. For the public `dawah-media/` prefix, a longer public `max-age` (and excluding media from the global `compression()`, `main.ts:75`, since it's already compressed) would help if traffic grows. Not required for launch. The real-CDN-in-front-of-`cdn.isengesho.com` remains the scale escape hatch.
5. **[VERIFY] prod storage driver/creds**: root `.env` has no `STORAGE_DRIVER` (code defaults to `s3`) and empty AWS keys — confirm prod isn't silently failing S3 or running disk, **before** self-hosting media at scale.

---

## 8. Frontend work

### 8.1 API client (`lib/dawahApi.ts`)
- Extend the **write** type `LessonPayload` to include `contentType?`, `mediaKey?`, `mediaUrl?` (the read type `DawahCourseLesson` already has them).
- Add `uploadLessonMedia(file, onProgress)` mirroring `uploadBookFile` (raw XHR → `POST /admin/dawah/media/upload`, progress, 401-refresh-retry); expose as `dawahApi.admin.media.upload`.

### 8.2 Admin lesson form (`admin/dawah/courses/[id]/lessons/page.tsx`)
- **Enable** the `content_type` select (drop `disabled`); on change, conditionally render:
  - **video** → a `media_url` text input ("Paste a YouTube or Vimeo link") with inline validation + a live embed preview. (No file upload for video.)
  - **audio** → a **`MediaUploadField`** (clone `PdfUploadField`; `accept="audio/*"`, ceiling = `MEDIA_MAX_BYTES`, calls `uploadLessonMedia`) → stores `mediaKey`.
  - **text** → the existing RichTextEditor (unchanged).
  - **pdf / link** → keep visible; Phase B (pdf: reuse the book-embed pattern; link: a validated external URL button). Label "coming soon" until then, or ship minimally.
- Keep the tri-lingual title/summary/body; **body doubles as the transcript/notes** shown under the player.
- Include `contentType`/`mediaKey`/`mediaUrl` in the payload; validate client-side (mirror §6.3) for fast feedback.
- i18n: add `admin.dawah.lessons.*` keys (media URL label/help, upload hints, validation) in en/rw/ar.

### 8.3 Thread media through to the client (`courses/[slug]/page.tsx`)
Extend the `OutlineLesson` mapping (95-104) and interface (`CourseOutline.tsx:18-26`) to carry:
`contentType`, `mediaUrl` (raw), and a server-resolved `mediaSrc = mediaKey ? fileUrl(mediaKey) : null`. Resolve `fileUrl` **on the server** so the client just gets a URL. (Do **not** import the sanitizer or dompurify into the client component — unchanged rule.)

### 8.4 Players (new small client components — zero deps)
In `CourseOutline`'s open panel, above `bodyHtml`, switch on `contentType`:
- **`LessonVideo`** — for `media_url`: parse the YouTube/Vimeo ID and render a **lite/facade embed** (thumbnail + play button; only inject the `iframe` on click) using `youtube-nocookie.com` / `player.vimeo.com` (the `SocialMediaSection.tsx:143` pattern, hardened). This keeps the course page fast (no third-party JS until play). **Facade-embed only — there is no self-hosted `<video>` path** (video is external-URL only).
- **`LessonAudio`** — native `<audio controls preload="none" src={mediaSrc}>`, styled to match the card, with the `duration` shown. Seeking is free (file-server Range).
- `preload="none"` + the panel unmounting on collapse ⇒ nothing downloads until a user opens the lesson and hits play.
- A `<span>` "Free preview" badge already exists for `isPreview`; media honours the same (all public in v1).

### 8.5 Accessibility, RTL, SEO
- Native `<video>`/`<audio>` controls are keyboard-operable and screen-reader-labelled out of the box; add an `aria-label` naming the lesson. If a full-screen player overlay is ever used, note `PreviewOverlayShell`'s `FOCUSABLE` list (`PreviewOverlayShell.tsx:44`) includes `iframe` but **not** `video`/`audio` — add them so the focus trap includes the player.
- RTL: media control chrome is inherently LTR (fine); the surrounding layout already mirrors. Provide `<track kind="captions">` when a caption file is supplied (future).
- **SEO win (optional, Phase B):** emit `VideoObject` / `AudioObject` JSON-LD on the course page when lessons carry media (mirrors the `Course`/`Book` JSON-LD already shipped) — materially valuable for a dawah catalogue meant to be found.

---

## 9. Security

- **`media_url` host allowlist + `https:` scheme** (backend, §6.3) — the primary control against embed/`javascript:` injection. Never render `media_url` via `dangerouslySetInnerHTML`; only as a validated `iframe src` / `<source src>`.
- **Public media prefix by design** — `dawah-media/` is intentionally **not** protected. Do **not** add it to `DEFAULT_PROTECTED_PREFIXES` (that would break direct serving *and* force the backend Range pipe). Media contains no secrets in v1 (free catalogue).
- **Upload validation** — MIME-allowlist enforced server-side (mime, never extension); dual size caps; `DAWAH_MANAGE` on the upload route.
- **CSP/iframe** — allow the external embed hosts in the frontend `frame-src`/`Content-Security-Policy` if one is enforced; keep it to the allowlisted hosts only.
- Reuse the sanitizer already in place for the text body (`lib/sanitize.ts`) — media doesn't change that.

---

## 10. Performance & cost

- **External video** → zero RMC storage/bandwidth/transcoding; lite-embed facade keeps LCP/TBT unaffected until play.
- **Self-host audio** → file-server streams with Range; audio is small so bandwidth is modest; public prefix means the backend node is never in the byte path. Add public `Cache-Control` / a real CDN later if it becomes a cost centre (§7.4) — the same escape hatch the book plan documented.
- **Upload memory** — 100 MB buffered in RAM on backend+file-server per upload; acceptable for audio, another reason video is external. Presigned direct-to-S3 is the scale path.
- **nginx 100 MB** is the real upload ceiling — sized fine for audio; the gate to widen before any large self-host.

---

## 11. Phasing & sequencing

**Phase A — MVP (this plan; ~3–5 eng-days).** Migration-free.
1. File-server: extend `EXT_MIME` for audio (§7.1). *(0.5d)*
2. Backend: `POST /admin/dawah/media/upload` + `media_url` host-allowlist validation (§6.1, §6.3). *(1d)*
3. Frontend API: `LessonPayload` media fields + `uploadLessonMedia` (§8.1). *(0.5d)*
4. Frontend admin: enable content-type select, media URL input + `MediaUploadField`, payload wiring, i18n (§8.2). *(1–1.5d)*
5. Frontend public: thread media through the page + `LessonVideo`/`LessonAudio` players (§8.3–8.4). *(1–1.5d)*
6. Verify + docs (§14). *(0.5d)*
Ops: confirm MIME allowlist/driver, size ceilings (§7.2–7.5).

**Phase B — enrichment (later).** `pdf`/`link` content types; transcripts/captions (`<track>`, `VideoObject`/`AudioObject` JSON-LD); optional `media_thumbnail_key`/`media_mime` migration; standalone `dawah_media` table *only if* §13 confirms the need.

**Phase C — members-gated media. ❌ Removed from scope** (RMC confirmed all media is public, 2026-07-15). Recorded only so the trade-off is remembered: were it ever revived, it would require a lesson/course `visibility` model **and** a backend streaming route with HTTP Range — the pipe that does not exist today.

---

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Disk-served audio plays as `octet-stream` | Audio silently won't play | **Required** `EXT_MIME` fix (§7.1); verify with `curl -I` (Content-Type + `Accept-Ranges`). |
| Admin MIME allowlist misconfigured | Media uploads 400 | Ops check (§7.2); default empty allow-all already permits it. |
| nginx 100 MB / RAM-buffered uploads | Large self-host uploads 413 or spike memory | Keep video external; cap audio; raise nginx + presigned path only if needed (§7.3, §10). |
| Arbitrary `media_url` embed | XSS / unwanted third-party frame | Host allowlist + `https:` only (§6.3, §9). |
| Prod storage driver/creds unset | Uploads fail in prod | Verify before launch (§7.5). |
| External video = content on YouTube | Ads / leaves platform / link rot | Use **unlisted** uploads on an RMC-owned channel; store canonical URL; a broken embed degrades to the text body. |
| Self-host cost creep | Bandwidth bill | Public `Cache-Control` + real CDN escape hatch (§7.4). |

---

## 13. Decisions to confirm with RMC (before building)

1. **Video hosting — ✅ ANSWERED:** external URLs only (YouTube/Vimeo unlisted). *Open sub-item:* who owns the RMC channel/account the videos live on?
2. **Audio hosting** — self-hosting audio on the file-server (public, free-to-listen) is approved in principle; still need the **expected longest recording length** (sets `MEDIA_MAX_BYTES` + the nginx ceiling).
3. **Members-only media? — ✅ ANSWERED: No.** All media is public. Phase C removed.
4. **Standalone khutbahs** — is media that belongs to **no course** required at launch, or is a "playlist course" acceptable for now (§5.3)?
5. **Transcripts/captions** — desired at launch (accessibility + SEO), or Phase B?
6. **Prod storage** — is production on S3/MinIO or local disk, and are credentials configured? (§7.5)

---

## 14. Definition of done (Phase A)

- An admin (`dawah:manage`) sets a lesson to **video**, pastes a YouTube link → it renders as a lite embed on the public course-detail page; a non-allowlisted URL is rejected with a clear error.
- An admin uploads an **audio** file (progress bar) → the lesson plays inline with **working seek** on desktop and mobile; `curl -I` on the media key shows the correct `audio/*` Content-Type and `Accept-Ranges: bytes`, and a `Range` request returns `206`.
- A **view-only** (`dawah:view`) admin sees the media read-only (no upload/edit controls); the public visitor needs no account.
- Media loads **only on demand** (nothing downloads until a lesson is opened and played); Lighthouse on `/dawah/courses/[slug]` unchanged vs baseline.
- All three locales render; RTL unaffected; no console errors; native players (no new dependency in `package.json`).
- Migration-free; existing lessons (text) unaffected; `tsc` + lint clean.

---

## 15. Touchpoint index (where the work lands)

**Backend** — `dawah/dawah-admin.controller.ts` (upload route), `dawah/dawah-course.service.ts` or new `dawah-media.service.ts` (upload + validation), `dawah/dto/create-dawah-lesson.dto.ts` (host-allowlist validation), new `dawah/dawah-media.constants.ts`.
**File-server** — `storage/storage.service.ts:44-56` (`EXT_MIME` audio — **required**); ops: Upload Settings MIME allowlist, nginx `client_max_body_size`, storage driver/creds.
**Frontend** — `lib/dawahApi.ts` (`LessonPayload` + `uploadLessonMedia`), `app/[locale]/admin/dawah/courses/[id]/lessons/page.tsx` (enable select + media fields), `app/[locale]/dawah/courses/[slug]/page.tsx` (thread media through), `components/dawah/CourseOutline.tsx` (player slot + `OutlineLesson`), new `components/dawah/LessonVideo.tsx` + `LessonAudio.tsx`, `messages/{en,rw,ar}.json` (new keys).

---

*This plan honours the seam the original authors designed: media is a new `content_type` value plus a player component — not a new subsystem. The one thing they couldn't foresee is now confirmed in code: the file-server already serves Range/206, so public self-hosted audio needs no new streaming infrastructure at all.*
