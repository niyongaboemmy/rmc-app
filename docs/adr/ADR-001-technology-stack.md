# ADR-001: Technology Stack Selection

**Date:** 2026-06-07  
**Status:** Accepted  
**Deciders:** Tech Lead, Project Manager, Senior Backend Developer, Senior Frontend Developer

---

## Context

The Rwanda Muslim Community (RMC) Digital Platform requires a technology stack capable of supporting 8 phases of features including member management, service applications, payments, donations, events, communications, schools, AI assistant, and reporting. The platform must be multilingual (English, Kinyarwanda, Arabic/RTL), scalable to thousands of concurrent users, deployable on AWS in the af-south-1 region, and maintainable by a small team long-term.

---

## Decision

We adopt the following stack:

| Layer           | Technology              | Version  |
| --------------- | ----------------------- | -------- |
| Backend API     | NestJS (TypeScript)     | ^10      |
| Frontend        | Next.js (TypeScript)    | 14       |
| Primary DB      | PostgreSQL              | 16       |
| Cache / Queue   | Redis                   | 7        |
| ORM             | TypeORM                 | ^0.3     |
| Containerisation| Docker + Docker Compose | v2       |
| Cloud           | AWS (af-south-1)        | —        |
| IaC             | Terraform               | ^1.7     |
| CI/CD           | GitHub Actions          | —        |
| Reverse Proxy   | Nginx                   | latest   |

---

## Alternatives Considered

### Backend: NestJS vs Express vs Fastify vs Django

| Option   | Pros                                      | Cons                                  |
| -------- | ----------------------------------------- | ------------------------------------- |
| NestJS   | TypeScript-first, modular, DI, decorators, large ecosystem, great for enterprise | Opinionated, learning curve for beginners |
| Express  | Simple, flexible, huge ecosystem          | No structure by default, manual everything |
| Fastify  | Very fast, good TypeScript support        | Smaller ecosystem than Express        |
| Django   | Fast development, built-in admin          | Python (different language from frontend), slower for high-concurrency |

**Decision: NestJS** — The modular architecture, first-class TypeScript support, built-in dependency injection, and enterprise patterns (guards, interceptors, pipes, decorators) make it ideal for a multi-phase platform that will grow over 8 phases. The team has TypeScript expertise.

### Frontend: Next.js vs Nuxt vs Remix vs CRA

| Option   | Pros                                      | Cons                                  |
| -------- | ----------------------------------------- | ------------------------------------- |
| Next.js 14 | App Router, SSR/SSG, i18n support, Vercel ecosystem, huge community | Can be complex with App Router patterns |
| Nuxt 3   | Vue-based, good DX                        | Vue expertise required, smaller community |
| Remix    | Great data loading patterns               | Smaller ecosystem, fewer resources    |
| CRA      | Simple SPA                               | No SSR, poor SEO, deprecated          |

**Decision: Next.js 14** — App Router provides excellent i18n routing for 3 languages (en/rw/ar), built-in image optimisation, SSR for SEO, and a massive ecosystem. `next-intl` provides robust i18n with RTL support needed for Arabic.

### Database: PostgreSQL vs MySQL vs MongoDB

| Option     | Pros                                    | Cons                              |
| ---------- | --------------------------------------- | --------------------------------- |
| PostgreSQL | ACID, JSON/B, extensions (pgvector), mature | Slightly more complex setup       |
| MySQL      | Widely hosted, simple                   | Less feature-rich than PostgreSQL |
| MongoDB    | Flexible schema                         | Eventual consistency, less suited to relational data |

**Decision: PostgreSQL 16** — The relational data model fits the structured member/service/finance domain. `pgvector` extension is needed for Phase 6 AI embeddings. `pgcrypto` for UUID generation. JSON/B for flexible metadata fields.

### Cache: Redis vs Memcached vs In-memory

**Decision: Redis 7** — Needed for JWT refresh token storage, OTP rate limiting, Bull job queues, and session caching. Redis supports all these use cases. Memcached lacks pub/sub and persistence.

### Infrastructure: AWS vs GCP vs Azure vs Local VPS

**Decision: AWS af-south-1 (Cape Town)** — Closest AWS region to Rwanda, low latency for East Africa users. EC2 + RDS + S3 + Route 53 + ACM covers all platform needs. IAM provides granular access control. Strong Terraform provider support.

---

## Consequences

### Positive

- Full TypeScript stack reduces context switching between frontend and backend
- NestJS + TypeORM combination is well-documented with active communities
- Next.js App Router handles complex i18n routing for 3 locales out of the box
- PostgreSQL with pgvector future-proofs the AI assistant feature (Phase 6)
- Docker Compose enables one-command local dev setup for all team members
- GitHub Actions CI/CD integrates natively with the repository

### Negative / Risks

- NestJS has a steeper learning curve than Express for developers unfamiliar with DI patterns
- Next.js App Router patterns (Server Components, layouts) require team training
- AWS af-south-1 has fewer services available than us-east-1; must verify service availability
- TypeORM has some known quirks with complex migrations; team must strictly avoid `synchronize: true`

### Mitigations

- Provide NestJS and Next.js onboarding documentation in `docs/`
- TypeORM migrations reviewed by Tech Lead before running in any environment
- All environment-specific config in `.env` files, never hardcoded
- `synchronize: false` enforced in all TypeORM configs

---

_Reviewed by: Tech Lead, Senior Backend Developer_  
_Next review: After Phase 2 completion or if a major architectural change is needed_
