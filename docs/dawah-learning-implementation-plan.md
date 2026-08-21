# Dawah Learning — Implementation Plan

**Status:** Proposed · **Author:** Architecture · **Date:** 2026-07-14
**Companion:** [dawah-learning-implementation-prompts.md](./dawah-learning-implementation-prompts.md) — the role-assigned build prompts. Read this document first; the prompts operationalize it.

---

## 1. Scope

Integrate a **Dawah Learning** section into the RMC platform: a public-facing catalogue of Islamic courses and a digital library of books, managed from the existing admin panel.

**In scope (this plan):**

| Page | Features |
|---|---|
| **Landing** `/dawah` | Hero section · Description section · Outline of courses |
| **Courses** `/dawah/courses` | Course listings (filter/search) · Course details |
| **Library** `/dawah/library` | Book listings · **Preview content on the page** |

**Explicitly deferred:** Media Resources (video / audio). Not built now — but §4.3 shapes the lesson entity so that adding it later is *additive only* (new rows, no migration to existing tables, no API break). This is the single most important forward-compatibility decision in the plan.

**Deliberately NOT in scope** (call these out to RMC before Phase 2 — see §11): enrolment, progress tracking, quizzes, certificates, course fees/payments, instructor accounts. This is a **catalogue**, not an LMS. Building it catalogue-first is what lets it ship in weeks instead of months, and §12 documents the seam where an LMS bolts on.

---

## 2. Current-state assessment

The platform is a mature npm-workspaces monorepo. The Dawah feature is greenfield — `grep -ri "dawah|course|library"` over `apps/*/src` returns nothing — so there is no legacy to unpick, only conventions to obey.

| Layer | Reality | What Dawah reuses |
|---|---|---|
| Backend | NestJS 10 + TypeORM 0.3 + Postgres, global prefix `api/v1` | Module/controller/service/DTO layout; global `APP_GUARD`s |
| Frontend | Next.js 14 App Router, Tailwind, hand-rolled `src/components/ui/*` | `PageHero`, `Reveal`, `Modal`, `SearchableSelect`, `ImageUploadField`, `RichTextEditor` |
| i18n | next-intl, **3 locales: `en` / `rw` / `ar`** (no `fr`), RTL for Arabic | `src/messages/*.json` + tri-lingual DB columns |
| Auth | JWT; **every route authenticated by default**, `@Public()` opts out | `@Permissions(Permission.DAWAH_*)` |
| Files | Separate `file-server` on :3002; `PublicUploadService` for backend-mediated uploads | Cover images (public) + book PDFs (**protected prefix**) |
| Docs | `docs/good-conduct-service-implementation-plan.md` + `-prompts.md` | This document's own format |

**The reference module is `apps/backend/src/hajj/`** — the newest, richest, and most convention-correct module in the repo. Every backend prompt in the companion doc points at it. Do not use `src/public/` as a precedent; it is legacy (`@Roles` instead of `@Permissions`, `dto: any`).

### Three existing mechanisms this plan leans on hard

1. **Tri-lingual sibling columns.** `hajj_requirements` stores `title_en` / `title_rw` / `title_ar`, English required, others `DEFAULT ''`, with the UI falling back to English until filled (`apps/backend/src/hajj/entities/hajj-requirement.entity.ts:34-50`). Dawah copies this exactly. There is no translations table and no generic i18n abstraction — do not build one.
2. **CMS `site_content` jsonb.** Free-form landing copy is a keyed jsonb blob (`site_content.section_key` → `value`), edited under `/admin/content/*` and read publicly (`apps/frontend/src/lib/content/client.ts:34`). Dawah's hero + description are CMS; courses and books are **real tables**. §4.1 explains why the split falls there.
3. **File-server protected prefixes.** `apps/file-server/src/common/guards/jwt-auth.guard.ts:24` — `DEFAULT_PROTECTED_PREFIXES = ['hajj-proofs/', 'funeral-docs/']`, overridable via the `PROTECTED_KEY_PREFIXES` env var. Keys under a protected prefix require a JWT *even on the public serve route*. **This is the mechanism that makes "preview a book without leaking the PDF" possible without writing any new infrastructure.** See §6.

