# RMC Digital Platform — Phase 1: Claude Code Implementation Prompts

> **Project:** Rwanda Muslim Community (RMC) Digital Platform  
> **Phase:** 1 — Environment & Foundation Setup  
> **Stack:** NestJS · Next.js · PostgreSQL 16 · Redis 7 · Docker · GitHub Actions  
> **Usage:** Feed each prompt block to Claude Code in sequence. Each prompt is self-contained and includes context, acceptance criteria, and test requirements.  
> **Convention:** Complete and verify each prompt's acceptance criteria before moving to the next.

---

## HOW TO USE THIS FILE

Each section is a **standalone Claude Code prompt**. Copy the entire block between the `---` dividers and paste it into Claude Code. Claude Code will:

1. Read the context and constraints
2. Generate the implementation
3. Write the required tests
4. You verify against the acceptance criteria before proceeding

Prompts are ordered by dependency. Never skip ahead.

---

## PROMPT INDEX

| #     | Prompt Title                                   | Sprint   | Dependencies | Est. Effort |
| ----- | ---------------------------------------------- | -------- | ------------ | ----------- |
| P1.01 | Repository & GitFlow Setup                     | Sprint 1 | None         | 30 min      |
| P1.02 | Docker Compose — Full Local Stack              | Sprint 1 | P1.01        | 1 hr        |
| P1.03 | CI/CD Pipeline — GitHub Actions                | Sprint 1 | P1.01, P1.02 | 1 hr        |
| P1.04 | NestJS Project Scaffold                        | Sprint 2 | P1.01, P1.02 | 45 min      |
| P1.05 | PostgreSQL Database Schema — All Tables        | Sprint 2 | P1.04        | 3 hr        |
| P1.06 | Auth Module — Registration & Login             | Sprint 2 | P1.05        | 2 hr        |
| P1.07 | Auth Module — JWT, Refresh Tokens & Logout     | Sprint 2 | P1.06        | 1.5 hr      |
| P1.08 | Auth Module — OTP Phone Verification           | Sprint 2 | P1.07        | 1 hr        |
| P1.09 | Auth Module — Password Reset Flow              | Sprint 2 | P1.07        | 1 hr        |
| P1.10 | Auth Module — TOTP MFA (speakeasy)             | Sprint 2 | P1.07        | 1 hr        |
| P1.11 | RBAC — Guards, Decorators & Role Hierarchy     | Sprint 2 | P1.06        | 1.5 hr      |
| P1.12 | Swagger / OpenAPI Documentation                | Sprint 2 | P1.06–P1.11  | 45 min      |
| P1.13 | Next.js Frontend Scaffold + i18n + RTL         | Sprint 2 | P1.01, P1.02 | 2 hr        |
| P1.14 | Integration Test Suite — Auth Endpoints        | Sprint 2 | P1.06–P1.11  | 2 hr        |
| P1.15 | AWS Infrastructure — Terraform Scripts         | Post-AWS | P1.02        | 3 hr        |
| P1.16 | AWS Deployment — Nginx + SSL + Staging Deploy  | Post-AWS | P1.15        | 2 hr        |
| P1.17 | Monitoring Stack — Prometheus + Grafana + Loki | Post-AWS | P1.16        | 2 hr        |
| P1.18 | Database Backup — S3 Automated Backup          | Post-AWS | P1.15        | 1 hr        |

---

---

## P1.01 — Repository & GitFlow Setup

**Sprint:** 1 — Week 1  
**Owner:** Tech Lead  
**Story:** INFRA-006  
**Blocked on AWS:** No — execute immediately

### Context

Set up the GitHub repository with a strict GitFlow branching strategy, branch protection rules, PR templates, and a CODEOWNERS file. This is the foundation all other work depends on. Everything written in subsequent prompts will be committed to this repository.

### Requirements

Create the following repository structure:

```
rmc-platform/
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # Next.js app
├── infra/
│   ├── terraform/        # AWS IaC (Prompt P1.15)
│   ├── docker/           # Dockerfiles
│   └── nginx/            # Nginx config templates
├── docs/
│   ├── adr/              # Architecture Decision Records
│   └── infra/            # Infrastructure runbooks
├── .github/
│   ├── workflows/        # GitHub Actions CI/CD
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── docker-compose.yml
├── docker-compose.test.yml
├── .env.example
└── README.md
```

### Branching Strategy (GitFlow)

Create and protect these branches:

- `main` — production-ready code only. Requires 2 approvals. No direct push. Requires passing CI.
- `develop` — integration branch. Requires 1 approval. No direct push. Requires passing CI.
- `staging` — mirrors what is deployed to staging. Auto-updated by CI/CD.
- Feature branches use pattern: `feature/<ticket-id>-short-description`
- Hotfix branches use pattern: `hotfix/<ticket-id>-short-description`
- Release branches use pattern: `release/v<major>.<minor>.<patch>`

### Files to Create

**`.github/PULL_REQUEST_TEMPLATE.md`:**

```markdown
## Summary

<!-- What does this PR do? -->

## Related Story / Ticket

<!-- JIRA/GitHub Issue link -->

Ticket:

## Type of Change

- [ ] Feature
- [ ] Bug Fix
- [ ] Infrastructure
- [ ] Refactor
- [ ] Documentation

## Testing

- [ ] Unit tests written and passing
- [ ] Integration tests passing (if applicable)
- [ ] Tested locally with docker compose up
- [ ] Code coverage ≥ 80% on modified modules

## Checklist

- [ ] Code reviewed by at least 1 senior developer
- [ ] No critical/high security vulnerabilities (npm audit / Trivy)
- [ ] API endpoints documented in Swagger (if applicable)
- [ ] .env.example updated (if new env vars added)
- [ ] No hardcoded secrets or credentials
- [ ] Multilingual strings added to i18n files (if UI changes)
```

**`.github/CODEOWNERS`:**

```
# Global owners
* @tech-lead @project-manager

# Infrastructure & DevOps
infra/ @devops-engineer @tech-lead
docker-compose*.yml @devops-engineer
.github/workflows/ @devops-engineer @tech-lead

# Backend
apps/backend/ @backend-lead @tech-lead

# Frontend
apps/frontend/ @frontend-lead @tech-lead

# Database migrations
apps/backend/src/database/migrations/ @db-engineer @tech-lead
```

**`docs/adr/ADR-001-technology-stack.md`** — Document the rationale for NestJS, Next.js, PostgreSQL, AWS, Redis, Docker choices. Include: alternatives considered, decision, consequences.

**`.env.example`** — Populate with all environment variables needed across all Phase 1 services (no values, only keys with comments):

```env
# Application
NODE_ENV=development
APP_PORT=3000
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://rmc_user:password@localhost:5432/rmc_db
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=rmc_db
DATABASE_USER=rmc_user
DATABASE_PASSWORD=

# Redis
REDIS_URL=redis://:password@localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRY=7d

# MFA / TOTP
MFA_APP_NAME=RMC Platform

# Email (MailHog in dev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@rmc.org.rw

# AWS (populated when AWS access granted)
AWS_REGION=af-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=rmc-platform-uploads
S3_ENDPOINT=http://localhost:9000  # MinIO for local dev

# MinIO (local S3 replacement)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=
MINIO_ENDPOINT=http://localhost:9000

# Sentry (error tracking)
SENTRY_DSN=

# App secrets
BCRYPT_ROUNDS=12
OTP_EXPIRY_MINUTES=5
PASSWORD_RESET_EXPIRY_MINUTES=15
```

**`README.md`** — Include: project overview, tech stack, prerequisites (Node 20+, Docker, Docker Compose v2), quick start (clone → copy .env.example → docker compose up), repository structure, branching guide, and links to docs/.

### Acceptance Criteria

- [ ] Repository created with all folders and files above
- [ ] `main`, `develop`, `staging` branches exist
- [ ] Branch protection rules set on `main` (2 approvals) and `develop` (1 approval)
- [ ] PR template renders correctly when opening a PR
- [ ] CODEOWNERS file is valid (no syntax errors)
- [ ] ADR-001 is complete with rationale, alternatives, decision, and consequences
- [ ] `.env.example` contains all keys with descriptive comments, zero values
- [ ] README renders correctly on GitHub with working section links
- [ ] Tech Lead confirms structure before any code is written

---

---

## P1.02 — Docker Compose — Full Local Stack

**Sprint:** 1 — Week 1  
**Owner:** DevOps Engineer  
**Story:** INFRA-008  
**Blocked on AWS:** No — execute immediately

### Context

Create a complete Docker Compose configuration for local development. Every developer must be able to run `docker compose up` and have the entire RMC platform stack running locally in under 10 minutes, with no manual setup steps beyond copying `.env.example`.

### Services to Include

| Service      | Image                              | Port                       | Purpose                            |
| ------------ | ---------------------------------- | -------------------------- | ---------------------------------- |
| `backend`    | Custom Dockerfile (Node 20 Alpine) | 3000                       | NestJS API                         |
| `frontend`   | Custom Dockerfile (Node 20 Alpine) | 3001                       | Next.js app                        |
| `postgres`   | postgres:16-alpine                 | 5432                       | Primary database                   |
| `redis`      | redis:7-alpine                     | 6379                       | Token store, queues, caching       |
| `mailhog`    | mailhog/mailhog                    | 1025 (SMTP), 8025 (UI)     | Email testing                      |
| `minio`      | minio/minio                        | 9000 (API), 9001 (Console) | Local S3 replacement               |
| `minio-init` | minio/mc                           | —                          | Creates default buckets on startup |

### Implementation Requirements

**`docker-compose.yml`** (development):

- All services use named volumes for data persistence
- Backend and frontend containers use bind mounts for hot reload (`./apps/backend:/app`, `./apps/frontend:/app`)
- `node_modules` must be excluded from bind mounts via anonymous volume (`/app/node_modules`)
- Services depend_on with `condition: service_healthy` where applicable
- All services have health checks defined
- Use a single Docker network: `rmc-network` (bridge)
- Environment variables loaded from `.env` file

**`docker-compose.test.yml`** (CI / automated testing):

- Same services but no bind mounts (full image copy)
- Postgres and Redis use `tmpfs` mounts (no disk persistence, faster)
- Backend runs in test mode (`NODE_ENV=test`)
- Extends `docker-compose.yml` using the `extends` keyword

**`infra/docker/backend.Dockerfile`**:

```dockerfile
# Multi-stage: builder + production runner
# Stage 1 (builder): node:20-alpine, install all deps, build NestJS
# Stage 2 (runner): node:20-alpine, copy dist + node_modules (prod only)
# Dev target: single stage with nodemon/ts-node for hot reload
# CRITICAL: Run as non-root user (uid 1001)
```

**`infra/docker/frontend.Dockerfile`**:

```dockerfile
# Multi-stage: deps + builder + runner (Next.js standalone output)
# Stage 1 (deps): install dependencies
# Stage 2 (builder): build Next.js with NEXT_TELEMETRY_DISABLED=1
# Stage 3 (runner): node:20-alpine, copy standalone output
# Dev target: single stage with next dev for hot reload
# CRITICAL: Run as non-root user (uid 1001)
```

**MinIO bucket initialisation** — `minio-init` container must create:

- `rmc-uploads` bucket (private, for user uploads)
- `rmc-public` bucket (public read, for profile photos and public assets)

**Health checks:**

- PostgreSQL: `pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB`
- Redis: `redis-cli -a $$REDIS_PASSWORD ping`
- Backend: `wget -qO- http://localhost:3000/health || exit 1`
- MinIO: `curl -f http://localhost:9000/minio/health/live`

### Developer Experience Requirements

Create a `Makefile` at the root with these targets:

```makefile
up          # docker compose up -d
down        # docker compose down
logs        # docker compose logs -f
restart     # docker compose restart
rebuild     # docker compose up -d --build
test        # docker compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit
db-shell    # connect to postgres psql
redis-cli   # connect to redis-cli
migrate     # run TypeORM migrations
migrate-rev # revert last migration
seed        # run database seeders
clean       # docker compose down -v (removes volumes)
```

### Acceptance Criteria

