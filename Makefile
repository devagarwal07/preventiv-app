COMPOSE_FILE=infra/docker/docker-compose.dev.yml

.PHONY: dev migrate seed test-api logs shell

dev:
	docker compose -f $(COMPOSE_FILE) up -d --build

migrate:
	docker run --rm \
		--network prevntiv-dev_prevntiv-net \
		-v $(PWD)/infra/postgres/migrations:/flyway/sql \
		flyway/flyway:10 \
		-url=jdbc:postgresql://postgres:5432/$(POSTGRES_DB) \
		-user=$(POSTGRES_USER) \
		-password=$(POSTGRES_PASSWORD) migrate

seed:
	docker compose -f $(COMPOSE_FILE) exec -T postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) -f /docker-entrypoint-initdb.d/migrations/V4__seed_dev.sql

test-api:
	docker compose -f $(COMPOSE_FILE) exec -T api pnpm test

logs:
	docker compose -f $(COMPOSE_FILE) logs -f $(service)

shell:
	docker compose -f $(COMPOSE_FILE) exec $(service) sh