---

## 3. Architecture at a glance

```
apps/backend/src/dawah/                    apps/frontend/src/
├── dawah.module.ts                        ├── app/[locale]/dawah/
├── dawah.controller.ts        (public)    │   ├── page.tsx                 Landing
├── dawah-admin.controller.ts  (admin)     │   ├── courses/page.tsx         Listings
├── dawah-course.service.ts                │   ├── courses/[slug]/page.tsx  Detail
├── dawah-book.service.ts                  │   ├── library/page.tsx         Listings + preview
├── dawah-category.service.ts              │   └── library/[slug]/page.tsx  Permalink
├── dto/                                   ├── app/[locale]/admin/dawah/
└── entities/                              │   ├── courses/page.tsx
    ├── dawah-category.entity.ts           │   ├── library/page.tsx
    ├── dawah-course.entity.ts             │   └── categories/page.tsx
    ├── dawah-course-lesson.entity.ts      ├── app/[locale]/admin/content/dawah/page.tsx
    └── dawah-book.entity.ts               ├── components/dawah/*
                                           ├── lib/dawahApi.ts
                                           └── lib/content/dawah.ts
```

**Data-flow split:**

```
Landing hero + description  ──▶  site_content['dawah']  (jsonb, tri-lingual, CMS-edited)
Course outline on landing   ──▶  GET /dawah/courses/featured   (real table)
Courses & Library           ──▶  dawah_courses / dawah_books   (real tables)
Cover images                ──▶  file-server  dawah-covers/    (PUBLIC   — <img src> works)
Book PDFs                   ──▶  file-server  dawah-library/   (PROTECTED — backend proxy only)
```

---

## 4. Data model

### 4.1 Why courses/books are tables, not CMS jsonb

The CMS jsonb store is right for *prose that a content editor rewrites wholesale* (a hero headline). It is wrong here because courses and books need: per-record slugs and detail routes, category filtering, search, pagination, sort order, publish/draft status, per-record file attachments, and view/download counters. All of that is a query problem, and jsonb blobs cannot be queried, indexed, or paginated. **Hero + description → `site_content`. Everything with a slug → a table.**

### 4.2 `dawah_categories` — shared taxonomy

One taxonomy serves both courses and books (a "Fiqh" category should mean the same thing in both). Modelled on `blog_categories`.

```sql
CREATE TABLE "dawah_categories" (
  "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
  "slug"       varchar(80)  NOT NULL,
  "name_en"    varchar(120) NOT NULL,
  "name_rw"    varchar(120) NOT NULL DEFAULT '',
  "name_ar"    varchar(120) NOT NULL DEFAULT '',
  "icon"       varchar(40),              -- lucide-react icon name, e.g. 'BookOpen'
  "sort_order" int          NOT NULL DEFAULT 0,
  "is_active"  boolean      NOT NULL DEFAULT true,
  "created_at" timestamptz  NOT NULL DEFAULT now(),
  "updated_at" timestamptz  NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "PK_dawah_categories" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_dawah_categories_slug" UNIQUE ("slug")
);
CREATE INDEX "IDX_dawah_categories_sort" ON "dawah_categories" ("sort_order");
```

### 4.3 `dawah_courses` and `dawah_course_lessons`