- [ ] `docker compose up -d` starts all 7 services with zero errors
- [ ] All health checks pass within 60 seconds of startup
- [ ] Hot reload works: editing a backend `.ts` file reflects in < 3 seconds without container restart
- [ ] Hot reload works: editing a frontend `.tsx` file reflects in < 3 seconds
- [ ] `http://localhost:3000/health` returns `{"status":"ok"}`
- [ ] `http://localhost:3001` returns the Next.js app
- [ ] `http://localhost:8025` shows MailHog UI
- [ ] `http://localhost:9001` shows MinIO console (login with `.env` credentials)
- [ ] A new developer on a clean machine can run: `git clone → cp .env.example .env → make up` and have everything running in < 10 minutes
- [ ] `make test` runs and exits cleanly
- [ ] Stopping and restarting preserves postgres data (volume persistence)
- [ ] `make clean` removes all volumes and resets state

---

---

## P1.03 — CI/CD Pipeline — GitHub Actions

**Sprint:** 1 — Week 1–2  
**Owner:** DevOps Engineer  
**Story:** INFRA-007  
**Blocked on AWS:** Partially — lint/test/build/scan stages execute now; deploy-to-staging stage is written but disabled until AWS is ready

### Context

Build the full CI/CD pipeline in GitHub Actions. The pipeline runs on every push to `feature/*` and `develop` branches. The deploy-to-staging job is written now but gated behind a manual `workflow_dispatch` trigger or an environment variable flag — it activates automatically once AWS is configured.

### Pipeline Architecture

```
Push to feature/* or develop
        │
        ▼
┌─────────────┐
│   LINT      │  ESLint + Prettier check (backend + frontend)
└──────┬──────┘
       │ pass
       ▼
┌─────────────┐
│   TEST      │  Unit tests (Jest) — backend + frontend in parallel
└──────┬──────┘
       │ pass
       ▼
┌─────────────┐
│   BUILD     │  Docker image build (backend + frontend)
└──────┬──────┘
       │ pass
       ▼
┌─────────────┐
│  SECURITY   │  npm audit (0 critical) + Trivy image scan (0 critical CVEs)
└──────┬──────┘
       │ pass (on develop branch only)
       ▼
┌─────────────┐
│  DEPLOY     │  SSH deploy to staging EC2 (DISABLED until AWS ready)
│  STAGING    │  Condition: secrets.AWS_CONFIGURED == 'true'
└─────────────┘
```

### Files to Create

**`.github/workflows/ci.yml`** — Main CI pipeline:

```yaml
# Triggers: push to feature/*, develop; PR to develop, main
# Jobs:
#   lint: runs eslint and prettier --check on both apps
#   test-backend: runs Jest unit tests, uploads coverage to Codecov
#   test-frontend: runs Jest/Vitest unit tests
#   build: builds Docker images, tags with git SHA
#   security: npm audit --audit-level=critical; Trivy scan on built images
#   deploy-staging: SSH to EC2, pull images, docker compose up
#     condition: github.ref == 'refs/heads/develop' && secrets.AWS_CONFIGURED == 'true'

# Requirements:
# - Jobs run in parallel where possible (lint, test-backend, test-frontend simultaneously)
# - Build job waits for all test and lint jobs
# - Security job waits for build
# - Cache node_modules between runs (actions/cache with package-lock.json hash)
# - Upload test coverage as artifact
# - Fail fast on any job failure
# - Timeout: each job max 15 minutes
```

**`.github/workflows/cd-production.yml`** — Production deploy (manual only):

```yaml
# Trigger: workflow_dispatch (manual) or push tag v*.*.*
# Jobs:
#   deploy-production: SSH to production EC2, rolling deploy with health check
#   notify: Slack/email notification on success or failure
# Requires: manual approval from 2 reviewers (GitHub Environments protection rule)
```

**`.github/workflows/pr-checks.yml`** — PR validation:

```yaml
# Triggers: pull_request to develop or main
# Jobs:
#   label-check: verify PR has required labels
#   size-check: warn if PR diff > 500 lines
#   conventional-commits: validate commit message format
#   danger: run Danger.js for automated PR review comments
```

### ESLint & Prettier Configuration

**`apps/backend/.eslintrc.js`:**

- Extends: `@nestjs/eslint-config`
- Rules: `no-console` (warn), `no-unused-vars` (error), `@typescript-eslint/explicit-function-return-type` (warn)
- Ignore: `dist/`, `coverage/`, `*.spec.ts` for return-type rule

**`apps/frontend/.eslintrc.js`:**

- Extends: `next/core-web-vitals`
- Rules: `no-console` (warn), `react/no-unescaped-entities` (error)

**`.prettierrc`** (root, shared):

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

### GitHub Secrets to Document

Create `docs/infra/github-secrets.md` listing all required secrets:

| Secret Name          | Description                       | Set When         |
| -------------------- | --------------------------------- | ---------------- |
| `AWS_CONFIGURED`     | Set to `'true'` when AWS is ready | On AWS access    |
| `STAGING_HOST`       | EC2 staging server IP/hostname    | On AWS provision |
| `STAGING_SSH_KEY`    | Private key for staging EC2       | On AWS provision |
| `PRODUCTION_HOST`    | EC2 production server IP/hostname | Pre-launch       |
| `PRODUCTION_SSH_KEY` | Private key for production EC2    | Pre-launch       |
| `CODECOV_TOKEN`      | Codecov upload token              | On Codecov setup |
| `SLACK_WEBHOOK_URL`  | Slack notifications webhook       | On comms setup   |

### Acceptance Criteria

- [ ] Push to `feature/*` triggers lint + test + build + security jobs
- [ ] All 4 stages pass on a clean codebase
- [ ] Lint fails correctly when a lint error is introduced (verify this manually)
- [ ] Test job fails correctly when a test fails (verify this manually)
- [ ] Trivy scan runs and reports 0 critical CVEs on the base images
- [ ] `npm audit` runs and reports 0 critical vulnerabilities
- [ ] Node modules are cached — second run is at least 40% faster than first
- [ ] Test coverage artifact is uploaded and viewable in Actions run
- [ ] Deploy-to-staging job exists in YAML but does NOT execute (condition blocks it)
- [ ] `docs/infra/github-secrets.md` documents all secrets with descriptions

---

---

## P1.04 — NestJS Project Scaffold

**Sprint:** 2 — Week 3  
**Owner:** Backend Developer  
**Story:** Foundation for AUTH-001 through RBAC-001  
**Blocked on AWS:** No

### Context

Scaffold the NestJS backend application with all global configuration, middleware, interceptors, guards, and module structure in place. This is the application shell that all auth and future modules plug into.

### Project Setup

```bash
# Inside apps/backend/
nest new . --package-manager npm --strict
```

### Required Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10",
    "@nestjs/core": "^10",
    "@nestjs/platform-express": "^10",
    "@nestjs/config": "^3",
    "@nestjs/typeorm": "^10",
    "@nestjs/jwt": "^10",
    "@nestjs/passport": "^10",
    "@nestjs/swagger": "^7",
    "@nestjs/throttler": "^5",
    "@nestjs/bull": "^10",
    "typeorm": "^0.3",
    "pg": "^8",
    "ioredis": "^5",
    "passport": "^0.7",
    "passport-jwt": "^4",
    "passport-local": "^1",
    "bcrypt": "^5",
    "speakeasy": "^2",
    "qrcode": "^1",
    "class-validator": "^0.14",
    "class-transformer": "^0.5",
    "helmet": "^7",
    "compression": "^1",
    "uuid": "^9",
    "dayjs": "^1"
  },
  "devDependencies": {
    "@types/bcrypt": "^5",
    "@types/speakeasy": "^2",
    "@types/qrcode": "^1",
    "@types/passport-jwt": "^4",
    "@types/passport-local": "^1",
    "@types/uuid": "^9",
    "@types/compression": "^1",
    "jest": "^29",
    "@types/jest": "^29",
    "ts-jest": "^29",
    "supertest": "^6",
    "@types/supertest": "^6"
  }
}
```

### Module Structure

```
src/
├── main.ts                          # Bootstrap, global pipes, Swagger
├── app.module.ts                    # Root module
├── app.controller.ts                # Health check endpoint
├── config/
│   ├── app.config.ts                # App configuration factory
│   ├── database.config.ts           # TypeORM configuration factory
│   ├── jwt.config.ts                # JWT configuration factory
│   └── redis.config.ts              # Redis configuration factory
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── public.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── types/
│       ├── jwt-payload.interface.ts
│       └── response.interface.ts
├── database/
│   ├── database.module.ts
│   └── migrations/                  # TypeORM migration files
├── auth/                            # Prompt P1.06–P1.10
├── users/                           # User entity and service (for auth)
└── health/
    └── health.controller.ts
```

### Global Configuration in `main.ts`

```typescript
// Apply globally:
// 1. ValidationPipe with: whitelist: true, forbidNonWhitelisted: true, transform: true
// 2. HttpExceptionFilter
// 3. TransformInterceptor (wraps all responses in { success, data, timestamp })
// 4. LoggingInterceptor (logs request method, path, duration, status)
// 5. Helmet (security headers)
// 6. Compression
// 7. CORS: origin from FRONTEND_URL env var, credentials: true
// 8. Swagger: enabled only when NODE_ENV !== 'production'
//    - Title: "RMC Digital Platform API"
//    - Description: "Rwanda Muslim Community REST API"
//    - Version: "1.0"
//    - Path: /api/docs
//    - BearerAuth scheme named 'access-token'
// 9. Global prefix: /api/v1
// 10. Throttler (rate limiting): 100 req/min default, applied globally
```

### Standard API Response Format

All endpoints must return this shape:

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-06-01T10:00:00.000Z"
}

// Error
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials",
    "details": []   // validation errors array if applicable
  },
  "timestamp": "2026-06-01T10:00:00.000Z"
}
```

Implement `TransformInterceptor` to wrap success responses and `HttpExceptionFilter` to wrap errors in this format. Define an `ErrorCodes` enum in `common/types/` for all application error codes.

### Health Check

`GET /api/v1/health` must return:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "version": "1.0.0",
    "environment": "development",
    "timestamp": "2026-06-01T10:00:00.000Z",
    "services": {
      "database": "ok",
      "redis": "ok"
    }
  }
}
```

The health check must actually ping the database and Redis — it is used by Docker health check and monitoring.

### TypeORM Configuration

```typescript
// database.config.ts
// - type: 'postgres'
// - url: process.env.DATABASE_URL
// - entities: ['dist/**/*.entity.js']
// - migrations: ['dist/database/migrations/*.js']
// - migrationsRun: false (run manually via CLI)
// - synchronize: false (ALWAYS — never in production)
// - logging: ['error', 'warn'] in production; ['query', 'error'] in development
// - ssl: { rejectUnauthorized: false } when NODE_ENV === 'production'
// - poolSize: 10
```

Add TypeORM CLI config in `package.json` scripts:

```json
{
  "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/config/data-source.ts",
  "migration:run": "typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts",
  "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/config/data-source.ts"
}
```

### Acceptance Criteria

- [ ] `npm run start:dev` starts the backend without errors in Docker Compose
- [ ] `GET http://localhost:3000/api/v1/health` returns `{"success":true,"data":{"status":"ok",...}}`
- [ ] Health check shows `"database":"ok"` and `"redis":"ok"` when both services are running
- [ ] Health check shows `"database":"error"` when postgres container is stopped (verify manually)
- [ ] All responses are wrapped in the standard `{ success, data, timestamp }` format
- [ ] Errors return `{ success: false, error: { code, message, details } }`
- [ ] Swagger UI is accessible at `http://localhost:3000/api/docs`
- [ ] `ValidationPipe` rejects requests with unknown fields (`forbidNonWhitelisted: true`)
- [ ] Helmet security headers are present on all responses (check with curl -I)
- [ ] Unit test for `AppController.getHealth()` passes: `npm test`

---

---

## P1.05 — PostgreSQL Database Schema — All Tables

**Sprint:** 2 — Week 3  
**Owner:** Database Engineer + Tech Lead  
**Story:** DB-001  
**Blocked on AWS:** No — targets local Docker PostgreSQL

### Context

