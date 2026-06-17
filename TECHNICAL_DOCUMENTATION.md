# RMC Digital Platform — Technical Documentation

**Document Owner:** Engineering Team  
**Last Updated:** 2026-06-17  
**Status:** Living Document — Phase 1 (Foundation & Auth) Complete

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [File Storage](#8-file-storage)
9. [Internationalization (i18n)](#9-internationalization-i18n)
10. [Security](#10-security)
11. [Testing Strategy](#11-testing-strategy)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Local Development Setup](#13-local-development-setup)
14. [CI/CD Pipeline](#14-cicd-pipeline)
15. [Performance Considerations](#15-performance-considerations)
16. [Feature Roadmap](#16-feature-roadmap)
17. [Quick Reference](#17-quick-reference)

---

## 1. Executive Summary

The **Rwanda Muslim Community (RMC) Digital Platform** is a full-stack, production-grade monorepo application that digitalizes member services for the Rwanda Muslim Community (RMC). It covers membership management, Islamic services (marriage, prayer times), donations, events, public content, and communications — all under a single multi-language platform.

### Current Delivery Status

| Phase | Scope | Status |
|---|---|---|
| Phase 1 | Foundation, Auth, RBAC, Marriage Service | ✅ Complete |
| Phase 2 | Digital ID, Expanded Membership | 🔄 Planned |
| Phase 3 | Additional Service Applications | 🔄 Planned |
| Phase 4 | Payments (MoMo, Bank, Stripe) | 🔄 Planned |
| Phase 5 | Donations & Fundraising | 🔄 Planned |
| Phase 6 | Events, School, SMS/Email Notifications | 🔄 Planned |
| Phase 7 | AI Assistant (Multilingual LLM) | 🔄 Planned |
| Phase 8 | Advanced Finance & Analytics | 🔄 Planned |

---

## 2. Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| NestJS | 10.0.0 | REST API framework with dependency injection |
| Node.js | 20+ | JavaScript runtime |
| TypeScript | 5.3.3 | Type-safe language for all backend code |
| TypeORM | 0.3.17 | Database ORM & migration management |
| PostgreSQL | 16 | Primary relational data store |
| Redis | 7 | Cache, session storage, job queues |
| Passport.js | 10.0.0 | Authentication strategy framework |
| JWT | — | Stateless access token authentication |
| Bcrypt | — | Password hashing (12 rounds) |
| Speakeasy | 2.0.0 | TOTP MFA (Time-based One-Time Passwords) |
| Nodemailer | 6.9.7 | SMTP email delivery |
| pdf-lib | 1.17.1 | Marriage certificate PDF generation |
| qrcode | 1.5.4 | QR code generation for certificates |
| adhan | 4.4.3 | Islamic prayer time calculations |
| class-validator | 0.14.0 | DTO validation & input sanitization |
| Helmet | 7.1.0 | HTTP security headers |
| compression | 1.7.4 | Gzip response compression |
| Swagger/OpenAPI | 7.0.0 | Interactive API documentation |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2.29 | React SSR/SSG framework |
| React | 18 | UI component library |
| TypeScript | 5.3.3 | Type-safe frontend code |
| TailwindCSS | 3 | Utility-first CSS styling |
| next-intl | 3.17.2 | i18n (English, Kinyarwanda, Arabic) |
| React Hook Form | 7.52.1 | Form state management |
| TanStack React Query | 5.51.1 | Server state management & caching |
| Axios | 1.7.2 | HTTP client with JWT interceptors |
| class-validator | 0.14.0 | Client-side DTO validation |

### File Storage Microservice

| Technology | Version | Purpose |
|---|---|---|
| NestJS | 10.0.0 | Standalone file management service |
| AWS SDK v3 | 3.x | S3-compatible object storage client |
| MinIO | — | Local S3-compatible object storage |
| AWS S3 | — | Production object storage (af-south-1) |

### Infrastructure

| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Containerization & local dev orchestration |
| GitHub Actions | CI/CD automation |
| AWS (af-south-1) | Production cloud hosting (South Africa) |
| Terraform | Infrastructure as Code (planned) |
| Prometheus + Grafana | Application monitoring (planned) |
| Loki | Log aggregation (planned) |

---

## 3. Monorepo Structure

```
rmc-app/                                  # npm workspaces monorepo
├── apps/
│   ├── backend/                          # NestJS REST API (port 3000)
│   │   ├── src/
│   │   │   ├── main.ts                   # Bootstrap: Swagger, Helmet, CORS, pipes
│   │   │   ├── app.module.ts             # Root module — imports all feature modules
│   │   │   ├── auth/                     # Authentication module
│   │   │   ├── users/                    # User account management
│   │   │   ├── members/                  # Member profile & approval workflow
│   │   │   ├── roles/                    # RBAC role management
│   │   │   ├── marriage/                 # Marriage service (applications, docs, certs)
│   │   │   ├── mosques/                  # Mosque registry & imam management
│   │   │   ├── prayer-times/             # Prayer time calculations & adjustments
│   │   │   ├── locations/                # Rwanda geographic hierarchy
│   │   │   ├── public/                   # Public content (blog, gallery, announcements)
│   │   │   ├── finance/                  # Audit logs, financial tracking
│   │   │   ├── common/                   # Shared: decorators, guards, filters, types
│   │   │   ├── config/                   # NestJS config objects (db, jwt, redis, smtp)
│   │   │   ├── database/                 # TypeORM module + 7 migration files + seeds
│   │   │   ├── redis/                    # Redis client module
│   │   │   └── health/                   # Health check endpoint
│   │   ├── test/                         # E2E tests
│   │   ├── package.json                  # NestJS dependencies; Jest 80% coverage target
│   │   ├── jest.config.js
│   │   └── nest-cli.json
│   │
│   ├── frontend/                         # Next.js React App (port 3001)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   └── [locale]/             # Locale-scoped routing
│   │   │   │       ├── (auth)/           # Login, register, forgot/reset password
│   │   │   │       ├── member/           # Member portal
│   │   │   │       ├── admin/            # Admin dashboard (members, marriage, roles, content)
│   │   │   │       ├── services/         # Service application wizards
│   │   │   │       ├── certificates/     # Certificate viewer
│   │   │   │       ├── profile/          # User profile pages
│   │   │   │       ├── about/
│   │   │   │       └── contact/
│   │   │   ├── components/
│   │   │   │   ├── layout/               # Header, footer, sidebar
│   │   │   │   ├── auth/                 # Login/register forms
│   │   │   │   ├── admin/                # Admin-specific components
│   │   │   │   ├── services/             # Multi-step service wizards (marriage, etc.)
│   │   │   │   └── ui/                   # Reusable UI primitives
│   │   │   ├── lib/
│   │   │   │   ├── api.ts                # Axios instance with JWT interceptors + auto-refresh
│   │   │   │   ├── public-api.ts         # Public endpoints (no auth)
│   │   │   │   ├── marriageApi.ts        # Marriage service API calls
│   │   │   │   ├── galleryApi.ts         # Gallery API calls
│   │   │   │   └── permissions.ts        # Permission enum (mirrors backend)
│   │   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── contexts/                 # Auth context, theme context
│   │   │   └── messages/                 # i18n translation JSON files (en, ar, rw)
│   │   ├── public/                       # Static assets
│   │   ├── next.config.js                # With next-intl plugin
│   │   ├── tailwind.config.ts
│   │   └── .env.example
│   │
│   └── file-server/                      # File storage microservice (port 3002)
│       ├── src/
│       │   ├── main.ts                   # Standalone NestJS bootstrap
│       │   ├── storage/                  # Upload, download, delete controllers & service
│       │   ├── config/                   # S3 credentials, JWT config
│       │   └── common/                   # JWT guard, roles guard, exception filter
│       └── package.json
│
├── docs/                                 # Architecture docs, ADRs, runbooks
│   ├── adr/                              # Architecture Decision Records
│   ├── infra/                            # Infrastructure runbooks
│   ├── marriage-service-implementation-plan.md
│   ├── marriage-service-gap-analysis.md
│   └── phase_1_implementation.md
│
├── documentation/
│   └── phase_1_implementation.md         # Implementation guide (P1.01–P1.18)
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                        # Lint, test, build, security scan
│   │   ├── cd-production.yml             # Production deployment pipeline
│   │   └── pr-checks.yml                 # PR validation
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
│
├── .env.example                          # Environment variable template
├── docker-compose.yml                    # Local dev: postgres, redis, minio, mailhog
├── docker-compose.test.yml               # CI test containers
├── Makefile                              # Developer commands
├── package.json                          # Workspace root
└── TECHNICAL_DOCUMENTATION.md           # This file
```

---

## 4. Architecture Overview

### System Diagram

```
                         ┌─────────────────────────────────┐
                         │         Client Browser           │
                         └────────────┬────────────────────┘
                                      │ HTTPS
                              ┌───────▼────────┐
                              │  Next.js App   │  Port 3001
                              │  (Frontend)    │
                              └──────┬──┬──────┘
                                     │  │ HTTP / Bearer JWT
                          ┌──────────▼  ▼──────────────┐
                          │      NestJS Backend API     │  Port 3000
                          │  (REST API + Swagger Docs)  │
                          └────┬────────┬───────────────┘
                               │        │
               ┌───────────────▼─┐   ┌──▼──────────────┐
               │   PostgreSQL 16  │   │    Redis 7       │
               │  (Primary DB)   │   │  (Cache/Session) │
               └─────────────────┘   └─────────────────┘
                                      │
                          ┌───────────▼─────────────┐
                          │  File Server Microservice │  Port 3002
                          │  (NestJS + S3/MinIO)     │
                          └───────────┬──────────────┘
                                      │
                          ┌───────────▼─────────────┐
                          │   S3 / MinIO Object       │
                          │   Storage (rmc-files)    │
                          └──────────────────────────┘
```

### Request Lifecycle

1. **Public Request** → Next.js SSR fetches data from Backend API → rendered HTML served to browser.
2. **Authenticated Request** → Browser sends `Authorization: Bearer <accessToken>` → `JwtAuthGuard` validates → `RolesGuard` / `PermissionsGuard` checks access → handler executes → `TransformInterceptor` wraps response.
3. **Token Expiry** → Frontend Axios interceptor catches `401` → calls `POST /auth/refresh` → replays original request with new access token transparently.
4. **File Upload** → Frontend calls File Server with JWT → File Server validates JWT (same secret as backend) → streams to S3/MinIO → returns file key → frontend stores key via backend API.

---

## 5. Database Schema

### Migration History

| File | Contents |
|---|---|
| `001-initial-schema.ts` | Users, roles, locations (provinces→districts→sectors→areas), mosques, prayer time adjustments |
| `002-phase2-tables.ts` | Member profiles, expanded user fields |
| `003-rbac.ts` | Role → permission JSONB structure |
| `004-marriage-tables.ts` | Marriage applications, documents, status history, transactions |
| `005-marriage-notification-email.ts` | Added `notification_phone` to applications |
| `006-marriage-wedding-photo.ts` | Added `wedding_photo_url` to applications |
| `007-gallery-image-versions.ts` | Added `thumbnail_key` to gallery items |

### Core User Management

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | varchar | Unique, indexed |
| `phone` | varchar | Unique, indexed, +250XXXXXXXXX format |
| `password_hash` | varchar | bcrypt, 12 rounds |
| `first_name`, `last_name` | varchar | |
| `date_of_birth` | date | |
| `gender` | varchar | |
| `profile_photo_url` | varchar | S3 file key |
| `role` | varchar | `user`, `operator`, `admin`, `superadmin` |
| `status` | varchar | `pending`, `active`, `suspended`, `inactive` |
| `member_category` | varchar | `standard`, `student`, `scholar`, `partner`, `vip` |
| `is_email_verified` | boolean | |
| `is_phone_verified` | boolean | |
| `mfa_enabled` | boolean | |
| `mfa_secret` | varchar | TOTP seed (encrypted) |
| `last_login_at` | timestamp | |
| `role_id` | UUID FK | → `roles` |
| `mosque_id` | UUID FK | → `mosques` |
| `area_id` | UUID FK | → `areas` |
| `digital_id_number` | varchar | Unique, for Phase 2 |
| `created_at`, `updated_at`, `deleted_at` | timestamp | Soft deletes |

#### `roles`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name`, `slug` | varchar | Unique slug |
| `description` | varchar | |
| `permissions` | JSONB | Array of permission strings (45+ values) |
| `is_system` | boolean | `true` for built-in roles: `admin`, `superadmin`, `operator` |

#### `member_profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID FK | 1:1 with `users` |
| `membership_number` | varchar | Unique |
| `joined_date` | date | |
| `occupation`, `education_level` | varchar | |
| `emergency_contact_name/phone` | varchar | |
| `consent_given` | boolean | |
| `approval_status` | varchar | `pending`, `approved`, `rejected` |
| `approved_by`, `approved_at` | UUID/timestamp | |
| `rejection_reason` | text | |
| `member_status` | varchar | `active`, `inactive`, `suspended`, `deceased` |
| `mosque_id`, `province_id`, `district_id`, `sector_id` | UUID FK | Geography |
| `photo_key` | varchar | S3 file key |

### Authentication Entities

#### `refresh_tokens`
- `id`, `user_id` FK, `token`, `expires_at`, `revoked` (boolean), `created_at`

#### `password_reset_tokens`
- `id`, `user_id` FK, `token` (hashed), `expires_at`, `used_at`, `created_at`

#### `phone_otp_verifications`
- `id`, `phone`, `code` (6-digit), `verified`, `attempts` (rate limiting), `expires_at`, `created_at`

### Marriage Service

#### `marriage_applications`
Primary entity for the marriage service workflow.

| Column Group | Columns |
|---|---|
| Identifiers | `id` (UUID), `application_number` (unique, indexed) |
| Applicant | `applicant_id` FK, `notification_phone` |
| Groom | `groom_name`, `groom_nid`, `groom_user_id`, `groom_phone` |
| Bride | `bride_name`, `bride_nid`, `bride_user_id`, `bride_phone` |
| Islamic Requirements | `wali_name`, `wali_nid`, `wali_phone`, `mahr_amount`, `mahr_currency`, `mahr_description` |
| Witnesses | `witness1_nid`, `witness1_name`, `witness2_nid`, `witness2_name` |
| Officiation | `requested_officiant`, `assigned_imam_id` FK |
| Venue | `venue_type` (mosque/outside), `province`, `district`, `mosque_id`, `venue_address`, `gps_lat/lng` |
| Scheduling | `preferred_date_from/to`, `ceremony_date`, `ceremony_scheduled_by/at` |
| Status | `status` ENUM (see below), `payment_status` ENUM (see below) |
| Payment | `amount_due`, `amount_paid`, `payment_method` |
| Review | `reviewed_by/at`, `review_notes`, `rejection_reason`, `amendments_requested_text` |
| Certificate | `certificate_url`, `certificate_qr_code`, `certificate_issued_at/by` |
| Photos | `wedding_photo_url` |
| Timestamps | `submitted_at`, `created_at`, `updated_at`, `deleted_at` |

**Application Statuses:** `draft` → `submitted` → `under_review` → `amendments_requested` / `approved` → `completed` / `rejected` / `cancelled` / `closed`

**Payment Statuses:** `unpaid`, `pending_cash`, `processing`, `paid`, `refunded`, `failed`

#### `marriage_documents`
- `id`, `application_id` FK (cascade), `document_type` (`groom_id`, `bride_id`, `wali_consent`, `mahr_agreement`, `portrait`, `additional`), `file_key`, `file_name`, `file_size`, `mime_type`, `verified`, `uploaded_at`

#### `marriage_status_history`
- `id`, `application_id` FK, `from_status`, `to_status`, `changed_by` FK, `notes`, `changed_at`

#### `marriage_transaction`
- `id`, `application_id` FK, `amount`, `currency`, `status` (`pending`, `completed`, `failed`), `payment_method` (`momo`, `bank`, `cash`), `payment_ref`, `created_at`, `updated_at`

### Geographic Hierarchy

```
provinces → districts → sectors → areas
```

- **provinces:** `id`, `name`, `code`
- **districts:** `id`, `name`, `code`, `province_id` FK
- **sectors:** `id`, `name`, `district_id` FK
- **areas:** `id`, `name`, `sector_id`, `district_id` FK

### Mosque Management

#### `mosques`
- `id`, `name`, `parent_mosque_id` (self-referencing hierarchy)
- `address`, `gps_lat/lng` (decimal 10,8 / 11,8)
- `province_id`, `district_id`, `sector_id` FK
- `capacity`, `founding_year`, `phone`, `email`, `friday_prayer_time`
- `status` (`active`, `inactive`), `created_at`, `updated_at`

#### `mosque_imams`
- `id`, `mosque_id` FK, `user_id` FK, `designation`, `assigned_at`, `status`

#### `prayer_time_adjustments`
- `id`, `mosque_id` FK, `prayer_name` (fajr/sunrise/dhuhr/asr/maghrib/isha), `adjustment_minutes`, `effective_from/to`, `created_at`, `updated_at`

### Public Content

#### `announcements`
- `id`, `title`, `content`, `status` (`draft`, `published`), `created_by`, `published_at`, `expires_at`

#### `blog_posts`
- `id`, `title`, `slug` (unique), `content`, `category`, `featured_image_key`, `author_id`, `status`, `published_at`

#### `gallery_items`
- `id`, `title`, `description`, `file_key`, `thumbnail_key`, `category`, `display_order`, `created_by`

#### `verse_of_day`
- `id`, `arabic_text`, `english_text`, `kinyarwanda_text`, `source` (Quran or Hadith), `created_by`

### Audit & Finance

#### `audit_logs`
- `id`, `entity_type`, `entity_id`, `action` (`create`, `update`, `delete`, `approve`, `reject`), `user_id`, `role`, `old_values` (JSONB), `new_values` (JSONB), `ip_address`, `user_agent`, `created_at`

---

## 6. API Reference

All endpoints share the base path `/api/v1/`. Full interactive docs available at `GET /api/docs` (Swagger UI).

### Auth — `POST /api/v1/auth/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create user account |
| POST | `/login` | — | Authenticate; returns access + refresh tokens |
| POST | `/refresh` | — | Rotate refresh token |
| POST | `/send-otp` | — | Send SMS OTP |
| POST | `/verify-phone` | — | Verify phone with OTP |
| POST | `/forgot-password` | — | Initiate password reset |
| POST | `/reset-password` | — | Set new password with reset token |
| POST | `/mfa/setup` | JWT | Enable TOTP MFA |
| POST | `/mfa/verify` | JWT | Verify TOTP code |
| POST | `/mfa/disable` | JWT | Disable MFA |
| POST | `/logout` | JWT | Revoke refresh token |
| PUT | `/profile` | JWT | Update user profile |
| POST | `/change-password` | JWT | Change password |

### Users — `/api/v1/users/`

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| GET | `/` | admin+ | List users (paginated) |
| POST | `/` | admin+ | Create user manually |
| GET | `/:id` | admin+ | Get user details |
| PUT | `/:id` | admin+ | Update user |
| PUT | `/:id/role` | superadmin | Assign/change role |
| PUT | `/:id/status` | admin+ | Change user status |
| DELETE | `/:id` | superadmin | Soft-delete user |

### Members — `/api/v1/members/`

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| POST | `/register` | JWT | Submit member registration |
| GET | `/` | operator+ | List members with filters |
| GET | `/stats` | operator+ | Member statistics |
| GET | `/me` | JWT | Get own member profile |
| GET | `/:id` | operator+ | Get member by ID |
| PUT | `/:id/approve` | admin+ | Approve member |
| PUT | `/:id/status` | admin+ | Change member status |
| GET | `/:id/id-card` | JWT | Download digital ID card |

### Marriage (Member) — `/api/v1/marriage/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/applications/draft` | JWT | Create draft application |
| PUT | `/applications/:id/draft` | JWT | Update draft (partial save) |
| POST | `/applications/:id/submit` | JWT | Submit application → status: submitted |
| POST | `/applications/:id/documents` | JWT | Attach document reference |
| POST | `/applications/:id/cancel` | JWT | Cancel application |
| GET | `/applications` | JWT | List own applications |
| GET | `/applications/:id` | JWT | Get own application details |
| GET | `/applications/by-number/:num` | — | Get by application number (public) |
| GET | `/public/verify/:appNumber` | — | QR code certificate verification |

### Marriage (Admin) — `/api/v1/marriage-admin/`

| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| GET | `/applications` | `marriage:manage` | List all applications (paginated) |
| GET | `/applications/:id` | `marriage:manage` | Get application details |
| PATCH | `/applications/:id/status` | `marriage:approve` | Change status |
| POST | `/applications/:id/schedule` | `marriage:assign_imam` | Schedule ceremony |
| POST | `/applications/:id/certificate` | `marriage:certificate` | Generate & issue PDF certificate |
| GET | `/applications/:id/documents` | `marriage:manage` | List attached documents |
| GET | `/stats` | `marriage:reports` | Statistics by status, revenue |
| GET | `/reports/export` | `marriage:reports` | Export as CSV/Excel |

### Mosques — `/api/v1/mosques/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List all active mosques (public) |
| POST | `/` | admin+ | Create mosque |
| GET | `/:id` | — | Get mosque details (public) |
| PUT | `/:id` | admin+ | Update mosque |
| POST | `/:id/imams` | `mosques:manage_imams` | Assign imam |
| GET | `/:id/imams` | — | List mosque imams (public) |
| DELETE | `/:id/imams/:imamId` | `mosques:manage_imams` | Remove imam |

### Prayer Times — `/api/v1/prayer-times/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Today's prayer times (calculated by adhan lib) |
| GET | `/by-mosque/:mosqueId` | — | Prayer times for a specific mosque |
| GET | `/by-location/:lat/:lng` | — | Prayer times for GPS coordinates |
| POST | `/:mosqueId/adjustments` | `prayer_times:manage` | Set time offset for a mosque |
| GET | `/:mosqueId/adjustments` | — | Get mosque adjustments |

### Locations — `/api/v1/locations/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/provinces` | — | List all provinces |
| GET | `/provinces/:id/districts` | — | Districts in a province |
| GET | `/districts/:id/sectors` | — | Sectors in a district |
| GET | `/sectors/:id/areas` | — | Areas in a sector |

### Public Content — `/api/v1/public/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/verse-of-day` | — | Daily Quran/Hadith verse |
| POST | `/verse-of-day` | admin+ | Create verse |
| GET | `/announcements` | — | Active announcements |
| POST | `/announcements` | admin+ | Create announcement |
| GET | `/blog/posts` | — | Published posts (paginated) |
| GET | `/blog/categories` | — | Post categories |
| GET | `/blog/posts/:slug` | — | Get post by slug |
| POST | `/blog/posts` | operator+ | Create post |
| GET | `/gallery` | — | Gallery items |
| POST | `/gallery` | admin+ | Upload gallery image |

### Roles — `/api/v1/roles/`

| Method | Endpoint | Required Role | Description |
|---|---|---|---|
| GET | `/` | superadmin | List roles |
| POST | `/` | superadmin | Create role |
| GET | `/:id` | superadmin | Get role details |
| PUT | `/:id` | superadmin | Update role & permissions |
| DELETE | `/:id` | superadmin | Delete role (non-system only) |

### File Server — `/api/v1/files/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/upload` | JWT | Multipart file upload |
| POST | `/presigned-upload` | JWT | Get presigned S3 upload URL |
| GET | `/:key` | JWT | Download file (redirect to S3) |
| POST | `/presigned-download/:key` | JWT | Get presigned download URL (1-hour expiry) |
| DELETE | `/:key` | JWT | Delete file |

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | — | Returns DB + Redis + disk connectivity status |

---

## 7. Authentication & Authorization

### Strategy: JWT Bearer + Refresh Token Rotation

```
┌──────────────────────────────────────────────────────────────────┐
│  1. REGISTER                                                      │
│     POST /auth/register { email, phone, password, name }          │
│     → bcrypt hash password (12 rounds)                            │
│     → create User + MemberProfile                                 │
│     → send welcome email                                          │
│                                                                   │
│  2. PHONE VERIFICATION                                            │
│     POST /auth/send-otp { phone }                                 │
│     → 6-digit code, 5-minute expiry, SMS delivery                 │
│     POST /auth/verify-phone { phone, code }                       │
│     → marks user.is_phone_verified = true                         │
│                                                                   │
│  3. LOGIN                                                         │
│     POST /auth/login { email | phone, password, mfaCode? }        │
│     → validate credentials (bcrypt compare)                       │
│     → if MFA enabled → return { mfaRequired: true }              │
│     → generate JWT pair:                                          │
│          accessToken  — 15 min expiry                             │
│          refreshToken — 7 days expiry                             │
│     → store refreshToken in DB + Redis                            │
│     → return { accessToken, refreshToken, user }                  │
│                                                                   │
│  4. AUTHENTICATED REQUESTS                                        │
│     Authorization: Bearer <accessToken>                           │
│     → JwtAuthGuard validates signature                            │
│     → JwtStrategy.validate(payload) → injects user object         │
│     → @CurrentUser() decorator in handler                         │
│                                                                   │
│  5. TOKEN REFRESH (auto via Axios interceptor)                    │
│     On 401 → POST /auth/refresh { refreshToken }                  │
│     → validate, issue NEW pair (rotation — old token revoked)     │
│     → replay original request with new accessToken                │
│                                                                   │
│  6. LOGOUT                                                        │
│     POST /auth/logout { refreshToken }                            │
│     → mark token revoked in DB + Redis                            │
└──────────────────────────────────────────────────────────────────┘
```

### JWT Payload

```typescript
{
  sub: string;           // User UUID
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;          // user | operator | admin | superadmin
  permissions: string[]; // ["members:view", "marriage:manage", ...]
  iat: number;
  exp: number;           // 15 minutes from issue
}
```

### Guard Chain (Global APP_GUARD — Applied to All Routes)

1. **JwtAuthGuard** — Validates JWT signature. Skipped on routes decorated with `@Public()`.
2. **RolesGuard** — Checks `user.role` against `@Roles()` decorator on the handler.
3. **PermissionsGuard** — Checks granular `permissions[]` against `@RequiresPermissions()` decorator.

### Role Hierarchy

```
SUPERADMIN  ←  full system access + all permissions
    ↓
ADMIN       ←  user/role/finance management, all reports
    ↓
OPERATOR    ←  content management, marriage admin, member management
    ↓
USER        ←  self-service: marriage applications, profile, certificates
```

### Permissions System (45+ strings, stored as JSONB in `roles`)

| Category | Permissions |
|---|---|
| `users:*` | `view`, `create`, `edit`, `delete`, `assign_role` |
| `roles:*` | `view`, `create`, `edit`, `delete` |
| `members:*` | `view`, `create`, `edit`, `delete`, `approve`, `id_card` |
| `mosques:*` | `view`, `create`, `edit`, `delete`, `manage_imams` |
| `prayer_times:*` | `view`, `manage` |
| `content:*` | `view`, `create`, `edit`, `delete` |
| `finance:*` | `view`, `manage` |
| `reports:*` | `view`, `export` |
| `marriage:*` | `view`, `manage`, `approve`, `assign_imam`, `certificate`, `reports` |
| `system:*` | `settings` |
| `audit_log:view` | |

---

## 8. File Storage

### Architecture

```
Frontend
  │
  ├─→ File Server (port 3002)   [JWT auth, same secret as backend]
  │         │
  │         └─→ S3 / MinIO
  │
  └─→ Presigned URL (direct S3 read — no file server hop needed)
```

### Upload Flow
1. Frontend sends `multipart/form-data` to `POST /api/v1/files/upload` with Bearer token.
2. File Server validates JWT, streams file to S3/MinIO.
3. Returns `file_key` (e.g., `marriages/{appId}/groom_id.pdf`).
4. Frontend stores `file_key` in backend via the relevant entity endpoint.

### Download Flow
1. Frontend requests `POST /api/v1/files/presigned-download/:key`.
2. File Server generates a 1-hour presigned S3 URL.
3. Frontend redirects browser to presigned URL — no file server proxy needed for content.

### S3 Bucket Organization

```
rmc-files/
├── marriages/{appId}/
│   ├── groom_id.pdf
│   ├── bride_id.pdf
│   ├── wali_consent.pdf
│   ├── certificate.pdf        ← Generated via pdf-lib
│   ├── certificate.png        ← QR code image
│   └── wedding_photo.jpg
├── members/{userId}/
│   └── profile_photo.jpg
├── blog/{postId}/
│   └── featured_image.jpg
└── gallery/{itemId}/
    ├── original.jpg
    ├── thumbnail_200.jpg
    └── thumbnail_500.jpg
```

### Configuration

```env
S3_ENDPOINT=http://localhost:9000   # MinIO (dev) or https://s3.af-south-1.amazonaws.com (prod)
S3_BUCKET_NAME=rmc-platform-uploads
AWS_REGION=af-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

- `forcePathStyle=true` for MinIO, `false` for AWS S3.

---

## 9. Internationalization (i18n)

### Framework: `next-intl`

| Locale | Language | Notes |
|---|---|---|
| `en` | English | Default / fallback |
| `rw` | Kinyarwanda | National language |
| `ar` | Arabic | RTL layout via TailwindCSS |

### Implementation

- Routes are scoped to `[locale]` segment: `/en/admin/marriage`, `/ar/services/marriage`.
- `i18n.ts` configures locale detection and routing.
- Translation files at `src/messages/{en,ar,rw}.json`.
- Components use `useTranslations('namespace')` hook.
- RTL languages (Arabic) detected and `dir="rtl"` applied on root layout.

```tsx
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const t = useTranslations('auth');
  return <button>{t('login.submit')}</button>;
}
```

---

## 10. Security

### Transport & HTTP
- **CORS** — Origin whitelist via `FRONTEND_URL` env var
- **Helmet.js** — Sets secure HTTP headers (HSTS, CSP, X-Frame-Options, etc.)
- **CSRF** — SameSite cookie attribute
- **Rate Limiting** — 100 req/min globally; 10 req/sec on auth endpoints

### Authentication Security
- JWT access tokens: 15-minute expiry
- Refresh token rotation: old token revoked on every renewal
- Bcrypt hashing: 12 rounds (configurable via `BCRYPT_ROUNDS`)
- Phone OTP: 6-digit, 5-minute expiry, max 3 attempts
- Password reset tokens: hashed, 15-minute expiry
- TOTP MFA: optional per user, enforced for sensitive operations

### Input Security
- `ValidationPipe` with `whitelist: true` — strips undeclared properties
- `class-validator` DTOs on all endpoints — rejects malformed input
- TypeORM parameterized queries — SQL injection prevention

### Data Protection
- Soft deletes (`deleted_at` timestamp) — no permanent data loss
- Audit log records every create/update/delete/approve with IP and user agent
- File access via time-limited presigned URLs (1-hour expiry)
- Secrets in `.env` — never committed to repository

### Infrastructure Security
- PostgreSQL SSL connections in production
- Redis TLS in production
- Docker image scanning via Trivy (CI blocks on CRITICAL findings)
- Dependency scanning via `npm audit` (CI blocks on critical vulnerabilities)

---

## 11. Testing Strategy

### Unit Tests

- **Framework:** Jest 29.7.0
- **Coverage Target:** 80% (lines, functions, branches, statements) — enforced in CI
- **Location:** `*.spec.ts` files co-located with source
- **Run:** `npm run test` (watch: `npm run test:watch`)

Key test files:
- `auth.service.spec.ts` — registration, login, JWT generation
- `permissions.guard.spec.ts` — permission string matching
- `roles.guard.spec.ts` — role hierarchy enforcement

### E2E / Integration Tests

- **Framework:** Jest + SuperTest
- **Config:** `test/jest-e2e.json`
- **Runs against:** full Docker stack (PostgreSQL + Redis + API)
- **Run:** `npm run test:e2e`

### Frontend Tests

- **Framework:** Jest + React Testing Library
- **Location:** `**/__tests__`, `**/*.spec.tsx`
- **Run:** `npm run test` in `apps/frontend`

### CI Test Execution

```bash
# Spins up test containers, runs migrations, executes tests, tears down
docker compose -f docker-compose.yml -f docker-compose.test.yml up --exit-code-from backend
```

---

## 12. Infrastructure & Deployment

### Production Stack (AWS af-south-1)

| Component | Service |
|---|---|
| Compute | EC2 instances with Docker + Docker Compose |
| Database | RDS PostgreSQL 16 (automated backups) |
| Cache | ElastiCache Redis 7 |
| Object Storage | S3 with CloudFront CDN |
| Load Balancing | ALB (Application Load Balancer) |
| Infrastructure as Code | Terraform (planned) |
| Monitoring | Prometheus + Grafana (planned) |
| Logging | Loki (planned) |
| Error Tracking | Sentry (optional, via `SENTRY_DSN`) |

### Environment Variables

```bash
# Application
NODE_ENV=production
APP_PORT=3000
APP_URL=https://api.rmc.org.rw
FRONTEND_URL=https://rmc.org.rw

# Database
DATABASE_URL=postgresql://rmc_user:password@host:5432/rmc_db
DATABASE_HOST=
DATABASE_PORT=5432
DATABASE_NAME=rmc_db
DATABASE_USER=rmc_user
DATABASE_PASSWORD=

# Redis
REDIS_URL=redis://:password@host:6379
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (generate: openssl rand -hex 64)
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRY=7d

# Auth
BCRYPT_ROUNDS=12
OTP_EXPIRY_MINUTES=5
PASSWORD_RESET_EXPIRY_MINUTES=15
MFA_APP_NAME=RMC Platform

# SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@rmc.org.rw

# S3 / AWS
AWS_REGION=af-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=rmc-platform-uploads
S3_ENDPOINT=                      # Leave blank for AWS S3

# Sentry (optional)
SENTRY_DSN=
```

### Deployment Checklist

- [ ] All tests passing (lint, unit, e2e)
- [ ] No critical vulnerabilities (npm audit, Trivy)
- [ ] All environment variables configured
- [ ] Database migrations reviewed and tested
- [ ] Swagger documentation up to date
- [ ] Load / performance testing completed
- [ ] Security review completed
- [ ] Backup strategy documented
- [ ] Monitoring alerts configured

### Rollback Procedure

```bash
git revert <commit-hash>
git push origin main
# CD pipeline re-runs, deploying previous version automatically
```

---

## 13. Local Development Setup

### Prerequisites

- Node.js 20+
- Docker + Docker Compose v2
- npm 10+

### Quickstart

```bash
# Clone repository
git clone <repo-url>
cd rmc-app

# Install all workspace dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your local values

# Start full local stack (PostgreSQL, Redis, MinIO, MailHog)
make up
# Or: docker compose up -d

# Run database migrations
make migrate
# Or: npm run migration:run --workspace=apps/backend

# Load seed data (provinces, roles, default mosques)
make seed

# Start backend (port 3000)
npm run dev --workspace=apps/backend

# Start frontend (port 3001)
npm run dev --workspace=apps/frontend

# Start file server (port 3002)
npm run dev --workspace=apps/file-server
```

### Local Service URLs

| Service | URL | Credentials |
|---|---|---|
| Frontend | http://localhost:3001 | — |
| Backend API | http://localhost:3000/api/v1 | — |
| Swagger Docs | http://localhost:3000/api/docs | — |
| File Server Docs | http://localhost:3002/api/docs | — |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| MailHog (email) | http://localhost:8025 | — |
| PostgreSQL | localhost:5432 / rmc_db | rmc_user / password |
| Redis | localhost:6379 | from .env |

### Makefile Commands

```bash
make up           # Start all Docker containers
make down         # Stop all containers
make logs         # Follow container logs
make rebuild      # Rebuild images and restart
make test         # Run full test suite
make db-shell     # Open psql session
make redis-cli    # Open redis-cli session
make migrate      # Run pending TypeORM migrations
make migrate-rev  # Revert last migration
make seed         # Load reference data
make clean        # ⚠️  Delete all data and volumes
```

---

## 14. CI/CD Pipeline

### `ci.yml` — Continuous Integration

Triggered on: push to `feature/*`, `develop`; PRs targeting `develop` or `main`.

```
Step 1 — Lint          [~5 min]
├── ESLint (backend + frontend)
└── Prettier formatting check

Step 2 — Test Backend  [~15 min]
├── Jest unit tests
├── 80% coverage threshold enforced
└── Coverage uploaded to Codecov

Step 3 — Test Frontend [~10 min]
└── Jest component tests

Step 4 — Build Docker Images [~15 min]
├── backend.Dockerfile
├── frontend.Dockerfile
└── file-server.Dockerfile (with layer caching)

Step 5 — Security Scan [~10 min]
├── npm audit (exits on CRITICAL)
└── Trivy image vulnerability scan (exits on CRITICAL)

Step 6 — Deploy to Staging [~10 min] (on merge to develop)
├── SSH to staging host
├── Pull latest code
├── docker compose pull && up -d
├── Run migrations
└── Health check: GET /api/v1/health
```

### `cd-production.yml` — Continuous Deployment

Triggered manually or on `main` branch tag push.

```
1. Build & push images to GHCR
2. SSH to production host
3. Pull new images
4. Blue-green deployment (zero downtime)
5. Run migrations
6. Health checks
7. Slack notification
```

### Branch Strategy (GitFlow)

```
main          ← production; tagged releases (v1.x.x)
    ↑
release/v1.x  ← release prep
    ↑
develop       ← integration; auto-deploys to staging
    ↑
feature/TICKET-123-description   ← development branches
hotfix/TICKET-456-description    ← urgent production fixes
```

---

## 15. Performance Considerations

### Backend
- Database indexes on all FK columns, `email`, `phone`, `status`, `application_number`
- TypeORM eager loading to prevent N+1 queries
- Redis caching for prayer times, location lists, and mosque data
- PostgreSQL connection pooling
- Gzip via `compression` middleware
- Default pagination: 50 records per page

### Frontend
- Next.js ISR (Incremental Static Regeneration) for public pages (blog, gallery, announcements)
- TanStack React Query for client-side caching and background refetching
- Route-based code splitting (automatic with Next.js)
- Next.js `Image` component for optimized image delivery
- TailwindCSS JIT for minimal CSS bundle

### Database
- Soft deletes excluded via `where: { deleted_at: IsNull() }` — no full table scans
- Archival strategy planned for high-volume tables (marriage_status_history, audit_logs)

---

## 16. Feature Roadmap

| Phase | Features | Timeline |
|---|---|---|
| **Phase 1** ✅ | Auth, RBAC, Marriage Service, Member Management, Public Content | Complete |
| **Phase 2** | Digital ID card, Member approval workflow, Member categories | Q3 2026 |
| **Phase 3** | 7+ additional service application types | Q4 2026 |
| **Phase 4** | Mobile Money (MoMo), bank transfer, Stripe payments | Q4 2026 |
| **Phase 5** | Donation campaigns, orphan sponsorship, finance reporting | Q1 2027 |
| **Phase 6** | Event management, school administration, SMS/email notifications | Q2 2027 |
| **Phase 7** | AI assistant (multilingual LLM, pgvector embeddings) | Q3 2027 |
| **Phase 8** | Advanced analytics, business intelligence dashboard | Q4 2027 |

---

## 17. Quick Reference

### Key Source Files

| File | Purpose |
|---|---|
| [apps/backend/src/main.ts](apps/backend/src/main.ts) | Bootstrap: Swagger, Helmet, CORS, global pipes/guards |
| [apps/backend/src/auth/auth.service.ts](apps/backend/src/auth/auth.service.ts) | Core authentication logic |
| [apps/backend/src/common/guards/jwt-auth.guard.ts](apps/backend/src/common/guards/jwt-auth.guard.ts) | JWT validation guard |
| [apps/backend/src/common/guards/roles.guard.ts](apps/backend/src/common/guards/roles.guard.ts) | Role-based access guard |
| [apps/backend/src/common/types/permissions.enum.ts](apps/backend/src/common/types/permissions.enum.ts) | All 45+ permission strings |
| [apps/backend/src/database/migrations/](apps/backend/src/database/migrations/) | All 7 schema migrations |
| [apps/backend/src/config/data-source.ts](apps/backend/src/config/data-source.ts) | TypeORM DataSource (for CLI migrations) |
| [apps/frontend/src/lib/api.ts](apps/frontend/src/lib/api.ts) | Axios instance with JWT auto-refresh interceptors |
| [apps/frontend/src/app/[locale]/](apps/frontend/src/app/%5Blocale%5D/) | All frontend routes |
| [.env.example](.env.example) | Complete environment variable template |
| [Makefile](Makefile) | All developer commands |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | CI/CD pipeline definition |

### Migration Commands

```bash
# Generate migration from entity changes
npm run migration:generate -- -d src/config/data-source.ts -n MigrationName

# Apply pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show pending migrations
npm run migration:pending
```

### Useful Debug Commands

```bash
# View logs for a specific service
docker compose logs -f backend

# Open PostgreSQL shell
make db-shell

# Open Redis CLI
make redis-cli

# Re-run seeds
make seed

# Full reset (WARNING: destroys all data)
make clean && make up && make migrate && make seed
```

---

*This document is maintained by the engineering team. For changes, open a PR against `main` and update this file alongside the code changes.*