```sql
CREATE TABLE "dawah_courses" (
  "id"                   uuid NOT NULL DEFAULT gen_random_uuid(),
  "slug"                 varchar(140) NOT NULL,
  "category_id"          uuid,
  "title_en"             varchar(160) NOT NULL,
  "title_rw"             varchar(160) NOT NULL DEFAULT '',
  "title_ar"             varchar(160) NOT NULL DEFAULT '',
  "summary_en"           varchar(300) NOT NULL,          -- card blurb
  "summary_rw"           varchar(300) NOT NULL DEFAULT '',
  "summary_ar"           varchar(300) NOT NULL DEFAULT '',
  "description_en"       text NOT NULL DEFAULT '',       -- rich HTML, detail page
  "description_rw"       text NOT NULL DEFAULT '',
  "description_ar"       text NOT NULL DEFAULT '',
  "level"                varchar(20) NOT NULL DEFAULT 'beginner',
  "language"             varchar(20) NOT NULL DEFAULT 'en',   -- delivery language
  "format"               varchar(20) NOT NULL DEFAULT 'self_paced',
  "cover_image_key"      varchar(500),
  "instructor_name"      varchar(150),
  "instructor_title"     varchar(150),
  "instructor_photo_key" varchar(500),
  "duration_minutes"     int,
  "lesson_count"         int NOT NULL DEFAULT 0,   -- denormalised; service maintains it
  "is_featured"          boolean NOT NULL DEFAULT false,
  "status"               varchar(20) NOT NULL DEFAULT 'draft',
  "sort_order"           int NOT NULL DEFAULT 0,
  "published_at"         timestamptz,
  "created_at"           timestamptz NOT NULL DEFAULT now(),
  "updated_at"           timestamptz NOT NULL DEFAULT now(),
  "deleted_at"           timestamptz,
  CONSTRAINT "PK_dawah_courses" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_dawah_courses_slug" UNIQUE ("slug"),
  CONSTRAINT "FK_dawah_courses_category" FOREIGN KEY ("category_id")
    REFERENCES "dawah_categories"("id") ON DELETE SET NULL,
  CONSTRAINT "CHK_dawah_course_level"  CHECK ("level"  IN ('beginner','intermediate','advanced')),
  CONSTRAINT "CHK_dawah_course_lang"   CHECK ("language" IN ('en','rw','ar','multi')),
  CONSTRAINT "CHK_dawah_course_format" CHECK ("format" IN ('self_paced','in_person','hybrid')),
  CONSTRAINT "CHK_dawah_course_status" CHECK ("status" IN ('draft','published','archived'))
);
CREATE INDEX "IDX_dawah_courses_status"   ON "dawah_courses" ("status");
CREATE INDEX "IDX_dawah_courses_category" ON "dawah_courses" ("category_id");
CREATE INDEX "IDX_dawah_courses_featured" ON "dawah_courses" ("is_featured");
```

```sql
CREATE TABLE "dawah_course_lessons" (
  "id"               uuid NOT NULL DEFAULT gen_random_uuid(),
  "course_id"        uuid NOT NULL,
  "title_en"         varchar(160) NOT NULL,
  "title_rw"         varchar(160) NOT NULL DEFAULT '',
  "title_ar"         varchar(160) NOT NULL DEFAULT '',
  "summary_en"       text NOT NULL DEFAULT '',
  "summary_rw"       text NOT NULL DEFAULT '',
  "summary_ar"       text NOT NULL DEFAULT '',
  "body_en"          text NOT NULL DEFAULT '',      -- rich HTML (text lessons)
  "body_rw"          text NOT NULL DEFAULT '',
  "body_ar"          text NOT NULL DEFAULT '',
  "content_type"     varchar(20) NOT NULL DEFAULT 'text',
  "media_key"        varchar(500),                  -- file-server key  ── PHASE 7
  "media_url"        varchar(500),                  -- external (YouTube…) ── PHASE 7
  "duration_minutes" int,
  "sort_order"       int NOT NULL DEFAULT 0,
  "is_preview"       boolean NOT NULL DEFAULT false,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "PK_dawah_course_lessons" PRIMARY KEY ("id"),
  CONSTRAINT "FK_dawah_course_lessons_course" FOREIGN KEY ("course_id")
    REFERENCES "dawah_courses"("id") ON DELETE CASCADE,
  CONSTRAINT "CHK_dawah_lesson_content_type"
    CHECK ("content_type" IN ('text','video','audio','pdf','link'))
);
CREATE INDEX "IDX_dawah_course_lessons_course_sort"
  ON "dawah_course_lessons" ("course_id", "sort_order");
```

> **⚠️ The deferred-media decision.** `content_type`, `media_key`, and `media_url` ship in Phase 1 even though nothing writes them until Phase 7. They cost three nullable columns now. Omitting them costs a migration, an API version bump, and a frontend refactor later. **Ship the columns; leave them null.** A lesson is the natural home for a video or an audio khutbah, so "Media Resources" becomes a new `content_type` value plus a player component — not a new subsystem.

