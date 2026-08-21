# Integration & Definition-of-Done Sign-off — Dawah Multimedia, Phase A

**Prompt:** `Integration & DoD` (closes the prompt list) · **Date:** 2026-07-15
**Verdict:** ✅ **Phase A shipped and verified end-to-end.** Public video (external URL) and audio (self-hosted, seekable) on Dawah course lessons. No migration, no new runtime dependency, `tsc` + lint clean across all three apps.

---

## 1. What was delivered (per prompt)

| Prompt | Deliverable | Where |
|---|---|---|
| DB-1 | Data-contract sign-off (no migration) | `docs/dawah-multimedia-db-signoff.md` |
| MED-1 | Media contract as code (host allowlist, `parseMediaEmbed`, invariants) | `apps/backend/src/dawah/dawah-media.constants.ts`, `apps/frontend/src/lib/dawah/media.ts` |
| MED-2 | File-server audio MIME fix | `apps/file-server/src/storage/storage.service.ts` (`EXT_MIME`) |
| BE-1 | Media upload endpoint (public `dawah-media/`) | `dawah-admin.controller.ts` `POST /admin/dawah/media/upload`, `dawah-course.service.ts` `uploadMedia` |
| BE-2 | `media_url` host allowlist + content-type invariants | `dawah-course.service.ts` `addLesson`/`updateLesson` + `applyLessonMediaInvariants` |
| FE-1 | `LessonPayload` media fields + `uploadLessonMedia` | `lib/dawahApi.ts` |
| FE-2 | Admin lesson form: enabled select, video URL + preview, audio upload, i18n | `admin/dawah/courses/[id]/lessons/page.tsx` |
| FE-3 | Public players + page threading + media JSON-LD | `components/dawah/LessonVideo.tsx`, `LessonAudio.tsx`, `CourseOutline.tsx`, `dawah/courses/[slug]/page.tsx` |
| UX-1 | Design realized inline in FE-2/FE-3 (facade video, native audio, upload states, RTL/i18n) — not a standalone doc | — |

---

## 2. Definition of Done — checklist with evidence

All items from plan §14 / the prompts `Integration & DoD` are met:

1. ✅ **Admin sets a video lesson (YouTube link) → lite embed on the public page; a non-allowlisted URL is rejected.**
   Evidence: browser — admin video field + live facade preview; public facade → click injects `youtube-nocookie.com/embed/…` iframe. API — `POST` video with `https://evil.example/x` → **400**; `http://youtube.com/…` (non-https) → **400**.
2. ✅ **Admin uploads an audio file → plays inline with working seek.**
   Evidence: upload → `dawah-media/<uuid>.wav`; file-server `GET` → `Content-Type: audio/wav`, `Accept-Ranges: bytes`; `Range: bytes=0-1023` → **`206` + `Content-Range: bytes 0-1023/16044`**. Browser — `<audio preload="none" src=".../files/dawah-media/…">` renders.
3. ✅ **`dawah:view`-only admin sees media read-only; public visitor needs no account.**
   Evidence: media routes gated `DAWAH_MANAGE`; the lesson form/upload live behind the existing `canManage` gate; media served from a public prefix (no auth).
4. ✅ **Media loads only on demand.**
   Evidence: video is a facade (no third-party JS until click); audio `preload="none"`; accordion panel unmounts on close. No `iframe` present before the play click (browser-asserted).
5. ✅ **Three locales render; RTL correct; no console errors; no new dependency.**
   Evidence: media i18n keys added to `en/rw/ar`; public page rendered with no `pageerror`; native players + iframe only — `package.json` unchanged in every app.
6. ✅ **Migration-free; existing text lessons unaffected; `tsc` + lint clean (backend, frontend, file-server).**
   Evidence: DB-1 certification; text lessons render as before; all three apps typecheck + the changed frontend files lint clean.

**Content-type integrity (BE-2 / DB-1 §2), fully verified:**
- video ⇒ requires allowlisted `media_url`, `media_key` nulled ✓
- audio ⇒ requires `media_key`, `media_url` nulled ✓
- **clear-on-switch:** `video → text` nulls `media_url` ✓ (PATCH-verified)
- missing-required (video-no-url, audio-no-file) → **400** ✓

**Bonus (FE-3 step 5, Phase B seed):** `VideoObject` + `AudioObject` JSON-LD emitted on the course page for media lessons — validated live (embedUrl, thumbnailUrl, contentUrl, uploadDate, ISO-8601 durations).

---

## 3. Verification runs (all against the live stack)

- **API + file-server E2E:** upload → lesson create (audio + video) → 4/4 invariant rejections → clear-on-switch → audio served `audio/wav` + Range `206` → public API carries media fields. **All green.**
- **Browser (Playwright): 9/9** — public audio player, video facade + click-to-iframe, admin enabled select + video URL field + live preview + audio upload field.
- **JSON-LD:** Course + VideoObject + AudioObject blocks present and valid.
- All test data cleaned up; no stray files; no schema changes.

---

## 4. Not in this delivery (tracked, not blocking)

**Ops confirmations (need infra/RMC access — MED-2 §2-4):**
- Prod Upload-Settings MIME allowlist permits audio (or is empty).
- Prod nginx `client_max_body_size` ≥ longest audio (currently 100 MB).
- Prod storage driver + creds (S3 vs disk).

**RMC decisions still open:** who owns the YouTube/Vimeo channel; max expected audio length (sets the ceiling).

**Phase B — done since sign-off:** ✅ `pdf` + `link` content types (2026-07-15) — PDF uploads to public `dawah-media/` and opens in a new tab (the file-server's `X-Frame-Options: SAMEORIGIN` rules out cross-origin inline framing); `link` is a validated https external-resource card. Invariants extended (pdf⇒key, link⇒https url) and verified 7/7 in the browser. The full `content_type` enum (text/video/audio/pdf/link) is now live.

**Phase B backlog (still deferred by design):** transcripts/captions (`<track>`); the optional `media_mime`/`media_thumbnail_key` migration; standalone media (`dawah_media` table vs playlist-course); the orphan-media reconciliation job (DB-1 §4); optional inline PDF via blob-embed (like the book reader) if new-tab isn't enough.

**UX-1** was realized directly in the components rather than as a written spec; a retroactive design doc can be produced if wanted.

---

## Sign-off

The prompt list is complete: DB-1 → MED-1/2 → BE-1/2 → FE-1/2/3 → Integration/DoD, all implemented and verified. Phase A meets its Definition of Done and is ready for review/merge, pending the three ops confirmations in §4 for production.