Design and implement the COMPLETE PostgreSQL database schema for all 8 phases of the RMC platform via TypeORM entities and migrations. The schema must be comprehensive enough to support all features without major structural changes in later phases. All changes must go through TypeORM migrations — never `synchronize: true`.

### Critical Rules

- All tables use UUID primary keys (`uuid_generate_v4()` — enable `pgcrypto` extension)
- All tables have `created_at` and `updated_at` timestamps (TypeORM `@CreateDateColumn`, `@UpdateDateColumn`)
- Soft deletes on all main entities (`deleted_at` nullable timestamp, TypeORM `@DeleteDateColumn`)
- All foreign keys have explicit constraint names following pattern: `FK_<table>_<column>`
- All indexes have explicit names following pattern: `IDX_<table>_<column(s)>`
- All enum values stored as `varchar` (not postgres ENUM type — easier migrations)
- Audit log table uses `TIMESTAMPTZ` and is append-only (no updates, no deletes)

### Entities to Create (Phase 1–8 coverage)

Create TypeORM entity files and a single initial migration. Group entities by domain:

#### Domain: Users & Auth

```typescript
// users table
id: uuid PK
national_id: varchar(16) UNIQUE nullable    // Rwanda National ID
email: varchar(255) UNIQUE NOT NULL
phone: varchar(20) UNIQUE NOT NULL
password_hash: varchar(255) NOT NULL
first_name: varchar(100) NOT NULL
last_name: varchar(100) NOT NULL
date_of_birth: date nullable
gender: varchar(10) nullable                // 'male' | 'female'
profile_photo_url: varchar(500) nullable
role: varchar(20) NOT NULL DEFAULT 'user'  // 'superadmin'|'admin'|'operator'|'user'
status: varchar(20) NOT NULL DEFAULT 'pending' // 'active'|'inactive'|'suspended'|'pending'|'deceased'
member_category: varchar(20) DEFAULT 'standard' // 'standard'|'student'|'scholar'|'partner'|'vip'
is_email_verified: boolean DEFAULT false
is_phone_verified: boolean DEFAULT false
mfa_enabled: boolean DEFAULT false
mfa_secret: varchar(100) nullable           // Encrypted TOTP secret
last_login_at: timestamptz nullable
mosque_id: uuid FK → mosques.id nullable
area_id: uuid FK → areas.id nullable
digital_id_number: varchar(20) UNIQUE nullable
Indexes: email, phone, national_id, role, status, mosque_id, area_id

// refresh_tokens table
id: uuid PK
user_id: uuid FK → users.id NOT NULL
token_hash: varchar(64) NOT NULL            // SHA-256 of token
expires_at: timestamptz NOT NULL
revoked_at: timestamptz nullable
ip_address: varchar(45) nullable
user_agent: text nullable
Indexes: token_hash, user_id, expires_at

// password_reset_tokens table
id: uuid PK
user_id: uuid FK → users.id NOT NULL
token_hash: varchar(64) NOT NULL
expires_at: timestamptz NOT NULL
used_at: timestamptz nullable
Indexes: token_hash

// phone_otp_verifications table
id: uuid PK
user_id: uuid FK → users.id NOT NULL
phone: varchar(20) NOT NULL
otp_hash: varchar(64) NOT NULL
expires_at: timestamptz NOT NULL
verified_at: timestamptz nullable
attempts: integer DEFAULT 0
Indexes: user_id, phone
```

#### Domain: Locations & Mosques

```typescript
// provinces table
id: uuid PK
name: varchar(100) NOT NULL UNIQUE
code: varchar(10) NOT NULL UNIQUE

// districts table
id: uuid PK
name: varchar(100) NOT NULL
code: varchar(10) NOT NULL UNIQUE
province_id: uuid FK → provinces.id NOT NULL

// sectors table
id: uuid PK
name: varchar(100) NOT NULL
district_id: uuid FK → districts.id NOT NULL

// areas table (logical grouping for RMC)
id: uuid PK
name: varchar(100) NOT NULL
sector_id: uuid FK → sectors.id nullable
district_id: uuid FK → districts.id nullable

// mosques table
id: uuid PK
name: varchar(200) NOT NULL
parent_mosque_id: uuid FK → mosques.id nullable    // Branch hierarchy
address: text nullable
gps_lat: decimal(10,8) nullable
gps_lng: decimal(11,8) nullable
province_id: uuid FK → provinces.id nullable
district_id: uuid FK → districts.id nullable
sector_id: uuid FK → sectors.id nullable
capacity: integer nullable
founding_year: integer nullable
phone: varchar(20) nullable
email: varchar(255) nullable
friday_prayer_time: time nullable
status: varchar(20) DEFAULT 'active'
Indexes: parent_mosque_id, district_id, status

// mosque_imams table
id: uuid PK
mosque_id: uuid FK → mosques.id NOT NULL
user_id: uuid FK → users.id NOT NULL
is_primary: boolean DEFAULT false
start_date: date NOT NULL
end_date: date nullable
Indexes: mosque_id, user_id
```

#### Domain: Members

```typescript
// member_profiles table (extends users with member-specific data)
id: uuid PK
user_id: uuid FK → users.id UNIQUE NOT NULL
membership_number: varchar(20) UNIQUE NOT NULL   // Auto-generated: RMC-YYYY-XXXXXX
joined_date: date NOT NULL
occupation: varchar(100) nullable
education_level: varchar(50) nullable
emergency_contact_name: varchar(100) nullable
emergency_contact_phone: varchar(20) nullable
consent_given: boolean DEFAULT false
consent_date: timestamptz nullable
notes: text nullable
```

#### Domain: Services

```typescript
// service_applications table (base for all 7 services)
id: uuid PK
application_number: varchar(30) UNIQUE NOT NULL
service_type: varchar(30) NOT NULL  // 'marriage'|'funeral'|'conduct'|'hijra'|'scholarship'|'tender'|'job'
applicant_id: uuid FK → users.id NOT NULL
status: varchar(20) DEFAULT 'pending'  // 'pending'|'reviewing'|'approved'|'rejected'|'cancelled'
payment_status: varchar(20) DEFAULT 'unpaid'  // 'unpaid'|'paid'|'refunded'|'waived'
amount_due: decimal(12,2) nullable
amount_paid: decimal(12,2) nullable
submitted_at: timestamptz NOT NULL
reviewed_by: uuid FK → users.id nullable
reviewed_at: timestamptz nullable
review_notes: text nullable
certificate_url: varchar(500) nullable
certificate_qr_code: varchar(100) nullable   // Unique verification code
Indexes: service_type, applicant_id, status, payment_status, certificate_qr_code

// service_documents table
id: uuid PK
application_id: uuid FK → service_applications.id NOT NULL
document_type: varchar(50) NOT NULL
file_url: varchar(500) NOT NULL
file_name: varchar(255) NOT NULL
file_size: integer NOT NULL
uploaded_at: timestamptz NOT NULL
```

#### Domain: Payments

```typescript
// transactions table
id: uuid PK
reference: varchar(50) UNIQUE NOT NULL    // Internal reference
external_reference: varchar(100) nullable  // Provider's reference
application_id: uuid FK → service_applications.id nullable
donation_id: uuid FK → donations.id nullable
user_id: uuid FK → users.id NOT NULL
provider: varchar(20) NOT NULL  // 'momo'|'bk'|'stripe'|'cash'
type: varchar(20) NOT NULL      // 'payment'|'refund'
amount: decimal(12,2) NOT NULL
currency: varchar(3) DEFAULT 'RWF'
status: varchar(20) DEFAULT 'pending'  // 'pending'|'successful'|'failed'|'refunded'
initiated_at: timestamptz NOT NULL
completed_at: timestamptz nullable
webhook_received_at: timestamptz nullable
idempotency_key: varchar(100) UNIQUE NOT NULL
metadata: jsonb nullable
Indexes: reference, external_reference, user_id, status, provider, idempotency_key
```

#### Domain: Donations

```typescript
// donation_campaigns table
id: uuid PK
title: varchar(200) NOT NULL
slug: varchar(200) UNIQUE NOT NULL
description: text NOT NULL
target_amount: decimal(14,2) NOT NULL
raised_amount: decimal(14,2) DEFAULT 0
currency: varchar(3) DEFAULT 'RWF'
fund_type: varchar(20) DEFAULT 'general'  // 'general'|'zakat'|'orphan'|'education'
start_date: date NOT NULL
end_date: date nullable
hero_image_url: varchar(500) nullable
status: varchar(20) DEFAULT 'active'
created_by: uuid FK → users.id NOT NULL
Indexes: slug, status, fund_type

// donations table
id: uuid PK
campaign_id: uuid FK → donation_campaigns.id nullable
donor_id: uuid FK → users.id nullable      // Null for anonymous
is_anonymous: boolean DEFAULT false
amount: decimal(12,2) NOT NULL
currency: varchar(3) DEFAULT 'RWF'
frequency: varchar(20) DEFAULT 'once'  // 'once'|'monthly'|'quarterly'|'annual'
next_charge_date: date nullable
is_active: boolean DEFAULT true
message: text nullable
donated_at: timestamptz NOT NULL
Indexes: campaign_id, donor_id, frequency, is_active

// orphan_profiles table
id: uuid PK
name: varchar(100) NOT NULL
photo_url: varchar(500) nullable
date_of_birth: date NOT NULL
background_story: text nullable
monthly_sponsorship_cost: decimal(10,2) NOT NULL
sponsor_id: uuid FK → users.id nullable
sponsored_since: date nullable
status: varchar(20) DEFAULT 'available'  // 'available'|'sponsored'
```

#### Domain: Events

```typescript
// events table
id: uuid PK
title: varchar(200) NOT NULL
description: text nullable
event_type: varchar(50) NOT NULL
start_datetime: timestamptz NOT NULL
end_datetime: timestamptz nullable
location_name: varchar(200) nullable
location_address: text nullable
mosque_id: uuid FK → mosques.id nullable
capacity: integer nullable
registration_deadline: timestamptz nullable
image_url: varchar(500) nullable
status: varchar(20) DEFAULT 'upcoming'  // 'upcoming'|'ongoing'|'completed'|'cancelled'
created_by: uuid FK → users.id NOT NULL
Indexes: start_datetime, status, mosque_id

// event_registrations table
id: uuid PK
event_id: uuid FK → events.id NOT NULL
user_id: uuid FK → users.id NOT NULL
qr_code: varchar(100) UNIQUE NOT NULL
attended: boolean DEFAULT false
attended_at: timestamptz nullable
registered_at: timestamptz NOT NULL
UNIQUE constraint: (event_id, user_id)
```

#### Domain: Communications

```typescript
// announcements table
id: uuid PK
title: varchar(200) NOT NULL
content: text NOT NULL
priority: varchar(10) DEFAULT 'normal'  // 'low'|'normal'|'high'|'urgent'
target_audience: varchar(20) DEFAULT 'all'  // 'all'|'area'|'mosque'|'category'
target_id: uuid nullable               // area_id or mosque_id if targeted
publish_at: timestamptz NOT NULL
expires_at: timestamptz nullable
is_published: boolean DEFAULT false
broadcast_sent: boolean DEFAULT false
created_by: uuid FK → users.id NOT NULL

// notifications table
id: uuid PK
user_id: uuid FK → users.id NOT NULL
type: varchar(50) NOT NULL
channel: varchar(10) NOT NULL           // 'in_app'|'sms'|'email'|'push'
title: varchar(200) NOT NULL
body: text NOT NULL
is_read: boolean DEFAULT false
read_at: timestamptz nullable
metadata: jsonb nullable
sent_at: timestamptz nullable
Indexes: user_id, is_read, type
```

#### Domain: Finance