### 4.4 `dawah_books` — the Library

```sql
CREATE TABLE "dawah_books" (
  "id"               uuid NOT NULL DEFAULT gen_random_uuid(),
  "slug"             varchar(140) NOT NULL,
  "category_id"      uuid,
  "title_en"         varchar(200) NOT NULL,
  "title_rw"         varchar(200) NOT NULL DEFAULT '',
  "title_ar"         varchar(200) NOT NULL DEFAULT '',
  "author"           varchar(160) NOT NULL DEFAULT '',
  "description_en"   text NOT NULL DEFAULT '',
  "description_rw"   text NOT NULL DEFAULT '',
  "description_ar"   text NOT NULL DEFAULT '',
  "language"         varchar(20) NOT NULL DEFAULT 'en',
  "cover_image_key"  varchar(500),                    -- dawah-covers/   (public)
  "file_key"         varchar(500) NOT NULL,           -- dawah-library/  (PROTECTED)
  "file_name"        varchar(255) NOT NULL,
  "file_size"        integer      NOT NULL,
  "mime_type"        varchar(100) NOT NULL DEFAULT 'application/pdf',
  "page_count"       int,
  "preview_file_key" varchar(500),                    -- optional excerpt PDF
  "visibility"       varchar(20)  NOT NULL DEFAULT 'public',
  "allow_download"   boolean      NOT NULL DEFAULT true,
  "view_count"       int NOT NULL DEFAULT 0,
  "download_count"   int NOT NULL DEFAULT 0,
  "is_featured"      boolean NOT NULL DEFAULT false,
  "status"           varchar(20) NOT NULL DEFAULT 'draft',
  "sort_order"       int NOT NULL DEFAULT 0,
  "published_at"     timestamptz,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now(),
  "deleted_at"       timestamptz,
  CONSTRAINT "PK_dawah_books" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_dawah_books_slug" UNIQUE ("slug"),
  CONSTRAINT "FK_dawah_books_category" FOREIGN KEY ("category_id")
    REFERENCES "dawah_categories"("id") ON DELETE SET NULL,
  CONSTRAINT "CHK_dawah_book_lang"       CHECK ("language" IN ('en','rw','ar','other')),
  CONSTRAINT "CHK_dawah_book_visibility" CHECK ("visibility" IN ('public','members')),
  CONSTRAINT "CHK_dawah_book_status"     CHECK ("status" IN ('draft','published','archived'))
);
CREATE INDEX "IDX_dawah_books_status"   ON "dawah_books" ("status");
CREATE INDEX "IDX_dawah_books_category" ON "dawah_books" ("category_id");
```

**The three fields that carry all the licensing policy:**

| Field | Meaning |
|---|---|
| `visibility` | `public` = anyone reads · `members` = requires a logged-in user |
| `allow_download` | `false` → the Download button is hidden **and** the download endpoint returns 403. Read-in-browser only. |
| `preview_file_key` | Optional short excerpt PDF. When set, anonymous visitors preview *this* even if the full book is `members`. |

This is the honest answer to "we have books we're allowed to show but not allowed to give away." Note plainly: `allow_download=false` is a **deterrent, not DRM** — anyone who can render a PDF can save the bytes. It stops casual redistribution. If RMC needs true DRM, that is a different (and expensive) project, and they should be told so before we imply otherwise.

---

## 5. API surface

All routes carry the global `api/v1` prefix and the `{ success, data, timestamp }` envelope (except the two file-streaming routes, which use `@Res()` and bypass it).

### 5.1 Public — `@Controller('dawah')`, every handler `@Public()`

| Method | Route | Notes |
|---|---|---|
| `GET` | `/dawah/categories` | Active categories, sorted |
| `GET` | `/dawah/courses` | `?category=&level=&language=&search=&page=&limit=` → `{ items, total, page, limit }`. **`status='published'` only.** |
| `GET` | `/dawah/courses/featured` | Landing-page "outline of courses". Declare **before** `:slug`. |
| `GET` | `/dawah/courses/:slug` | Course + ordered lessons |
| `GET` | `/dawah/books` | `?category=&language=&search=&page=&limit=` |
| `GET` | `/dawah/books/featured` | Declare **before** `:slug` |
| `GET` | `/dawah/books/:slug` | Metadata only — never the `file_key` |
| `GET` | `/dawah/books/:slug/preview` | **Streams PDF inline.** `@Res()`, `Content-Disposition: inline`. Resolution order in §6. |
| `GET` | `/dawah/books/:slug/download` | Streams as attachment; 403 if `allow_download=false`; 401 if `members` and anonymous |

