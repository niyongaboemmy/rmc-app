# Live Data Seed Runbook

This directory contains `seed-live-data.sql`, a data-only seed for the live PostgreSQL (Neon) database. This runbook explains how to apply it safely.

> **Note:** `seed-live-data.sql` is **gitignored** because it contains PII. Do not commit it, paste its contents, or share it outside the secured workflow.

## Prerequisites

- **Migrations first.** The live schema is migration-managed (TypeORM, `synchronize: false`). Run all pending migrations against the live database **before** seeding so every target table exists. The seed creates **no** schema.
- `psql` installed locally (or available in your run environment).
- `LIVE_DATABASE_URL` exported in your shell, pointing at the live Neon database (connection string includes credentials — treat it as a secret).
- A copy of `seed-live-data.sql` present at `apps/backend/src/database/seeds/sql/seed-live-data.sql` (obtain it through the secure channel; it is not in git).

## How to run

From the repository root:

```bash
psql "$LIVE_DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/backend/src/database/seeds/sql/seed-live-data.sql
```

- The entire seed is wrapped in a single `BEGIN`/`COMMIT`. With `ON_ERROR_STOP=1`, any error aborts the transaction and **nothing is committed** — the database is left unchanged.
- A clean run commits all rows atomically.

## What it does / doesn't do

**Does** — inserts up to **120 rows**, with tables ordered parents-before-children to satisfy foreign keys:

| Table | Rows |
| --- | --- |
| `roles` | 5 |
| `users` | 2 |
| `audit_log` | 35 |
| `provinces` | 5 |
| `districts` | 30 |
| `donation_campaigns` | 5 |
| `donations` | 17 |
| `marriage_applications` | 3 |
| `marriage_documents` | 2 |
| `marriage_status_history` | 7 |
| `site_content` | 9 |

`site_content` includes the `en` / `rw` / `ar` home-page translations.

**Doesn't:**

- Does **not** create or alter any schema (data-only — run migrations for that).
- Does **not** seed `refresh_tokens`, `password_reset_tokens`, `phone_otp_verifications`, or `migrations`. These are ephemeral auth artifacts and TypeORM's own migration ledger, and are intentionally excluded.
- Does **not** overwrite existing live rows (see below).

## Safety & PII

- This file contains **PII** (user emails, phone numbers, bcrypt password hashes, donor names/emails, marriage applicant/groom/bride/wali/witness names, national IDs, phones). Keep it out of git, logs, screenshots, and chat. It is gitignored by design.
- Every row uses `ON CONFLICT DO NOTHING`, so the seed **never updates or overwrites** an existing live row — existing data always wins.
- The seed was **dry-run-validated** against the dev schema inside a rolled-back transaction: **0 errors**. The seed columns were also diffed against the TypeORM migrations — no schema drift, no load blockers.
- Because the run is fully transactional with `ON_ERROR_STOP=1`, a partial/failed apply cannot leave the database in a half-seeded state.

## Re-running

Re-running is **safe and idempotent**. Thanks to `ON CONFLICT DO NOTHING`, already-present rows are skipped and only missing rows are inserted. Use the exact same command as above — no cleanup or flags needed between runs.

## Regenerating from the dev DB

If the dev data changes and you need a fresh seed, regenerate with `pg_dump` against the dev DB:

```bash
cd apps/backend
export PGURL="$(grep -E '^DATABASE_URL_UNPOOLED=' .env | head -1 | cut -d= -f2-)"
pg_dump "$PGURL" --data-only --column-inserts --on-conflict-do-nothing \
  --no-owner --no-privileges --no-comments \
  -t public.roles -t public.provinces -t public.districts -t public.users \
  -t public.site_content -t public.donation_campaigns -t public.donations \
  -t public.audit_log -t public.marriage_applications -t public.marriage_documents \
  -t public.marriage_status_history
```

Then strip any `\restrict`/`\unrestrict` lines (pg_dump 18+) and wrap the data in `BEGIN;`/`COMMIT;`. Add a table to the `-t` list only after confirming it has rows worth shipping; never include `migrations` (corrupts the live migration ledger) or the token tables.