```typescript
// income_records table
id: uuid PK
source: varchar(50) NOT NULL           // 'donation'|'service_fee'|'other'
reference_id: uuid nullable             // transaction_id or donation_id
fund_type: varchar(20) NOT NULL         // 'general'|'zakat'|'orphan'|'education'
amount: decimal(12,2) NOT NULL
currency: varchar(3) DEFAULT 'RWF'
recorded_at: timestamptz NOT NULL
recorded_by: uuid FK → users.id NOT NULL
notes: text nullable

// expense_records table
id: uuid PK
category: varchar(50) NOT NULL
fund_type: varchar(20) NOT NULL
amount: decimal(12,2) NOT NULL
currency: varchar(3) DEFAULT 'RWF'
vendor: varchar(100) nullable
description: text NOT NULL
receipt_url: varchar(500) nullable
status: varchar(20) DEFAULT 'pending'   // 'pending'|'approved'|'rejected'
approved_by: uuid FK → users.id nullable
approved_at: timestamptz nullable
second_approver_id: uuid FK → users.id nullable
second_approved_at: timestamptz nullable
recorded_at: timestamptz NOT NULL
recorded_by: uuid FK → users.id NOT NULL

// audit_log table (APPEND ONLY — no updates, no deletes ever)
id: uuid PK
entity_type: varchar(50) NOT NULL
entity_id: uuid NOT NULL
action: varchar(20) NOT NULL            // 'create'|'update'|'delete'|'approve'|'reject'
actor_id: uuid FK → users.id NOT NULL
actor_role: varchar(20) NOT NULL
old_values: jsonb nullable
new_values: jsonb nullable
ip_address: varchar(45) nullable
user_agent: text nullable
performed_at: timestamptz NOT NULL      // NOT NULL — no default, always passed explicitly
Indexes: entity_type, entity_id, actor_id, performed_at
Note: No updated_at, no deleted_at — this table is immutable
```

#### Domain: Schools

```typescript
// schools table
id: uuid PK
name: varchar(200) NOT NULL
mosque_id: uuid FK → mosques.id nullable
district_id: uuid FK → districts.id nullable
principal_id: uuid FK → users.id nullable
phone: varchar(20) nullable
email: varchar(255) nullable
founding_year: integer nullable
status: varchar(20) DEFAULT 'active'

// school_classes table
id: uuid PK
school_id: uuid FK → schools.id NOT NULL
name: varchar(100) NOT NULL
level: varchar(50) NOT NULL
academic_year: varchar(10) NOT NULL    // e.g. '2025-2026'
teacher_id: uuid FK → users.id nullable
schedule: jsonb nullable               // { days: [], time: '' }

// student_enrollments table
id: uuid PK
user_id: uuid FK → users.id NOT NULL
school_id: uuid FK → schools.id NOT NULL
class_id: uuid FK → school_classes.id NOT NULL
enrollment_date: date NOT NULL
status: varchar(20) DEFAULT 'active'
UNIQUE: (user_id, class_id, academic_year)
```

#### Domain: AI / Knowledge Base

```typescript
// knowledge_base_entries table
id: uuid PK
title: varchar(300) NOT NULL
content: text NOT NULL
category: varchar(50) NOT NULL
language: varchar(5) DEFAULT 'en'      // 'en'|'rw'|'ar'
tags: varchar[] nullable
embedding: vector(1536) nullable       // pgvector (enable after pg_vector extension)
is_active: boolean DEFAULT true
created_by: uuid FK → users.id NOT NULL
Indexes: category, language, is_active

// ai_chat_sessions table
id: uuid PK
user_id: uuid FK → users.id nullable   // Null for anonymous
session_token: varchar(100) UNIQUE NOT NULL
expires_at: timestamptz NOT NULL
message_count: integer DEFAULT 0
Indexes: session_token, user_id

// ai_messages table
id: uuid PK
session_id: uuid FK → ai_chat_sessions.id NOT NULL
role: varchar(10) NOT NULL             // 'user'|'assistant'
content: text NOT NULL
language: varchar(5) nullable
feedback: varchar(10) nullable         // 'positive'|'negative'
created_at: timestamptz NOT NULL
Indexes: session_id
```

### Migration Requirements

Create `src/database/migrations/001-initial-schema.ts`:

- Enable extensions: `pgcrypto`, `uuid-ossp` (for `gen_random_uuid()`)
- Create all tables in dependency order (no FK violations)
- Add all indexes
- Include `down()` method that drops all tables in reverse order
- Note: `pgvector` extension for AI embeddings is added in Phase 6 migration — include a comment placeholder

Create `src/database/seeds/01-provinces-districts.seed.ts`:

- Seed all 5 Rwanda provinces: Kigali City, Northern, Southern, Eastern, Western
- Seed all 30 districts
- This data is reference data needed by the application from day one

### Acceptance Criteria

- [ ] `npm run migration:run` applies migration without errors on local Docker PostgreSQL
- [ ] `npm run migration:revert` rolls back cleanly — no orphaned tables or constraints
- [ ] `npm run migration:run` after revert re-applies successfully (idempotent cycle)
- [ ] All 30+ tables exist in the database after migration
- [ ] All FK constraints are enforced (test: try inserting user with non-existent mosque_id → must fail)
- [ ] Soft delete works: deleting a user sets `deleted_at` and excludes from default queries
- [ ] `audit_log` table has no `updated_at` or `deleted_at` columns
- [ ] UUID primary keys are generated correctly (not null after insert)
- [ ] Province and district seed data is present (5 provinces, 30 districts)
- [ ] Tech Lead + BA review and sign off on schema before any auth code is written

---

---

## P1.06 — Auth Module — Registration & Login

**Sprint:** 2 — Week 3  
**Owner:** Backend Developer  
**Story:** AUTH-001, AUTH-002  
**Blocked on AWS:** No

### Context

Implement user registration and login endpoints. This is the entry point for all RMC users. Input validation must be strict. Passwords use bcrypt (12 rounds). Registration sends a welcome email via MailHog (local) and triggers phone OTP verification.

### Endpoints

#### `POST /api/v1/auth/register`

**Request DTO (`RegisterDto`):**

```typescript
{
  email: string          // IsEmail, MaxLength(255), ToLowerCase transform
  phone: string          // Matches /^\+250[0-9]{9}$/ (Rwanda format: +250XXXXXXXXX)
  password: string       // MinLength(8), MaxLength(50), must contain uppercase + lowercase + number + special char
  firstName: string      // MinLength(2), MaxLength(100), IsAlpha (allow spaces)
  lastName: string       // MinLength(2), MaxLength(100), IsAlpha (allow spaces)
  dateOfBirth?: string   // IsDateString, optional
  gender?: string        // IsIn(['male', 'female']), optional
}
```

**Logic:**

1. Check duplicate email → `409 CONFLICT` with error code `AUTH_EMAIL_EXISTS`
2. Check duplicate phone → `409 CONFLICT` with error code `AUTH_PHONE_EXISTS`
3. Hash password with bcrypt (12 rounds from env `BCRYPT_ROUNDS`)
4. Create user record with `status: 'pending'`, `role: 'user'`
5. Generate membership number: `RMC-${YEAR}-${6-digit-padded-sequential-number}` (use DB sequence or Redis counter)
6. Create `member_profiles` record
7. Write to `audit_log`: action `create`, entity `user`
8. Send welcome email via SMTP (MailHog locally): subject "Welcome to RMC Platform", include name and next step (verify phone)
9. Return `201` with `{ userId, message: "Registration successful. Please verify your phone number." }`

**Error responses:**

- `409`: email or phone already registered
- `400`: validation errors (return array of field-level messages)
- `500`: unexpected server error (log with Sentry, return generic message)

#### `POST /api/v1/auth/login`

**Request DTO (`LoginDto`):**

```typescript
{
  identifier: string     // email OR phone number (auto-detect format)
  password: string       // MinLength(1)
  mfaCode?: string       // Optional 6-digit TOTP code
}
```

**Logic:**

1. Find user by email or phone (case-insensitive email)
2. If not found → `401` with generic message `"Invalid credentials"` (never reveal which field is wrong)
3. Compare password with bcrypt → if mismatch → `401` with same generic message
4. If user status is `suspended` → `403` with `AUTH_ACCOUNT_SUSPENDED`
5. If user status is `inactive` → `403` with `AUTH_ACCOUNT_INACTIVE`
6. If `mfa_enabled === true` and no `mfaCode` provided → return `200` with `{ requiresMfa: true }` (no tokens yet)
7. If `mfa_enabled === true` and `mfaCode` provided → verify TOTP (see P1.10)
8. Generate access token (JWT, 15 min) — payload: `{ sub: userId, role, email, iat, exp }`
9. Generate refresh token (UUID v4), hash with SHA-256, store in `refresh_tokens` table with `expires_at = now + 7 days`
10. Update `users.last_login_at`
11. Write to `audit_log`: action `login`, entity `user`
12. Return `200` with `{ accessToken, refreshToken, user: { id, email, firstName, lastName, role } }`

**Security requirements:**

- Throttle login endpoint: max 5 failed attempts per IP per 15 minutes (use `@nestjs/throttler` with custom storage in Redis)
- After 5 failed attempts → `429` with `AUTH_TOO_MANY_ATTEMPTS` and `retryAfter` seconds

### Tests to Write

```typescript
// auth.service.spec.ts — Unit tests
describe('AuthService', () => {
  describe('register', () => {
    it('should create user with hashed password')
    it('should throw ConflictException on duplicate email')
    it('should throw ConflictException on duplicate phone')
    it('should generate valid membership number format')
    it('should write to audit log on successful registration')
    it('should send welcome email on successful registration')
    it('should reject passwords without uppercase letter')
    it('should reject passwords without special character')
    it('should reject invalid Rwanda phone format')
  })

  describe('login', () => {
    it('should return tokens for valid credentials')
    it('should return 401 for wrong password (generic message)')
    it('should return 401 for non-existent user (generic message)')
    it('should return 403 for suspended account')
    it('should return requiresMfa:true when MFA enabled and no code provided')
    it('should store refresh token hash in database')
    it('should update last_login_at on successful login')
  })
})
```

### Acceptance Criteria

- [ ] `POST /api/v1/auth/register` with valid payload → `201` with userId
- [ ] Duplicate email → `409` with `AUTH_EMAIL_EXISTS` code
- [ ] Duplicate phone → `409` with `AUTH_PHONE_EXISTS` code
- [ ] Invalid password (no uppercase) → `400` with field-level error
- [ ] Invalid Rwanda phone format → `400` with field-level error
- [ ] Password stored as bcrypt hash (never plaintext) — verify in DB directly
- [ ] Welcome email visible in MailHog UI at `http://localhost:8025`
- [ ] `POST /api/v1/auth/login` with correct credentials → `200` with `accessToken` and `refreshToken`
- [ ] Wrong password → `401` with generic message (does NOT say "wrong password")
- [ ] Non-existent user → `401` with same generic message as wrong password
- [ ] Suspended user → `403` with specific suspended code
- [ ] All unit tests pass: `npm test -- auth`
- [ ] Code coverage on auth module ≥ 80%: `npm run test:cov`

---

---

## P1.07 — Auth Module — JWT, Refresh Tokens & Logout

**Sprint:** 2 — Week 3  
**Owner:** Backend Developer  
**Story:** AUTH-003, AUTH-004  
**Blocked on AWS:** No

### Context

Implement token refresh and logout. The refresh token is a UUID stored as a SHA-256 hash in PostgreSQL. On refresh, the old token is invalidated (rotation). On logout, the token is blacklisted. Implement the JWT strategy for protecting routes.

### Endpoints

#### `POST /api/v1/auth/refresh`

**Request DTO:**

```typescript
{
  refreshToken: string
} // The raw UUID refresh token from login
```

**Logic:**

1. Hash the incoming token with SHA-256
2. Find record in `refresh_tokens` where `token_hash = hash AND revoked_at IS NULL AND expires_at > now()`
3. If not found → `401` with `AUTH_INVALID_REFRESH_TOKEN`
4. If found, mark old token as revoked: `revoked_at = now()`
5. Generate new access token (JWT, 15 min)
6. Generate new refresh token (rotation) and store new hash
7. Return `200` with `{ accessToken, refreshToken }`

**Security:**

- Detect refresh token reuse: if `revoked_at IS NOT NULL` → `401` AND revoke ALL tokens for that user (possible token theft — log security event to audit log)

#### `POST /api/v1/auth/logout`

**Auth:** Requires valid JWT (`@UseGuards(JwtAuthGuard)`)

**Logic:**

1. Extract `refreshToken` from request body OR extract user ID from JWT and revoke all user tokens
2. Hash the token and set `revoked_at = now()` in `refresh_tokens`
3. Write to audit log: action `logout`
4. Return `200` with `{ message: "Logged out successfully" }`