> **Route-ordering rule (a real bug the repo already fixed twice):** literal paths (`/featured`) must be declared **above** parameterised ones (`/:slug`), or the param pipe swallows them. See the comments at `apps/backend/src/hajj/hajj-admin.controller.ts:60` and `:143`.

### 5.2 Admin — `@Controller('admin/dawah')`, `@ApiBearerAuth()`

Guards are global; `@Permissions()` alone gates each route.

| Method | Route | Permission |
|---|---|---|
| `GET/POST/PATCH/DELETE` | `/admin/dawah/categories[/:id]` | `DAWAH_VIEW` / `DAWAH_MANAGE` |
| `GET/POST/PATCH/DELETE` | `/admin/dawah/courses[/:id]` | `DAWAH_VIEW` / `DAWAH_MANAGE` |
| `PATCH` | `/admin/dawah/courses/:id/status` | `DAWAH_MANAGE` — draft ⇄ published ⇄ archived |
| `POST` | `/admin/dawah/courses/:id/lessons` | `DAWAH_MANAGE` |
| `PATCH`/`DELETE` | `/admin/dawah/lessons/:id` | `DAWAH_MANAGE` |
| `POST` | `/admin/dawah/courses/:id/lessons/reorder` | `DAWAH_MANAGE` — body `{ ids: string[] }` |
| `GET/POST/PATCH/DELETE` | `/admin/dawah/books[/:id]` | `DAWAH_VIEW` / `DAWAH_MANAGE` |
| `POST` | `/admin/dawah/books/upload` | `DAWAH_MANAGE` — multipart, → `dawah-library/`, returns `{ fileKey, fileName, fileSize, mimeType }` |
| `GET` | `/admin/dawah/books/:id/file` | `DAWAH_VIEW` — authenticated inline stream, for admin proofing before publish |

### 5.3 Permissions

Two new entries in `apps/backend/src/common/types/permissions.enum.ts`, matching the schools/hajj `view`/`manage` shape:

```ts
// ── Dawah Learning ──
DAWAH_VIEW   = 'dawah:view',
DAWAH_MANAGE = 'dawah:manage',
```

Granted to the `superadmin` and `admin` **role rows** by a migration that matches on `roles.slug` — **not** `roles.name`. Matching on `name` is a bug the repo has already had and fixed; copy `apps/backend/src/database/migrations/049-fix-hajj-good-conduct-permissions.ts` verbatim.

---

## 6. Book preview & download — the one genuinely novel mechanism

Everything else in this plan is pattern-matching. This is the part that needs a real decision, so it is spelled out.

**Storage split:**

| Asset | Folder | File-server treatment |
|---|---|---|
| Cover images | `dawah-covers/` | Public. Frontend uses `fileUrl(key)` directly in `<img src>`. |
| Book PDFs (full + preview) | `dawah-library/` | **Protected.** Add to `PROTECTED_KEY_PREFIXES`. Anonymous fetch of the raw key returns 401. |

Because `dawah-library/` is protected, **the only way to read a book is through the backend**, which is precisely where the visibility/download policy lives. No new infrastructure — just one entry in a list.

> ### ⛔ Add the prefix in CODE, not via the env var
>
> `PROTECTED_KEY_PREFIXES` is an **override, not an append** (`apps/file-server/src/common/guards/jwt-auth.guard.ts:36-39`: `const configured = config.get(...); prefixes = configured ? configured.split(',') : DEFAULT_PROTECTED_PREFIXES`). It is currently **unset** in `.env` and `.env.example`, so the file-server runs on its code defaults.
>
> Setting `PROTECTED_KEY_PREFIXES=dawah-library/` would therefore **replace** `['hajj-proofs/', 'funeral-docs/']` — silently un-protecting every Hajj payment proof and funeral document in the system. Nothing would appear broken. It would simply be a data breach.
>
> **Therefore: add `'dawah-library/'` to `DEFAULT_PROTECTED_PREFIXES` in the guard itself.** Leave the env var unset. If a future deployment ever *does* set it, it must enumerate all three prefixes — add a comment above the constant saying exactly that.

