.PHONY: up down logs restart rebuild test db-shell redis-cli migrate migrate-rev seed clean

# ── Local Development ─────────────────────────────────────────────────────────

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart

rebuild:
	docker compose up -d --build

# ── Testing ───────────────────────────────────────────────────────────────────

test:
	docker compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit --exit-code-from backend

test-unit:
	cd apps/backend && npm test

test-e2e:
	cd apps/backend && npm run test:e2e

test-cov:
	cd apps/backend && npm run test:cov

# ── Database ──────────────────────────────────────────────────────────────────

db-shell:
	docker compose exec postgres psql -U $${POSTGRES_USER:-rmc_user} -d $${POSTGRES_DB:-rmc_db}

migrate:
	cd apps/backend && npm run migration:run

migrate-rev:
	cd apps/backend && npm run migration:revert

seed:
	cd apps/backend && npm run seed

# ── Redis ─────────────────────────────────────────────────────────────────────

redis-cli:
	docker compose exec redis redis-cli -a $${REDIS_PASSWORD}

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean:
	@echo "WARNING: This will remove all containers and volumes (database data will be lost)"
	@read -p "Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose down -v

# ── Install ───────────────────────────────────────────────────────────────────

install:
	cd apps/backend && npm install
	cd apps/frontend && npm install

# ── Lint ─────────────────────────────────────────────────────────────────────

lint:
	cd apps/backend && npm run lint
	cd apps/frontend && npm run lint

format:
	cd apps/backend && npm run format
	cd apps/frontend && npx prettier --write "src/**/*.{ts,tsx}"