### JWT Strategy

Create `src/auth/strategies/jwt.strategy.ts`:

```typescript
// PassportStrategy(Strategy) extending from 'passport-jwt'
// extractor: ExtractJwt.fromAuthHeaderAsBearerToken()
// secretOrKey: JWT_ACCESS_SECRET from config
// ignoreExpiration: false
// validate(payload): find user by payload.sub, verify user is active, return user object
// If user not found or inactive → throw UnauthorizedException
```

Create `JwtAuthGuard` in `common/guards/jwt-auth.guard.ts`:

```typescript
// Extends AuthGuard('jwt')
// Override canActivate to check for @Public() decorator (skip auth for public routes)
// Override handleRequest to throw proper formatted exception
```

Create `@Public()` decorator for endpoints that skip JWT auth (health, auth endpoints).

### Tests to Write

```typescript
describe('AuthService - Tokens', () => {
  describe('refreshToken', () => {
    it('should return new access and refresh tokens for valid refresh token')
    it('should revoke the old refresh token after use')
    it('should throw 401 for expired refresh token')
    it('should throw 401 for revoked refresh token')
    it('should revoke ALL user tokens on refresh token reuse (security)')
  })

  describe('logout', () => {
    it('should revoke refresh token on logout')
    it('should return 401 if refresh token already revoked')
    it('should write logout event to audit log')
  })
})

describe('JwtStrategy', () => {
  it('should validate and return user for valid JWT payload')
  it('should throw UnauthorizedException for inactive user')
  it('should throw UnauthorizedException for non-existent user')
})
```

### Acceptance Criteria

- [ ] `POST /api/v1/auth/refresh` with valid token → `200` with new `accessToken` and `refreshToken`
- [ ] The old refresh token is no longer valid after refresh (test: use old token → `401`)
- [ ] Token reuse detected: using a revoked token revokes ALL tokens for that user
- [ ] `POST /api/v1/auth/logout` → `200`; subsequent refresh with same token → `401`
- [ ] Protected route without token → `401` with proper error format
- [ ] Protected route with expired token → `401`
- [ ] Route decorated with `@Public()` is accessible without token
- [ ] All unit tests pass: `npm test -- auth`

---

---

## P1.08 — Auth Module — OTP Phone Verification

**Sprint:** 2 — Week 3  
**Owner:** Backend Developer  
**Story:** AUTH-005  
**Blocked on AWS:** No — SMS is logged to console in dev; production SMS (MTN/Airtel) is Phase 3

### Context

Generate and verify a 6-digit OTP for phone number ownership verification. In development, the OTP is logged to the console and visible in application logs (not sent via SMS yet — SMS integration is Phase 3). OTP expires in 5 minutes and is rate-limited.

### Endpoints

#### `POST /api/v1/auth/send-otp`

**Auth:** Public  
**Request:** `{ phone: string }` (Rwanda format)

**Logic:**

1. Find user by phone; if not found → `404`
2. Check if already verified → `400` with `AUTH_PHONE_ALREADY_VERIFIED`
3. Check rate limit: max 3 OTPs per phone per 10 minutes (Redis counter) → `429` if exceeded
4. Generate 6-digit OTP: `Math.floor(100000 + Math.random() * 900000).toString()`
5. Hash OTP with SHA-256 before storing
6. Save to `phone_otp_verifications`: `{ userId, phone, otp_hash, expires_at: now + 5min }`
7. **Dev mode:** Log OTP to console: `[OTP] Phone: +250XXXXXXXXX | Code: 123456 | Expires: 10:05:00`
8. **Prod mode:** Send via SMS service (queue job — Phase 3 integration point, leave as placeholder)
9. Return `200` with `{ message: "OTP sent", expiresAt }` — never return OTP in response

#### `POST /api/v1/auth/verify-phone`

**Auth:** Public  
**Request DTO:**

```typescript
{
  phone: string // Rwanda format
  otp: string // 6-digit code, IsNumberString, Length(6)
}
```

**Logic:**

1. Find most recent unverified OTP record for this phone
2. If not found → `400` with `AUTH_OTP_NOT_FOUND`
3. Check `expires_at > now()` → if expired → `400` with `AUTH_OTP_EXPIRED`
4. Increment `attempts` counter; if attempts > 5 → `400` with `AUTH_OTP_MAX_ATTEMPTS`
5. Hash incoming OTP and compare with `otp_hash`
6. If mismatch → `400` with `AUTH_OTP_INVALID` (and save incremented attempts)
7. If match: set `verified_at = now()`, set `users.is_phone_verified = true`
8. Write to audit log
9. Return `200` with `{ message: "Phone verified successfully" }`

### Tests to Write

```typescript
describe('OTP Verification', () => {
  it('should generate and log OTP in development mode')
  it('should hash OTP before storing in database (never store plaintext)')
  it('should verify correct OTP and mark phone as verified')
  it('should reject expired OTP')
  it('should reject incorrect OTP and increment attempts counter')
  it('should block after 5 failed attempts')
  it('should return error if phone already verified')
  it('should enforce rate limit of 3 OTPs per 10 minutes')
})
```

### Acceptance Criteria

- [ ] `POST /api/v1/auth/send-otp` logs OTP clearly to Docker console output
- [ ] OTP is stored as SHA-256 hash, never plaintext
- [ ] OTP in response body is absent (only `expiresAt` returned)
- [ ] Correct OTP → `200`, `is_phone_verified = true` in DB
- [ ] Wrong OTP → `400` with `AUTH_OTP_INVALID`; `attempts` incremented in DB
- [ ] Expired OTP → `400` with `AUTH_OTP_EXPIRED`
- [ ] After 5 wrong attempts → `400` with `AUTH_OTP_MAX_ATTEMPTS`
- [ ] 4th OTP request within 10 min → `429` rate limit error
- [ ] All unit tests pass

---

---

## P1.09 — Auth Module — Password Reset Flow

**Sprint:** 2 — Week 3  
**Owner:** Backend Developer  
**Story:** AUTH-006  
**Blocked on AWS:** No — uses MailHog locally

### Context

Implement a secure password reset flow: request a reset link via email, validate the signed token, update the password. The token expires in 15 minutes and is single-use.

### Endpoints

#### `POST /api/v1/auth/forgot-password`

**Auth:** Public  
**Request:** `{ email: string }`

**Logic:**

1. Find user by email (case-insensitive)
2. **Always return `200`** regardless of whether email exists (prevent user enumeration)
3. If user exists: generate a UUID token, hash it with SHA-256, store in `password_reset_tokens` with `expires_at = now + 15min`
4. Construct reset URL: `${FRONTEND_URL}/reset-password?token=<raw-token>`
5. Send email via SMTP: subject "RMC Platform — Reset Your Password", body includes name and reset link, prominent expiry warning
6. Dev: email visible in MailHog at `http://localhost:8025`
7. Log: `[PASSWORD RESET] Email sent to: user@example.com | Token expires: HH:MM:SS` (log token hash only, never raw token)

#### `POST /api/v1/auth/reset-password`

**Auth:** Public  
**Request DTO:**

```typescript
{
  token: string // Raw UUID token from email link
  newPassword: string // Same validation as register password
}
```

**Logic:**

1. Hash incoming token with SHA-256
2. Find in `password_reset_tokens` where `token_hash = hash AND used_at IS NULL AND expires_at > now()`
3. If not found → `400` with `AUTH_RESET_TOKEN_INVALID`
4. If expired → `400` with `AUTH_RESET_TOKEN_EXPIRED`
5. Validate new password strength (same rules as registration)
6. Hash new password with bcrypt (12 rounds)
7. Update `users.password_hash`
8. Mark token as used: `used_at = now()`
9. Revoke all existing refresh tokens for this user (force re-login everywhere)
10. Send confirmation email: "Your RMC password has been changed"
11. Write to audit log: action `password_reset`, entity `user`
12. Return `200` with `{ message: "Password reset successful. Please log in with your new password." }`

### Tests to Write

```typescript
describe('Password Reset', () => {
  it('should return 200 for non-existent email (no enumeration)')
  it('should send reset email for existing user')
  it('should store hashed token (never plaintext)')
  it('should successfully reset password with valid token')
  it('should mark token as used after successful reset')
  it('should reject used token on second attempt')
  it('should reject expired token')
  it('should revoke all refresh tokens after password reset')
  it('should validate new password strength on reset')
  it('should confirm old password is invalid after reset')
})
```

### Acceptance Criteria

- [ ] `POST /api/v1/auth/forgot-password` returns `200` for both existing and non-existing email
- [ ] Reset email appears in MailHog with correct reset link
- [ ] Reset link token expires after 15 minutes (test with manipulated `expires_at`)
- [ ] `POST /api/v1/auth/reset-password` with valid token → `200` and password updated
- [ ] Old password no longer works after reset (verify with login attempt)
- [ ] Reset token cannot be reused (`used_at` is set)
- [ ] All existing refresh tokens are revoked after password reset
- [ ] Weak new password rejected with field-level error
- [ ] Token stored as hash — plaintext never in DB (verify directly)
- [ ] All unit tests pass

---

---

## P1.10 — Auth Module — TOTP MFA (speakeasy)

**Sprint:** 2 — Week 3  
**Owner:** Backend Developer  
**Story:** AUTH-007  
**Blocked on AWS:** No

### Context

Implement Time-based One-Time Password (TOTP) MFA using the `speakeasy` library. Users (specifically admin roles) can set up MFA. Once enabled, the TOTP code is required at login. The MFA secret is stored encrypted in the database.

### Endpoints

#### `POST /api/v1/auth/mfa/setup`

**Auth:** Requires JWT (`JwtAuthGuard`)

**Logic:**

1. Check if MFA already enabled → `400` with `AUTH_MFA_ALREADY_ENABLED`
2. Generate TOTP secret: `speakeasy.generateSecret({ name: 'RMC Platform', issuer: 'Rwanda Muslim Community', length: 20 })`
3. Encrypt the secret before storing (use AES-256-GCM with key from `JWT_ACCESS_SECRET` — store as `iv:authTag:ciphertext` hex string)
4. Temporarily store in Redis with key `mfa_setup:{userId}` TTL 10 minutes (not yet saved to DB — user must confirm)
5. Generate QR code URL: `speakeasy.otpauthURL(...)` then encode to QR PNG with `qrcode` library
6. Return `200` with `{ qrCodeDataUrl, manualEntryCode: secret.base32 }`
   - `qrCodeDataUrl` is a base64 PNG data URL
   - `manualEntryCode` is the base32 secret for manual entry in authenticator apps

#### `POST /api/v1/auth/mfa/verify-setup`

**Auth:** Requires JWT

**Request:** `{ totp: string }` (6-digit code from authenticator)

**Logic:**

1. Retrieve pending secret from Redis `mfa_setup:{userId}`
2. If not found → `400` with `AUTH_MFA_SETUP_NOT_INITIATED`
3. Verify TOTP: `speakeasy.totp.verify({ secret, encoding: 'base32', token: totp, window: 1 })`
4. If invalid → `400` with `AUTH_MFA_INVALID_CODE`
5. If valid: save encrypted secret to `users.mfa_secret`, set `users.mfa_enabled = true`
6. Delete Redis key
7. Write to audit log
8. Return `200` with `{ message: "MFA enabled successfully" }`

#### `POST /api/v1/auth/mfa/disable`

**Auth:** Requires JWT  
**Request:** `{ password: string, totp: string }`

**Logic:**

1. Verify password (security confirmation)
2. Verify current TOTP code
3. Set `mfa_enabled = false`, clear `mfa_secret`
4. Write to audit log
5. Return `200`

#### MFA Verification at Login (update P1.06 login endpoint)

In the login flow (P1.06), when `mfa_enabled === true` and `mfaCode` is provided:

1. Decrypt `mfa_secret` from DB
2. Verify: `speakeasy.totp.verify({ secret, encoding: 'base32', token: mfaCode, window: 1 })`
3. `window: 1` allows ±30 seconds for clock drift
4. If invalid → `401` with `AUTH_MFA_INVALID_CODE`
5. If valid → proceed with token issuance