**`GET /dawah/books/:slug/preview` resolution order:**

```
1. Book not found or status != 'published'      → 404
2. preview_file_key is set                      → stream it (anonymous OK)
3. visibility = 'public'                        → stream file_key
4. visibility = 'members' and caller is authed  → stream file_key
5. otherwise                                    → 401, frontend shows a "Sign in to read" card
```

Implementation: fetch bytes with `PublicUploadService.fetch(fileKey)` and stream via `@Res()` with `Content-Type: application/pdf`, `Content-Disposition: inline; filename="…"`, `Cache-Control: private, no-store`. This mirrors `apps/backend/src/hajj/hajj-admin.controller.ts:175-196` exactly.

**Frontend rendering:** `<iframe src={previewUrl} />`. The repo already does this twice — `apps/frontend/src/components/drive/FilePreview.tsx:125-195` (authenticated blob → `createObjectURL` → iframe) and `apps/frontend/src/app/[locale]/tenders/[id]/page.tsx:280-380` (public overlay preview). The Library viewer is `FilePreview`'s public sibling; §Prompt 8 says to extract the shared shell rather than fork a third copy.

**Trade-off, stated plainly:** proxying every book through the backend costs backend bandwidth that a direct file-server URL would not. At RMC's traffic (a community organisation, not a MOOC) this is irrelevant, and it buys uniform policy enforcement plus accurate view/download counters. **If library traffic ever becomes a real cost centre, the escape hatch is: serve `visibility='public' AND allow_download=true` books via a direct `fileUrl()` and keep the proxy only for restricted ones.** That change is contained entirely within `dawah-book.service.ts`.

---

## 7. Frontend surface

### 7.1 Public pages

| Route | Shape | Composition |
|---|---|---|
| `/[locale]/dawah` | Server Component, `export const dynamic = 'force-dynamic'` | `Navbar` → `PageHero` (CMS) → description section (CMS) → **course outline** (`/dawah/courses/featured`) → CTA cards → `Footer` |
| `/[locale]/dawah/courses` | thin `page.tsx` + `'use client'` `CoursesPageClient` | `PageHero` → filter bar (`SearchableSelect`) → responsive `CourseCard` grid → pagination |
| `/[locale]/dawah/courses/[slug]` | Server Component (SEO: `generateMetadata`) | `PageHero` → instructor + meta strip → rich description → **lesson-outline accordion** → related courses |
| `/[locale]/dawah/library` | thin `page.tsx` + `'use client'` `LibraryPageClient` | `PageHero` → filters → `BookCard` grid → **`BookPreviewOverlay`** |
| `/[locale]/dawah/library/[slug]` | Server Component | Shareable permalink; renders the same viewer inline |

The Library's primary interaction is **click a card → full-screen preview overlay** (this is what "preview content on the page" means). The `[slug]` route exists so a book can be linked and indexed; it is not the main path.

### 7.2 Admin pages

| Route | Precedent to copy |
|---|---|
| `/[locale]/admin/dawah/courses` | `apps/frontend/src/app/[locale]/admin/schools/page.tsx` (the canonical admin CRUD, 504 lines) |
| `/[locale]/admin/dawah/courses/[id]/lessons` | Lesson builder — drag-to-reorder outline |
| `/[locale]/admin/dawah/library` | Schools page + `ImageUploadField` (cover) + a new PDF upload field |
| `/[locale]/admin/dawah/categories` | Simple table CRUD |
| `/[locale]/admin/content/dawah` | `apps/frontend/src/app/[locale]/admin/content/blog/page.tsx` — EN/RW/AR tabs + `RichTextEditor` |

Each admin page wraps in `<ProtectedRoute permissions={[Permission.DAWAH_VIEW]}>` and gates write UI on `hasPermission(Permission.DAWAH_MANAGE)`.

