# RMC Digital Platform

Rwanda Muslim Community (RMC) Digital Platform — a comprehensive membership, services, donations, events, and communications system for the Rwanda Muslim Community.

---

## Tech Stack

| Layer         | Technology              |
| ------------- | ----------------------- |
| Backend API   | NestJS 10 (TypeScript)  |
| Frontend      | Next.js 14 (TypeScript) |
| Database      | PostgreSQL 16           |
| Cache / Queue | Redis 7                 |
| ORM           | TypeORM                 |
| Containers    | Docker + Docker Compose |
| Cloud         | AWS (af-south-1)        |
| IaC           | Terraform               |
| CI/CD         | GitHub Actions          |

---

## Prerequisites

- Node.js 20+
- Docker Desktop (with Docker Compose v2)
- Git

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/rmc-platform/rmc-app.git
cd rmc-app

# 2. Copy environment variables
cp .env.example .env
# Edit .env and fill in required values (see comments in the file)

# 3. Start the full stack
make up

# 4. Run database migrations
make migrate

# 5. Seed reference data
make seed
```

### Local Service URLs

| Service       | URL                         |
| ------------- | --------------------------- |
| Backend API   | http://localhost:3000/api/v1 |
| API Docs      | http://localhost:3000/api/docs |
| Frontend      | http://localhost:3001        |
| MailHog       | http://localhost:8025        |
| MinIO Console | http://localhost:9001        |

---

## Repository Structure

```
rmc-platform/
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # Next.js app
├── infra/
│   ├── terraform/        # AWS IaC
│   ├── docker/           # Dockerfiles
│   ├── nginx/            # Nginx config templates
│   ├── grafana/          # Grafana dashboard JSON
│   ├── prometheus/       # Prometheus config & alerts
│   └── scripts/          # Operational scripts (backup, etc.)
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
└── Makefile
```

---

## Branching Strategy (GitFlow)

| Branch            | Purpose                         | Protection          |
| ----------------- | ------------------------------- | ------------------- |
| `main`            | Production-ready code           | 2 approvals, CI     |
| `develop`         | Integration branch              | 1 approval, CI      |
| `staging`         | Mirrors staging deployment      | Auto-updated by CD  |
| `feature/<id>-*`  | Feature development             | PR to develop       |
| `hotfix/<id>-*`   | Production hotfixes             | PR to main          |
| `release/v*.*.*`  | Release preparation             | PR to main          |

### Branch Workflow

```bash
# Start a new feature
git checkout develop
git pull origin develop
git checkout -b feature/AUTH-001-user-registration

# ... make changes, commit ...

# Open PR to develop (triggers CI)
# After approval and CI pass → merge to develop
```

---

## Available Make Commands

```bash
make up           # Start all services in background
make down         # Stop all services
make logs         # Follow all service logs
make restart      # Restart all services
make rebuild      # Rebuild images and start
make test         # Run full test suite in Docker
make db-shell     # Open PostgreSQL psql shell
make redis-cli    # Open Redis CLI
make migrate      # Run TypeORM migrations
make migrate-rev  # Revert last migration
make seed         # Run database seeders
make clean        # Remove all containers and volumes (WARNING: destroys data)
```

---

## Documentation

- [ADR-001: Technology Stack](docs/adr/ADR-001-technology-stack.md)
- [GitHub Secrets](docs/infra/github-secrets.md)
- [DB Restore Procedure](docs/infra/db-restore-procedure.md)

---

## Phase Overview

| Phase | Feature Area                        |
| ----- | ----------------------------------- |
| 1     | Foundation, Auth, RBAC              |
| 2     | Member Management, Digital ID       |
| 3     | Service Applications (7 services)   |
| 4     | Payments (MoMo, BK, Stripe)         |
| 5     | Donations, Campaigns, Orphans       |
| 6     | Events, Schools, Communications     |
| 7     | AI Assistant (Arabic/RW/EN)         |
| 8     | Finance Reporting, Analytics        |

---

_Rwanda Muslim Community Digital Platform — Confidential_