### Tests to Write

```typescript
describe('MFA', () => {
  it('should generate a valid TOTP secret and QR code')
  it('should encrypt secret before storing in Redis')
  it('should verify setup with correct TOTP code and save to DB')
  it('should reject setup verification with incorrect TOTP code')
  it('should require MFA code at login when MFA is enabled')
  it('should accept TOTP code within ±30 second window (window:1)')
  it('should reject expired TOTP code (> 60 seconds old)')
  it('should disable MFA when correct password and TOTP provided')
})
```

### Acceptance Criteria

- [ ] `POST /api/v1/auth/mfa/setup` returns `qrCodeDataUrl` (base64 PNG) and `manualEntryCode`
- [ ] QR code is scannable by Google Authenticator and Authy (test manually on a real device)
- [ ] `POST /api/v1/auth/mfa/verify-setup` with correct code → MFA enabled in DB
- [ ] After MFA enabled: login without `mfaCode` → `{ requiresMfa: true }` (no tokens)
- [ ] After MFA enabled: login with correct `mfaCode` → full token response
- [ ] After MFA enabled: login with wrong `mfaCode` → `401`
- [ ] `mfa_secret` in DB is encrypted (not the raw base32 string)
- [ ] All unit tests pass

---

---

## P1.11 — RBAC — Guards, Decorators & Role Hierarchy

**Sprint:** 2 — Week 3  
**Owner:** Tech Lead  
**Story:** RBAC-001  
**Blocked on AWS:** No

### Context

Implement a complete role-based access control system. Roles form a hierarchy where higher roles inherit all permissions of lower roles. Every protected endpoint must declare its required minimum role using a `@Roles()` decorator.

### Role Hierarchy

```
SuperAdmin  (level 4)  → can do everything
    │
   Admin     (level 3)  → manages members, services, finance, communications
    │
  Operator   (level 2)  → mosque-level operations (member reg, local events)
    │
   User      (level 1)  → self-service: own profile, donations, applications
```

### Implementation

**`src/common/decorators/roles.decorator.ts`:**

```typescript
export enum Role {
  USER = 'user',
  OPERATOR = 'operator',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

// @Roles(Role.ADMIN) — minimum role required
// Applied to controller class or individual route handler
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles)
```

**`src/common/guards/roles.guard.ts`:**

```typescript
// Implements CanActivate
// 1. Get required roles from metadata (set by @Roles decorator)
// 2. If no roles metadata → allow (public or JWT-only route)
// 3. Get current user from request (set by JwtAuthGuard)
// 4. Implement hierarchy check: if required role is 'operator', then 'admin' and 'superadmin' also pass
// 5. If user role insufficient → throw ForbiddenException with AUTH_INSUFFICIENT_ROLE code

// Role level map for hierarchy:
const ROLE_LEVELS: Record<Role, number> = {
  user: 1,
  operator: 2,
  admin: 3,
  superadmin: 4,
}
// User passes if: ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole]
```

**Apply globally in `AppModule`:**

```typescript
// Register RolesGuard as global guard (after JwtAuthGuard)
// Order matters: JWT runs first, then Roles
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
]
```

**`src/common/decorators/current-user.decorator.ts`:**

```typescript
// @CurrentUser() — extracts the authenticated user from request
// Returns the full user object set by JwtStrategy.validate()
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user
    return data ? user?.[data] : user
  },
)
```

### Test Endpoints

Add these test-only endpoints to `AppController` (remove before Phase 8 go-live, guarded by `NODE_ENV !== 'production'`):

```typescript
@Get('test/user-only')
@Roles(Role.USER)
userOnly(@CurrentUser() user: User) { return { role: user.role, access: 'user-and-above' }; }

@Get('test/operator-only')
@Roles(Role.OPERATOR)
operatorOnly() { return { access: 'operator-and-above' }; }

@Get('test/admin-only')
@Roles(Role.ADMIN)
adminOnly() { return { access: 'admin-and-above' }; }

@Get('test/superadmin-only')
@Roles(Role.SUPERADMIN)
superAdminOnly() { return { access: 'superadmin-only' }; }
```

### Tests to Write

```typescript
describe('RolesGuard', () => {
  it('should allow user with exact required role')
  it('should allow superadmin on admin-only route (hierarchy)')
  it('should allow admin on operator-only route (hierarchy)')
  it('should deny operator on admin-only route → 403')
  it('should deny user on operator-only route → 403')
  it('should deny user on superadmin-only route → 403')
  it('should allow access to routes with no @Roles() decorator if JWT is valid')
  it('should return 403 with AUTH_INSUFFICIENT_ROLE error code')
})

describe('CurrentUser Decorator', () => {
  it('should extract full user from request when no field specified')
  it('should extract specific field when field name provided')
})
```

### Acceptance Criteria

- [ ] User token accessing `/test/admin-only` → `403` with `AUTH_INSUFFICIENT_ROLE`
- [ ] Operator token accessing `/test/admin-only` → `403`
- [ ] Admin token accessing `/test/admin-only` → `200`
- [ ] SuperAdmin token accessing `/test/admin-only` → `200` (hierarchy)
- [ ] SuperAdmin token accessing `/test/superadmin-only` → `200`
- [ ] Admin token accessing `/test/superadmin-only` → `403`
- [ ] `@Public()` route accessible without any token
- [ ] `@CurrentUser()` returns full user object in protected routes
- [ ] All unit tests pass

---

---

## P1.12 — Swagger / OpenAPI Documentation

**Sprint:** 2 — Week 3  
**Owner:** Backend Developer  
**Story:** All Auth stories  
**Blocked on AWS:** No

### Context

Document all Phase 1 auth endpoints in Swagger. This serves as the API contract for the frontend developer building P1.13 and is a Phase 1 deliverable for the BA sign-off.

### Requirements

Apply to every auth endpoint:

```typescript
// On each controller method:
@ApiOperation({ summary: 'Short description', description: 'Longer description' })
@ApiBody({ type: DtoClass })
@ApiResponse({ status: 200, description: 'Success', type: ResponseType })
@ApiResponse({ status: 400, description: 'Validation error' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 409, description: 'Conflict — duplicate email/phone' })
@ApiBearerAuth('access-token')  // On protected endpoints only
```

Create a `ResponseDto<T>` generic wrapper class decorated with `@ApiProperty` to document the standard response envelope.

Create an `AuthController` e2e test that verifies the Swagger JSON is valid:

```typescript
it('should expose valid OpenAPI spec at /api/docs-json', async () => {
  const response = await request(app.getHttpServer()).get('/api/docs-json')
  expect(response.status).toBe(200)
  expect(response.body.openapi).toBe('3.0.0')
  expect(response.body.paths['/api/v1/auth/register']).toBeDefined()
  expect(response.body.paths['/api/v1/auth/login']).toBeDefined()
  // ... all auth paths
})
```

### Acceptance Criteria

- [ ] Swagger UI at `http://localhost:3000/api/docs` loads without errors
- [ ] All 9 auth endpoints are documented (register, login, refresh, logout, send-otp, verify-phone, forgot-password, reset-password, mfa/setup, mfa/verify-setup, mfa/disable)
- [ ] Request bodies show all fields with types and descriptions
- [ ] Response schemas show the `{ success, data, timestamp }` envelope
- [ ] Bearer auth token can be entered in Swagger UI and used for protected endpoint testing
- [ ] `/api/docs-json` returns valid OpenAPI 3.0 JSON
- [ ] E2E test for Swagger spec passes

---

---

## P1.13 — Next.js Frontend Scaffold + i18n + RTL

**Sprint:** 2 — Week 3  
**Owner:** Frontend Developer  
**Story:** FE-001  
**Blocked on AWS:** No

### Context

Scaffold the Next.js 14 application with App Router, Tailwind CSS, multilingual support (Kinyarwanda, English, Arabic), and proper RTL layout for Arabic. This is the foundation all Phase 2 public website pages build upon.

### Setup

```bash
# Inside apps/frontend/
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### Required Dependencies

```json
{
  "dependencies": {
    "next": "14",
    "react": "18",
    "next-intl": "^3",
    "next-themes": "^0.3",
    "@tanstack/react-query": "^5",
    "axios": "^1",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3",
    "zod": "^3",
    "lucide-react": "^0.400",
    "clsx": "^2",
    "tailwind-merge": "^2"
  }
}
```

### Project Structure

```
src/
├── app/
│   ├── [locale]/                    # All pages under locale prefix
│   │   ├── layout.tsx               # Locale layout (sets dir="rtl" for Arabic)
│   │   ├── page.tsx                 # Homepage (placeholder for Phase 2)
│   │   └── (auth)/
│   │       ├── login/page.tsx
│   │       ├── register/page.tsx
│   │       └── reset-password/page.tsx
│   └── layout.tsx                   # Root layout
├── components/
│   ├── ui/                          # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Alert.tsx
│   │   └── LoadingSpinner.tsx
│   ├── layout/
│   │   ├── Navbar.tsx               # With language switcher
│   │   └── LanguageSwitcher.tsx
│   └── auth/
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useLocalStorage.ts
├── lib/
│   ├── api.ts                       # Axios instance with interceptors
│   ├── auth.ts                      # Auth utility functions
│   └── utils.ts                     # clsx + tailwind-merge helper
├── messages/
│   ├── en.json                      # English translations
│   ├── rw.json                      # Kinyarwanda translations
│   └── ar.json                      # Arabic translations
└── middleware.ts                    # next-intl locale routing
```

### Internationalisation (next-intl)

**Supported locales:** `en` (default), `rw` (Kinyarwanda), `ar` (Arabic/RTL)

**`middleware.ts`:**

```typescript
// Use next-intl createMiddleware
// locales: ['en', 'rw', 'ar']
// defaultLocale: 'en'
// localePrefix: 'always'  → URLs: /en/*, /rw/*, /ar/*
```

**`src/app/[locale]/layout.tsx`:**

```typescript
// Set <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
// Load appropriate font:
//   - en, rw: Inter (from next/font/google)
//   - ar: Noto Naskh Arabic (from next/font/google)
// Wrap with NextIntlClientProvider
```

**Translation file structure (all 3 languages):**

```json
{
  "common": {
    "appName": "RMC Platform",
    "loading": "Loading...",
    "error": "An error occurred",
    "submit": "Submit",
    "cancel": "Cancel",
    "back": "Back"
  },
  "auth": {
    "login": {
      "title": "Sign In",
      "email": "Email Address",
      "phone": "Phone Number",
      "password": "Password",
      "submit": "Sign In",
      "forgotPassword": "Forgot password?",
      "noAccount": "Don't have an account?",
      "register": "Register"
    },
    "register": {
      "title": "Create Account",
      ...
    }
  },
  "nav": {
    "home": "Home",
    "about": "About",
    "services": "Services",
    "donate": "Donate",
    "contact": "Contact",
    "login": "Login",
    "register": "Register"
  }
}
```

Provide complete translations in all 3 languages for all auth-related strings.

### API Client

**`src/lib/api.ts`:**

```typescript
// Axios instance with:
// baseURL: process.env.NEXT_PUBLIC_API_URL (http://localhost:3000/api/v1)
// withCredentials: true
// Request interceptor: attach access token from localStorage/cookie
// Response interceptor:
//   - On 401: attempt token refresh via POST /auth/refresh
//   - If refresh fails: clear tokens, redirect to /[locale]/login
//   - On success: retry original request with new token
// Typed response: ApiResponse<T> matching backend envelope
```

### Authentication State

**`src/hooks/useAuth.ts`:**

```typescript
// React hook managing auth state
// - login(identifier, password, mfaCode?) → calls API, stores tokens, updates state
// - logout() → calls API, clears tokens
// - isAuthenticated: boolean
// - user: User | null
// - isLoading: boolean
// Store access token in memory (not localStorage)
// Store refresh token in httpOnly cookie (set by backend) OR localStorage as fallback for dev
```

### Placeholder Pages

Create minimal but visually complete placeholder pages:

**Homepage** (`/en`): Show RMC branding, "Platform Coming Soon" message, language switcher. Must look professional, not like a default template.

**Login page** (`/en/login`): Full form with email/phone, password, submit button, link to register. Connected to API (POST /auth/login). Show validation errors from API.

**Register page** (`/en/register`): Full form with all registration fields. Connected to API. Show field-level validation errors.

### Tailwind Configuration

```typescript
// tailwind.config.ts additions:
theme: {
  extend: {
    colors: {
      'rmc-green': '#1A7A4A',
      'rmc-green-dark': '#145C38',
      'rmc-green-light': '#E8F5EE',
      'rmc-gold': '#D4A017',
    },
    fontFamily: {
      arabic: ['Noto Naskh Arabic', 'serif'],
    }
  }
},
// RTL support: install and configure tailwindcss-rtl plugin
```

### Tests to Write

```typescript
// components/layout/LanguageSwitcher.test.tsx
describe('LanguageSwitcher', () => {
  it('renders all 3 language options')
  it('shows correct flag/label for each locale')
  it('navigates to correct locale URL on click')
})