### 7.3 Registration checklist (easy to forget, breaks the feature if missed)

- [ ] `nav.dawah` key in **all three** of `src/messages/{en,rw,ar}.json`
- [ ] `navLinks` entry in `src/components/layout/Navbar.tsx:82`
- [ ] `NAV_ITEMS` entry in `src/components/admin/AdminSidebar.tsx:28` (`{ key, href, icon, labelKey, permission, group }`) + `admin.sidebar.dawah` message
- [ ] `DAWAH_VIEW` / `DAWAH_MANAGE` in `src/lib/permissions.ts` (frontend mirror of the backend enum)
- [ ] `dawah: 'dawah'` in `ContentKeys` (`src/lib/content/client.ts:34`)
- [ ] `DawahModule` in `apps/backend/src/app.module.ts` imports
- [ ] `dawah-library/` in `PROTECTED_KEY_PREFIXES` (env, all environments **including production**)

---

## 8. Phases & sequencing

```
        ┌── Phase 1 ── Data Foundation ────────┐  (Data Expert)      BLOCKS EVERYTHING
        │                                      ▼
        │   Phase 2 ── Backend API ────────────┐  (Senior Backend)
        │     2A catalogue  ·  2B file pipeline│
        │                                      ▼
Phase 3 ┤                        ┌── Phase 4 ── Public Frontend ──┐  (Senior Frontend)
UX Spec │  (UI/UX — PARALLEL,    │                                │
(no deps)                        └── Phase 5 ── Admin CMS ────────┤  (Senior Frontend)
        │   starts day 1)                                         ▼
        └────────────────────────────────► Phase 6 ── i18n · SEO · a11y · QA  (all roles)

                                           Phase 7 ── DEFERRED: media, enrolment
```

| Phase | Owner | Deliverable | Depends on |
|---|---|---|---|
| **1. Data Foundation** | Data Expert | Migration `052`, 4 entities, permissions enum + grant migration, category/demo seed | — |
| **2A. Catalogue API** | Senior Backend | Services, DTOs, public + admin controllers, pagination, slug generation | 1 |
| **2B. File Pipeline** | Senior Backend | `dawah-library/` protected prefix, upload endpoint, preview/download streaming, counters | 1 |
| **3. UX Spec** | UI/UX Expert | Wireframes, component inventory, tokens, RTL + a11y spec, empty/loading/error states | — (parallel from day 1) |
| **4. Public Frontend** | Senior Frontend | Landing, Courses list + detail, Library + preview overlay, `dawahApi.ts` | 2A, 2B, 3 |
| **5. Admin CMS** | Senior Frontend | Course/lesson/book/category admin, CMS landing editor, sidebar + permissions wiring | 2A, 2B, 3 |
| **6. Hardening** | All | rw/ar translations, `generateMetadata` + JSON-LD, a11y, seeded QA pass | 4, 5 |
| **7. Deferred** | — | Media resources (video/audio); enrolment + progress | 6 |

**Critical path: 1 → 2 → 4/5 → 6.** Phase 3 must start on day 1 in parallel or it becomes the bottleneck for Phases 4 and 5 — the UI/UX deliverable is an input to two engineers, not a review gate at the end.

---

## 9. Definition of done (per phase)

**Phase 1** — `npm run migrate` applies cleanly and `down()` reverts cleanly on a scratch DB; four tables exist with the exact constraints in §4; `dawah:view`/`dawah:manage` appear in `GET /api/v1/roles/permissions`; superadmin + admin role rows carry both; seed inserts categories idempotently (re-running is a no-op).

**Phase 2** — every route in §5 is live in Swagger (`/api/docs`); anonymous `GET /dawah/courses` returns only `published` rows; a `members` book returns 401 to an anonymous preview and 200 to an authed one; `allow_download=false` returns 403 on download; a raw `GET /api/v1/files/dawah-library/<key>` on the file-server returns **401** (proves the prefix is protected).

**Phase 3** — annotated wireframes for all five public views + four admin views, keyed to existing tokens (`rmc-green`, `rounded-2xl`, `PageHero`…); every state specified (loading / empty / error / no-permission / RTL); a written list naming which existing `src/components/ui/*` primitive covers each element and which must be built new.

