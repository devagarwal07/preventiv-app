# Prevntiv Monorepo – Setup & Run

This repository is a pnpm-managed monorepo containing:
- Services: API (Express/TypeScript), Notification (Express/TypeScript), AI Engine (FastAPI/Python), Ingestion (scaffolded).
- Apps: Web (Next.js), Landing (Next.js), Mobile (Expo/React Native).
- Infra: Docker Compose stack for Postgres, Redis, MinIO, and dev tooling.

## Prerequisites
- Node.js 20+ and pnpm 9.12.2 (matches `packageManager`).
- Docker and Docker Compose (for the full local stack).
- Python 3.11+ with `venv` (for local AI Engine outside Docker).
- Make (optional convenience; you can run the equivalent Docker Compose commands directly).

## 1) Install dependencies
```bash
pnpm install
```

## 2) Configure environment
1) Copy the sample env file and fill in values:
```bash
cp .env.example .env
```
2) Minimum useful local values (tune as needed):
- `POSTGRES_DB=prevntiv`
- `POSTGRES_USER=prevntiv`
- `POSTGRES_PASSWORD=prevntiv`
- `REDIS_PASSWORD=prevntiv`
- `MINIO_ACCESS_KEY=prevntiv`
- `MINIO_SECRET_KEY=prevntiv`
- `COMPOSE_PROJECT_NAME=prevntiv-dev`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: random strings
- `AI_ENGINE_PORT=8000`, `API_PORT=3001`, `NOTIFICATION_PORT=3002`

All other keys in `.env.example` (SMTP, Firebase, OAuth, monitoring) are optional until you enable those features.

## 3) Run everything with Docker Compose (recommended)
Use the provided dev stack, which builds API, AI Engine, and Notification, and boots Postgres, Redis, MinIO, pgAdmin, and Redis Commander.

```bash
# uses infra/docker/docker-compose.dev.yml
make dev
# or
docker compose -f infra/docker/docker-compose.dev.yml up -d --build
```

Useful commands:
- View logs for a service: `docker compose -f infra/docker/docker-compose.dev.yml logs -f api`
- Stop stack: `docker compose -f infra/docker/docker-compose.dev.yml down`

Exposed ports (host → container):
- API 3001 → 3001
- AI Engine 8000 → 8000
- Notification 3002 → 3002
- Postgres 5432 → 5432
- Redis 6379 → 6379
- MinIO 9000/9001 → 9000/9001 (console on 9001)
- pgAdmin 5050 → 80
- Redis Commander 8081 → 8081

## 4) Run services without Docker (manual mode)
Ensure Postgres, Redis, and MinIO are running and env vars are set locally.

### API (TypeScript/Express)
```bash
pnpm --filter @prevntiv/api dev
```

### Notification (TypeScript/Express)
```bash
pnpm --filter @prevntiv/notification dev
```

### AI Engine (FastAPI/Python)
```bash
cd services/ai-engine
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Web app (Next.js)
```bash
pnpm --filter @prevntiv/web dev
```

### Landing app (Next.js)
```bash
pnpm --filter @prevntiv/landing dev
```

### Mobile app (Expo)
```bash
pnpm --filter @prevntiv/mobile dev
```
Use the Expo CLI output (QR code) to open on a device or simulator.

## 5) Database migrations and seed
Flyway migrations mount from `infra/postgres/migrations` in the dev stack. To run them manually:
```bash
make migrate
```
Seed sample data (dev only):
```bash
make seed
```

## 6) Test, lint, typecheck, build
Run across the monorepo:
```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```
Service/app-specific scripts:
- API: `pnpm --filter @prevntiv/api build` (or `dev`, `typecheck`).
- Notification: `pnpm --filter @prevntiv/notification build`.
- Web: `pnpm --filter @prevntiv/web lint` / `typecheck` / `build`.
- Landing: `pnpm --filter @prevntiv/landing lint` / `typecheck` / `build`.
- Mobile: `pnpm --filter @prevntiv/mobile build` (Expo export).

## 7) Troubleshooting
- If containers can’t reach each other, confirm `.env` matches the values used in `infra/docker/docker-compose.dev.yml` and that `COMPOSE_PROJECT_NAME` is set.
- If ports are busy, stop previous runs (`docker compose ... down`) or change the host ports in the compose file.
- For AI Engine local runs, ensure your Python venv is active when installing/running.
- For Expo, install the Expo Go app or configure an emulator/simulator and ensure your machine and device are on the same network.