// app/[locale]/layout.test.tsx
describe('LocaleLayout', () => {
  it('sets dir="rtl" for Arabic locale')
  it('sets dir="ltr" for English and Kinyarwanda locales')
  it('sets correct lang attribute')
})

// lib/api.test.ts
describe('API Client', () => {
  it('attaches access token to request headers')
  it('retries request after successful token refresh on 401')
  it('redirects to login when refresh token is invalid')
})
```

### Acceptance Criteria

- [ ] `http://localhost:3001/en` loads homepage in English
- [ ] `http://localhost:3001/rw` loads in Kinyarwanda
- [ ] `http://localhost:3001/ar` loads in Arabic with RTL layout (right-to-left text, mirrored nav)
- [ ] Language switcher changes locale and persists across navigation
- [ ] Login form submits to backend and shows token received (check browser network tab)
- [ ] Register form shows field-level validation errors from API
- [ ] Arabic font (Noto Naskh Arabic) loads correctly (verify in browser DevTools)
- [ ] No console errors or layout breaks at 375px, 768px, 1440px viewport widths
- [ ] Lighthouse Accessibility score > 90 on login page
- [ ] All unit tests pass

---

---

## P1.14 — Integration Test Suite — All Auth Endpoints

**Sprint:** 2 — Week 3  
**Owner:** Backend Developer + QA Engineer  
**Story:** Phase 1 Quality Gate requirement  
**Blocked on AWS:** No — targets local Docker stack

### Context

Write a comprehensive integration (end-to-end) test suite covering all 8 auth stories. These tests run against a real local database and Redis instance (via `docker-compose.test.yml`). They form the Phase 1 quality gate — all tests must pass at 0 failures before Phase 2 begins.

### Test Configuration

**`apps/backend/test/jest-e2e.json`:**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "testTimeout": 30000,
  "globalSetup": "./test/setup.ts",
  "globalTeardown": "./test/teardown.ts"
}
```

**`test/setup.ts`:**

- Wait for PostgreSQL and Redis to be ready (retry up to 30 seconds)
- Run migrations on test database
- Clear all tables (truncate in dependency order)

**`test/teardown.ts`:**

- Truncate all tables
- Close DB and Redis connections

### Test File: `test/auth.e2e-spec.ts`

```typescript
describe('Auth — End-to-End', () => {
  describe('POST /api/v1/auth/register', () => {
    it('201 — creates user with valid payload')
    it('400 — rejects missing required fields')
    it('400 — rejects invalid Rwanda phone format')
    it('400 — rejects weak password (no uppercase)')
    it('400 — rejects weak password (no special character)')
    it('400 — rejects weak password (too short < 8 chars)')
    it('409 — rejects duplicate email')
    it('409 — rejects duplicate phone')
    it('should NOT return password hash in response')
    it('should send welcome email (verify MailHog API has 1 email)')
    it('should create member_profile record in DB')
    it('should write to audit_log with action=create')
  })

  describe('POST /api/v1/auth/login', () => {
    it('200 — returns accessToken and refreshToken for valid credentials')
    it('200 — accepts phone number as identifier')
    it('401 — rejects wrong password with generic message')
    it(
      '401 — rejects non-existent user with same generic message as wrong password',
    )
    it('403 — rejects suspended account')
    it('200 — returns requiresMfa:true when MFA enabled and no code provided')
    it('should update last_login_at in DB on successful login')
    it('should store refresh token hash in DB (not plaintext)')
    it('429 — rate limits after 5 failed attempts within 15 minutes')
  })

  describe('POST /api/v1/auth/refresh', () => {
    it('200 — returns new tokens for valid refresh token')
    it('401 — rejects expired refresh token')
    it('401 — rejects revoked refresh token')
    it('401 — detects token reuse and revokes all user tokens')
    it('should invalidate old refresh token after use')
  })

  describe('POST /api/v1/auth/logout', () => {
    it('200 — successfully logs out authenticated user')
    it('401 — rejects request without JWT')
    it('should revoke refresh token (subsequent refresh returns 401)')
    it('should write logout event to audit_log')
  })

  describe('POST /api/v1/auth/send-otp + verify-phone', () => {
    it('200 — sends OTP (visible in console logs)')
    it('200 — verifies correct OTP and marks phone as verified')
    it('400 — rejects incorrect OTP')
    it('400 — rejects expired OTP (manipulate DB expires_at)')
    it('400 — rejects after 5 failed attempts')
    it('429 — rate limits OTP send: max 3 per 10 minutes')
  })

  describe('POST /api/v1/auth/forgot-password + reset-password', () => {
    it('200 — returns success for non-existent email (no enumeration)')
    it('200 — sends reset email for existing user (verify MailHog API)')
    it('200 — resets password with valid token')
    it('400 — rejects invalid/expired reset token')
    it('400 — rejects used token')
    it('should revoke all refresh tokens after password reset')
    it('old password should fail login after reset')
    it('new password should succeed login after reset')
  })

  describe('RBAC', () => {
    it('401 — protected route returns 401 without token')
    it('403 — user token on admin-only route returns 403')
    it('403 — operator token on admin-only route returns 403')
    it('200 — admin token on admin-only route returns 200')
    it('200 — superadmin token on any role-restricted route returns 200')
    it('public route returns 200 without any token')
  })

  describe('MFA', () => {
    it('should setup MFA and return QR code data URL')
    it('should enable MFA after verifying TOTP code')
    it('should require MFA code at login after enabling')
    it('should accept valid TOTP at login')
    it('should reject invalid TOTP at login')
    it('should disable MFA with correct password and TOTP')
  })

  describe('Response Format', () => {
    it('all success responses have { success: true, data, timestamp }')
    it('all error responses have { success: false, error: { code, message } }')
    it('validation errors include field-level details array')
  })
})
```

### MailHog API Verification

Use MailHog HTTP API to verify emails in tests:

```typescript
// MailHog API: GET http://localhost:8025/api/v2/messages
const mailhogResponse = await axios.get('http://localhost:8025/api/v2/messages')
expect(mailhogResponse.data.total).toBeGreaterThan(0)
// Clear between tests: DELETE http://localhost:8025/api/v1/messages
```

### Acceptance Criteria

- [ ] `npm run test:e2e` runs all tests against Docker stack and exits with 0 failures
- [ ] **All tests must pass — 0 failures is the Phase 1 quality gate**
- [ ] Tests are independent (each test starts with a clean database state or creates its own data)
- [ ] Test suite completes in under 3 minutes
- [ ] Coverage report generated: `npm run test:cov` shows ≥ 80% on all auth-related files
- [ ] No hardcoded wait times (`setTimeout`) — use proper async/await and retry logic

---

---

## P1.15 — AWS Infrastructure — Terraform Scripts

**Sprint:** Post-AWS Access  
**Owner:** DevOps Engineer  
**Story:** INFRA-001 through INFRA-005, INFRA-010  
**Blocked on AWS:** YES — execute only after AWS IAM access granted

### Context

Provision the complete AWS infrastructure using Terraform. All scripts are written and reviewed during the pre-AWS phase (see P1.02 DevOps productivity plan) so execution is near-instant once access is granted. Target region: `af-south-1` (Cape Town) as primary.

### Infrastructure to Provision

**VPC (`infra/terraform/vpc.tf`):**

```hcl
# Module: aws_vpc
# CIDR: 10.0.0.0/16
# Public subnets: 10.0.1.0/24 (AZ-a), 10.0.2.0/24 (AZ-b)
# Private subnets: 10.0.10.0/24 (AZ-a), 10.0.11.0/24 (AZ-b)
# Internet Gateway (for public subnets)
# NAT Gateway (for private subnet outbound traffic)
# Route tables and associations
```

**Security Groups (`infra/terraform/security-groups.tf`):**

```hcl
# sg-app: allows 80, 443 inbound from anywhere; 3000 inbound from ALB only; all outbound
# sg-db: allows 5432 inbound from sg-app only; no public access
# sg-redis: allows 6379 inbound from sg-app only
# sg-bastion: allows 22 inbound from DevOps IPs only (whitelist)
```

**EC2 Instances (`infra/terraform/ec2.tf`):**

```hcl
# App server: t3.large, Amazon Linux 2023, private subnet, sg-app
#   - User data: install Docker, Docker Compose, Node 20, Nginx
# DB server: t3.medium (use RDS instead — see below)
# Redis server: t3.small, private subnet, sg-redis
#   - User data: install Redis 7 with AUTH
# Bastion host: t3.micro, public subnet, sg-bastion (SSH jump host)
```

**RDS (`infra/terraform/rds.tf`):**

```hcl
# aws_db_instance: postgres 16
# Instance class: db.t3.medium
# Multi-AZ: true (for production), false (for staging — cost saving)
# Storage: 20GB gp3, autoscaling up to 100GB
# Subnet group: private subnets only
# Security group: sg-db
# Backup: enabled, retention 7 days, window 02:00-03:00 UTC
# Deletion protection: true (production only)
# Parameter group: set max_connections=100, shared_buffers=256MB
```

**S3 (`infra/terraform/s3.tf`):**

```hcl
# Bucket: rmc-platform-uploads-{env}
# Versioning: enabled
# Block all public access: true (access via presigned URLs only)
# Lifecycle: move to S3-IA after 90 days, Glacier after 1 year
# Encryption: AES-256 server-side
# CORS: allow GET/PUT from FRONTEND_URL
# Bucket: rmc-platform-backups-{env} (for DB backups)
# Replication: cross-region replication to eu-west-1 for backups
```

**Route 53 + ACM (`infra/terraform/dns.tf`):**

```hcl
# Hosted zone: rmc.org.rw
# A record: rmc.org.rw → ALB
# A record: staging.rmc.org.rw → staging ALB
# A record: api.rmc.org.rw → ALB
# ACM certificate: *.rmc.org.rw + rmc.org.rw (wildcard + apex)
# DNS validation records for ACM
```

**Environments:** Use Terraform workspaces or separate `tfvars` files for `staging` and `production`.

**`infra/terraform/variables.tf`:** All configurable values as variables with descriptions.
**`infra/terraform/outputs.tf`:** Export: instance IPs, RDS endpoint, S3 bucket names, ACM cert ARN.
**`infra/terraform/backend.tf`:** Remote state in S3 bucket with DynamoDB lock table.

### Acceptance Criteria

- [ ] `terraform init` completes successfully
- [ ] `terraform plan -var-file=staging.tfvars` shows expected resource creation with no errors
- [ ] `terraform apply -var-file=staging.tfvars` provisions all resources in < 20 minutes
- [ ] VPC created; app server in private subnet cannot be reached from internet directly (test: try direct SSH to private IP from external network — must fail)
- [ ] RDS accessible from app server only: `psql -h <rds-endpoint> -U rmc_user rmc_db` from app server succeeds; from external laptop fails
- [ ] S3 bucket created; public access blocked; presigned URL upload tested with `aws s3 presign`
- [ ] `terraform destroy` tears down all resources cleanly (staging only — never run on production)
- [ ] All `terraform outputs` display correct values

---

---

## P1.16 — AWS Deployment — Nginx + SSL + Staging Deploy

**Sprint:** Post-AWS Access  
**Owner:** DevOps Engineer  
**Story:** INFRA-005, INFRA-007 (deploy stage)  
**Blocked on AWS:** YES

### Context

Configure Nginx as reverse proxy on the EC2 app server, provision SSL via ACM/Certbot, and activate the GitHub Actions deploy-to-staging job. This is the final step to reach the full Phase 1 quality gate.

### Nginx Configuration

**`infra/nginx/staging.conf`:**

```nginx
# Server block: rmc.org.rw + staging.rmc.org.rw
# HTTP → HTTPS redirect (301)
# HTTPS:
#   - proxy_pass to backend at http://localhost:3000
#   - proxy_pass /frontend to frontend at http://localhost:3001 (or serve Next.js standalone)
#   - HSTS header: max-age=31536000; includeSubDomains
#   - Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, etc.
#   - Gzip compression for text/html, application/json, application/javascript, text/css
#   - Rate limiting: limit_req_zone + limit_req for /api/ endpoints
#   - Client max body size: 10m (for file uploads)
#   - Access log and error log paths
```

**SSL Setup:**

- Use AWS ACM certificate (provisioned in P1.15) for ALB termination, OR
- Use Certbot on EC2 with Let's Encrypt for direct Nginx SSL (simpler for staging)
- Document chosen approach in `docs/infra/ssl-setup.md`

### GitHub Actions — Enable Deploy Stage

In `.github/workflows/ci.yml`, activate the deploy-to-staging job:

```yaml
deploy-staging:
  needs: [security]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/develop' && vars.AWS_CONFIGURED == 'true'
  environment: staging
  steps:
    - name: Deploy to staging via SSH
      uses: appleboy/ssh-action@v1
      with:
        host: ${{ secrets.STAGING_HOST }}
        username: ec2-user
        key: ${{ secrets.STAGING_SSH_KEY }}
        script: |
          cd /opt/rmc-platform
          git pull origin develop
          docker compose -f docker-compose.prod.yml pull
          docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
          docker compose -f docker-compose.prod.yml exec backend npm run migration:run
          curl -f http://localhost:3000/api/v1/health || exit 1
          echo "Deployment successful"