**Phase 4** — all five public routes render in `en`, `rw`, `ar` with the Arabic RTL mirrored; a book preview opens inline; no console errors; **no hardcoded English strings**.

**Phase 5** — an admin with only `dawah:view` sees a read-only UI; `dawah:manage` can create a course, add + reorder lessons, upload a book with a cover, publish it, and see it live on the public page.

**Phase 6** — Lighthouse ≥ 90 on the three public pages; keyboard-navigable preview overlay with focus trap + Esc; all three message files complete.

---

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `dawah-library/` not among the file-server's active protected prefixes | Every book PDF is publicly downloadable by raw URL. Silent — nothing looks broken. | Add it to `DEFAULT_PROTECTED_PREFIXES` **in code** (§6), never via the env var. Phase 2B also ships a startup assertion that logs a loud error if it is absent from the resolved list. |
| Someone later sets `PROTECTED_KEY_PREFIXES` to add a prefix | The env var **overrides** rather than appends — it would un-protect `hajj-proofs/` and `funeral-docs/`. A silent breach of existing, unrelated data. | §6's boxed warning + a comment on the constant. The Phase-2 startup assertion should check for **all** expected prefixes, not just `dawah-library/`, so this failure is caught however it is introduced. |
| Large PDFs (50–100 MB) proxied through the backend | Memory spikes; `PublicUploadService.fetch()` buffers the whole file. | Cap uploads at **25 MB** in the upload DTO. If bigger books are genuinely needed, switch that one route to a streaming pipe — but do not do it speculatively. |
| Tri-lingual content authored only in English | `rw`/`ar` pages fall back to English and look broken/half-done. | English is the only required column, by design. Phase 5's admin UI shows a per-language completeness badge so gaps are visible to the content team, not discovered by users. |
| "Preview" is read as DRM | RMC believes books are protected when they are not. | Say it out loud, in writing, before Phase 2 (§4.4). |
| Scope creep into an LMS mid-build | The catalogue never ships. | §11 forces the enrolment question **before** Phase 2 starts, not during Phase 4. |

---

## 11. Decisions to confirm with RMC *before Phase 2*

These are cheap to answer now and expensive to retrofit. Phase 1 is safe to start regardless.

1. **Are courses free?** This plan assumes **yes**. A fee means a `PaymentTypeKey.DAWAH_COURSE_FEE`, an enrolment table, and IntouchPay wiring — roughly doubling Phase 2. *(The platform already has the payment rails, so this is additive, not architectural — but it is not free.)*
2. **Is enrolment coming?** If yes within 6 months, add a nullable `capacity` and `enrolment_opens_at` to `dawah_courses` in migration `052` now, so the later migration is a table-add rather than an alter of a populated table.
3. **Who authors courses?** Assumed: RMC admins via the admin panel. If external instructors need logins, that is a role + a scoped-ownership model, and it changes RBAC (§5.3).
4. **Do any library books carry copyright restrictions?** Drives whether `allow_download` defaults to `true` or `false`, and whether `preview_file_key` excerpts are mandatory. Get the list of launch titles and their licences.
5. **Certificates of completion?** If yes, the platform already generates PDF certificates (`src/lib/goodConductCertificate.ts`, pdf-lib + QR) — reusable, but it presupposes enrolment and progress.

---

## 12. Where the LMS bolts on (Phase 7+)

Documented now so the catalogue does not paint us into a corner:

- **`dawah_enrolments`** (`user_id`, `course_id`, `status`, `enrolled_at`) — a pure table-add; touches nothing above.
- **`dawah_lesson_progress`** (`user_id`, `lesson_id`, `completed_at`) — likewise.
- **Media resources** — a new `content_type` value on `dawah_course_lessons` (`video` / `audio`) plus a player component. **The columns already exist** (§4.3). Standalone media (a khutbah with no course) needs either a nullable `course_id` or a small `dawah_media` table — decide then, not now.
- **Certificates** — reuse the existing pdf-lib + QR pipeline.

Nothing in Phases 1–6 blocks any of these. That is the point of building the catalogue first.