```

Create `docker-compose.prod.yml`:

- Same services as `docker-compose.yml` but:
  - Images pulled from GitHub Container Registry (GHCR) by tag
  - No bind mounts
  - `restart: always`
  - Environment variables from `/opt/rmc-platform/.env.staging` on the server

### Acceptance Criteria

- [ ] `https://staging.rmc.org.rw` responds with the Next.js homepage (200)
- [ ] HTTP `http://staging.rmc.org.rw` redirects to HTTPS (301)
- [ ] HSTS header present: `strict-transport-security: max-age=31536000`
- [ ] `https://staging.rmc.org.rw/api/v1/health` returns `{"success":true,"data":{"status":"ok",...}}`
- [ ] SSL certificate valid (A+ on SSL Labs — target, A minimum)
- [ ] Push to `develop` branch triggers CI/CD and deploys to staging automatically
- [ ] Deployment completes and health check passes within 10 minutes of push
- [ ] Nginx access logs visible: `docker compose logs nginx`

---

---

## P1.17 — Monitoring Stack — Prometheus + Grafana + Loki

**Sprint:** Post-AWS Access  
**Owner:** DevOps Engineer  
**Story:** INFRA-009  
**Blocked on AWS:** Partial — local setup in Docker Compose (done in P1.02); production deploy requires AWS

### Context

Deploy the full observability stack to staging. Prometheus scrapes metrics, Grafana visualises them, Loki aggregates logs, Sentry captures exceptions. All dashboards must be pre-configured (no manual dashboard creation after deploy).

### Services to Deploy

Add to `docker-compose.prod.yml` on staging server:

| Service      | Image                   | Port            | Purpose                 |
| ------------ | ----------------------- | --------------- | ----------------------- |
| `prometheus` | prom/prometheus:latest  | 9090 (internal) | Metrics scraping        |
| `grafana`    | grafana/grafana:latest  | 3100 (internal) | Dashboard visualisation |
| `loki`       | grafana/loki:latest     | 3200 (internal) | Log aggregation         |
| `promtail`   | grafana/promtail:latest | —               | Log shipping to Loki    |

### NestJS Metrics Endpoint

Add `@willsoto/nestjs-prometheus` to backend:

```typescript
// Expose: GET /api/v1/metrics (internal only, blocked at Nginx from public)
// Metrics to expose:
//   - HTTP request duration histogram (by route, method, status)
//   - HTTP requests total counter
//   - Active DB connections gauge
//   - Auth events counter (login_success, login_failure, register)
//   - Custom business metrics as needed
```

### Grafana Dashboards (pre-configured as JSON)

Create dashboard JSON files in `infra/grafana/dashboards/`:

**`01-infrastructure.json`:** CPU, memory, disk I/O, network — per EC2 instance
**`02-application.json`:** HTTP request rate, P95 latency, error rate, active sessions
**`03-auth.json`:** Registration rate, login success/failure, MFA adoption, token refresh rate
**`04-logs.json`:** Loki log viewer with filters for error level and service

### Alerting Rules

**`infra/prometheus/alerts.yml`:**

```yaml
# Alert: HighErrorRate — HTTP 5xx > 5% for 5 minutes
# Alert: DatabaseDown — postgres health check fails for 2 minutes
# Alert: RedisDown — redis health check fails for 2 minutes
# Alert: HighMemoryUsage — container memory > 85% for 10 minutes
# Alert: DiskSpaceWarning — disk usage > 80%
# Notification channel: send to PM's phone via SMS + email (configure in Grafana)
```

### Acceptance Criteria

- [ ] Grafana accessible at internal URL (behind Nginx auth proxy — not public-facing)
- [ ] All 4 pre-configured dashboards load with live data
- [ ] Prometheus scraping backend metrics endpoint successfully
- [ ] Loki receiving application logs from backend container
- [ ] Test alert: stop postgres container → "DatabaseDown" alert fires within 2 minutes → PM and Tech Lead receive notification
- [ ] Sentry DSN configured; trigger a deliberate `throw new Error('test')` in a dev endpoint → error appears in Sentry within 30 seconds
- [ ] Dashboard: HTTP request latency P95 visible and updating in real time

---

---

## P1.18 — Database Backup — S3 Automated Backup

**Sprint:** Post-AWS Access  
**Owner:** DevOps Engineer  
**Story:** DB-002  
**Blocked on AWS:** YES — S3 bucket required

### Context

Implement automated daily PostgreSQL backups to S3, with restore procedure documented and tested. The backup script is written in advance and tested locally against MinIO — it activates against real S3 automatically when `AWS_CONFIGURED=true` and the S3 bucket name is set.

### Backup Script

**`infra/scripts/backup-db.sh`:**

```bash
#!/bin/bash
# Environment variables required:
# DATABASE_URL, S3_BUCKET_NAME, AWS_REGION, BACKUP_RETENTION_DAYS (default 30)
# SMTP_HOST, ADMIN_EMAIL (for failure notifications)

# 1. Generate filename: rmc_backup_YYYYMMDD_HHMMSS.sql.gz
# 2. pg_dump --clean --if-exists --format=plain | gzip > /tmp/backup.sql.gz
# 3. aws s3 cp /tmp/backup.sql.gz s3://${S3_BUCKET_NAME}/backups/${FILENAME}
# 4. Verify upload: aws s3 ls returns the file
# 5. Delete local temp file
# 6. Prune old backups: delete S3 objects older than BACKUP_RETENTION_DAYS
# 7. Log success with file size and upload duration
# 8. On failure: send alert email via SMTP and exit 1
```

**Schedule:** Add to crontab on EC2 (via user-data or Ansible): `0 2 * * * /opt/rmc-platform/infra/scripts/backup-db.sh >> /var/log/rmc-backup.log 2>&1`

### Restore Procedure

**`docs/infra/db-restore-procedure.md`:**

```markdown
# Database Restore Procedure

## Step 1: Identify backup to restore

aws s3 ls s3://rmc-platform-backups-prod/backups/ --recursive | sort | tail -10

## Step 2: Download backup

aws s3 cp s3://rmc-platform-backups-prod/backups/rmc_backup_YYYYMMDD_HHMMSS.sql.gz /tmp/

## Step 3: Stop application

docker compose -f docker-compose.prod.yml stop backend

## Step 4: Restore

gunzip -c /tmp/rmc_backup_YYYYMMDD_HHMMSS.sql.gz | psql \$DATABASE_URL

## Step 5: Verify row counts

psql \$DATABASE_URL -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;"

## Step 6: Restart application

docker compose -f docker-compose.prod.yml start backend

## Expected restore time: < 5 minutes for < 1GB database
```

### Acceptance Criteria

- [ ] `backup-db.sh` runs successfully against local MinIO: file appears in MinIO bucket
- [ ] `backup-db.sh` runs successfully against real S3 (after AWS access): file in S3 with correct name
- [ ] Backup file is valid gzip: `gunzip --test /path/to/backup.sql.gz` succeeds
- [ ] Restore procedure tested on staging: truncate all tables → restore from backup → verify data is back
- [ ] Cron job active on EC2: `crontab -l` shows the 02:00 backup entry
- [ ] Backup runs at 02:00 next day: verify S3 bucket has new file
- [ ] Failure notification works: break DB connection string → `backup-db.sh` exits 1 and sends alert email
- [ ] Retention policy: manually create 35 old backup records in S3 → script deletes those older than 30 days
- [ ] Restore procedure document reviewed and signed off by Tech Lead

---

---

## PHASE 1 COMPLETION CHECKLIST

Before marking Phase 1 as complete and proceeding to Phase 2, verify ALL of the following:

### Local (Pre-AWS) Quality Gate

- [ ] Git repository: GitFlow branches, protection rules, PR template, CODEOWNERS ✅
- [ ] Docker Compose: all 7 services start; full stack running in < 10 min on clean machine ✅
- [ ] CI/CD: lint → test → build → scan all green on push to develop ✅
- [ ] PostgreSQL schema: all 30+ tables; migrations run/revert cleanly; FK constraints enforced ✅
- [ ] Auth — Registration: creates user, hashes password, sends email, writes audit log ✅
- [ ] Auth — Login: returns JWT + refresh token; rate limits after 5 failures ✅
- [ ] Auth — Refresh: token rotation; reuse detection revokes all tokens ✅
- [ ] Auth — Logout: refresh token revoked; audit log entry ✅
- [ ] Auth — OTP: generates, logs to console, verifies correctly; rate limited ✅
- [ ] Auth — Password Reset: sends email; token expires; revokes refresh tokens ✅
- [ ] Auth — MFA: QR code generated; TOTP verified; encrypts secret ✅
- [ ] RBAC: 4-tier hierarchy enforced; @Roles() decorator working; 403 on insufficient role ✅
- [ ] Swagger: all 11 auth endpoints documented; Bearer auth usable in UI ✅
- [ ] Frontend: loads in 3 languages; RTL for Arabic; login/register forms connected to API ✅
- [ ] Integration tests: ALL E2E tests pass — 0 failures ✅
- [ ] Code coverage: ≥ 80% on auth module ✅
- [ ] Security: `npm audit` 0 critical; Trivy scan 0 critical CVEs ✅
- [ ] BA sign-off: Business Analyst confirms all auth acceptance criteria met ✅
- [ ] Sprint retrospectives: Sprint 1 and Sprint 2 retros conducted and logged ✅

### AWS (Post-Access) Quality Gate

- [ ] Infrastructure: VPC, EC2, RDS, S3, Redis provisioned via Terraform ✅
- [ ] Staging deploy: push to develop auto-deploys; health check passes in < 10 min ✅
- [ ] SSL: HTTPS live; HTTP → HTTPS redirect; HSTS header present ✅
- [ ] Monitoring: Grafana dashboards live; alerts configured; test alert fires ✅
- [ ] Backup: daily S3 backup active; restore procedure tested and documented ✅
- [ ] Integration tests (staging): all E2E tests pass against staging environment ✅

### Phase 1 Complete → Phase 2 Authorised

**PM sends formal Phase 1 completion notification when all boxes above are checked.**

---

_End of Phase 1 Claude Code Implementation Prompts_  
_Rwanda Muslim Community Digital Platform — v1.0 — June 2026 — Confidential_
