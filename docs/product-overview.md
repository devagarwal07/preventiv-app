# Prevntiv – Deep Product Overview

## Product scope
Prevntiv is a multi-surface health platform that ingests patient, lab, wearable, and engagement data; applies risk/anomaly models; and delivers provider- and patient-facing experiences (web, mobile, landing). The system is eventful/realtime (Socket.IO), notification-driven (email/push/in-app via queues), and observability-aware (Prometheus). It runs as a pnpm monorepo with typed contracts and shared UI components.

## Detailed feature map
- Patient profile & identity
  - Demographics, contact info, profile images (stored in MinIO `avatars` bucket).
  - JWT-based auth (access/refresh), bcrypt password hashing, rate limiting, CORS allowlist.
- Vitals capture and trends
  - Ingestion endpoints record vitals (e.g., HR, BP, temp, SpO2) into Postgres.
  - Charts in web/mobile using Recharts (web) and Victory (mobile); Socket.IO for live updates.
  - Load scripts in `tests/load/vitals-ingest.js` (k6) for throughput checks.
- Labs and documents
  - PDF uploads (multer), MIME sniffing via `file-type`, parsing via `pdf-parse`.
  - Stored in MinIO `lab-reports` bucket; metadata and structured fields in Postgres.
  - Signed/authorized access enforced through API with internal service key checks.
- Appointments & care plans
  - Scheduling, updates, reminders routed to notification service.
  - Care plan assignment, compliance tracking, and activity logging.
- Community & engagement
  - Forum/posts/comments APIs; Socket.IO rooms for realtime discussion updates.
  - In-app notifications emitted when new activity occurs.
- Organization & admin
  - Organization entities, roles/permissions, platform admin APIs.
  - Circuit breakers (`opossum`) and rate limiters wrap critical external calls.
- Notifications (multi-channel)
  - Email via Nodemailer + SMTP; push via Firebase Admin; in-app via WebSocket events.
  - Queuing with Bull + Redis; retry/backoff policies; per-template payload validation (Zod).
  - Templates stored in Postgres (notification service) and hydrated per channel.
- AI Engine (risk/anomaly)
  - FastAPI service providing risk scores and anomaly detection over vitals/time-series.
  - Uses asyncpg (Postgres) and Redis cache; Prometheus instrumentator for metrics.
- Wearables
  - Google Fit OAuth client credentials; Apple Health toggle for ingest/enablement.
  - Data lands in ingestion/API for downstream analytics and notifications.
- Monitoring & ops
  - `/health` endpoints for liveness; Prometheus metrics in API and AI Engine.
  - Optional Grafana dashboards (user-provided); Redis Commander and pgAdmin in dev stack.

## Repository layout (deep)
- `apps/web`: Next.js 14 app, React Query for data fetching, Axios for API calls, Socket.IO client for realtime, Recharts for vitals/care-plan visuals, Tailwind for styling, NextAuth for session management.
- `apps/mobile`: Expo SDK 51 (React Native 0.74), Expo Router navigation, React Query, Socket.IO client, NativeWind for styling, Moti for animation, Victory/Victory Native for charts, Expo notifications/file system/linking.
- `apps/landing`: Next.js 14 marketing site with framer-motion animations and CTA flows.
- `services/api`: Express + TypeScript. Key layers:
  - Routing and middleware: CORS, Helmet, rate limiting, cookie parsing, JWT auth guards.
  - Domains: auth, patients, vitals, labs, appointments, care plans, community, org/admin.
  - Storage: Postgres via `pg`, MinIO SDK for objects, Redis for caching/queues.
  - Realtime: Socket.IO server emitting patient/community/event updates.
  - Resilience: `opossum` circuit breakers around outbound calls (notification, AI engine, file ops).
  - Observability: `prom-client` metrics, morgan logging.
- `services/notification`: Express + TypeScript. Uses Bull + Redis for queueing; channels (email via Nodemailer/SMTP, push via Firebase Admin, in-app events); stores templates/logs in Postgres; validates payloads via Zod.
- `services/ai-engine`: FastAPI; routers `risk` and `anomaly`; models in `models/`; caching in Redis; DB via asyncpg; metrics via Prometheus instrumentator; served by Uvicorn.
- `services/ingestion`: Scaffold for future ingestion pipelines; currently stubs in package.json.
- `packages`:
  - `@prevntiv/shared-types`: cross-service TypeScript types.
  - `@prevntiv/validators`: Zod schemas for API validation.
  - `@prevntiv/ui-components`: shared React components (charts, cards, inputs) for web.
- `infra`: Docker Compose (dev), Flyway migrations under `infra/postgres/migrations`, monitoring assets.
- `tests`: k6 load scripts (`tests/load/vitals-ingest.js`) plus scaffolding for future suites.

## Tech stack details
- Runtime/tooling: Node.js 20, pnpm 9.12.2, TypeScript 5.6/5.9, Prettier/ESLint.
- API service libs: Express, Zod, Bull, Socket.IO, `pg`, `ioredis`, MinIO SDK, `jsonwebtoken`, `bcrypt`, Nodemailer, `helmet`, `cors`, `express-rate-limit`, `opossum`, `pdf-parse`, `file-type`, `multer`, `prom-client`.
- Notification service libs: Express, Bull, Nodemailer, Firebase Admin, `pg`, `ioredis`, Zod.
- AI Engine libs: FastAPI, uvicorn, scikit-learn, numpy, pandas, asyncpg, redis, prometheus-fastapi-instrumentator.
- Frontend libs: Next.js 14, React 18, React Query, Axios, Recharts, Socket.IO client, Tailwind (web); Expo Router, NativeWind, Moti, Victory/Victory Native, Expo modules (notifications, file system, document picker, image picker, sharing) for mobile.
- Infra: Docker Compose (Postgres 15, Redis 7, MinIO), pgAdmin, Redis Commander; Flyway for migrations; Make for shortcuts.

## Tech stack by layer (complete)
- Languages & runtimes: Node.js 20 (services, web, landing), Python 3.11 (AI Engine), TypeScript (all TS services/apps), React/React Native (web/mobile), Next.js 14 (web/landing), Expo SDK 51 (mobile), Bash/Make for ops helpers.
- Package/dependency mgmt: pnpm 9.12.2 workspaces; pip for AI Engine; Flyway for DB migrations.
- API/backend: Express 4, Socket.IO 4 (server), Bull 4 (Redis queues), Zod (validation), JWT auth (`jsonwebtoken`), bcrypt, multer + file-type, pdf-parse, opossum (circuit breaker), express-rate-limit, helmet/cors, prom-client metrics, Winston/morgan logging.
- Datastores & queues: Postgres 15 (`pg`, asyncpg), Redis 7 (`ioredis`/redis-py), Bull queues, MinIO (S3-compatible) for objects.
- AI/ML: FastAPI, Uvicorn, scikit-learn, numpy, pandas; custom risk/anomaly routers; Redis cache; Prometheus instrumentator.
- Frontend (web/landing): Next.js 14, React 18, React Query, Axios, Socket.IO client, Recharts, Tailwind, NextAuth for auth, framer-motion (landing animations).
- Frontend (mobile): Expo Router, React Native 0.74, React Query, Socket.IO client, NativeWind (Tailwind style), Moti (animation), Victory/Victory Native (charts), Expo modules (notifications, file system, document picker, image picker, sharing, linking), Expo Secure Store, Expo Health placeholder.
- Notifications: Nodemailer (SMTP), Firebase Admin (push), in-app events via Socket.IO; Bull workers per channel; templates/logs in Postgres.
- AuthN/AuthZ: JWT access/refresh, bcrypt password hashing, CORS allowlist, internal service keys for service-to-service calls.
- Storage & files: MinIO buckets `lab-reports` and `avatars`; multer upload pipeline; MIME sniffing; signed/authorized access via API.
- Realtime: Socket.IO namespaces/rooms for patient/community events; emitted from API.
- Observability: Prometheus exporters (API via prom-client; AI Engine via prometheus-fastapi-instrumentator), health endpoints, Docker healthchecks; optional Grafana dashboards.
- Infrastructure: Docker Compose dev stack (api, ai-engine, notification, postgres, redis, minio, pgadmin, redis-commander, minio-init); Make targets for dev/migrate/seed/logs/shell.
- Testing & QA: k6 load script for vitals ingest; placeholders for unit/integration; Expo/Next lint/typecheck scripts; format via Prettier; type checks via TS.

## Data flows (end-to-end examples)
- Vitals ingestion → API stores to Postgres → emits Socket.IO event → web/mobile update charts → AI Engine can be queried for anomaly scores → notification service can alert via email/push based on thresholds.
- Lab upload → API validates MIME and parses PDF → stores object in MinIO `lab-reports` → writes metadata row in Postgres → emits in-app notification → optional email with link.
- Appointment creation → API writes to Postgres → schedules notification job in Bull → notification worker sends email/push → Socket.IO notifies client for real-time UI update.
- Community post → API writes to Postgres → emits Socket.IO to the room → notification service pushes in-app/optional push.

## Configuration & environments
- Source templates: [.env.example](../.env.example)
- Local defaults: [.env.local](../.env.local)
- Critical keys per domain:
  - Auth: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, expiration values, `BCRYPT_ROUNDS`.
  - Internal calls: `INTERNAL_SERVICE_KEY` (API↔Notification), `AI_ENGINE_SERVICE_KEY`.
  - Storage: `DATABASE_URL`, `POSTGRES_*`, `REDIS_*`, `MINIO_*`, buckets `lab-reports`, `avatars`.
  - Services: `API_PORT`, `AI_ENGINE_PORT`, `NOTIFICATION_PORT`, URLs for cross-service calls.
  - Comms: SMTP creds for email, Firebase creds for push, CORS allowlist origins.
  - Wearables: Google Fit client ID/secret, Apple Health toggle.
  - Monitoring: `PROMETHEUS_ENABLED`, `GRAFANA_URL`.

## Setup (Dockerized, recommended)
1) Install Node 20+ and pnpm 9.12.2.
2) Copy env: `cp .env.example .env` (or start from `.env.local`).
3) Run: `make dev` (or `docker compose -f infra/docker/docker-compose.dev.yml up -d --build`).
4) Services/ports: API 3001, AI Engine 8000, Notification 3002, Postgres 5432, Redis 6379, MinIO 9000/9001, pgAdmin 5050, Redis Commander 8081.
5) Logs: `docker compose -f infra/docker/docker-compose.dev.yml logs -f api` (change service name as needed).

## Setup (manual, per service)
- API: `pnpm --filter @prevntiv/api dev` (requires running Postgres/Redis/MinIO and env configured).
- Notification: `pnpm --filter @prevntiv/notification dev` (Redis, SMTP/Firebase env required for full functionality).
- AI Engine:
  ```bash
  cd services/ai-engine
  python -m venv .venv
  .venv/Scripts/activate  # Windows; use source .venv/bin/activate on *nix
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  ```
- Web: `pnpm --filter @prevntiv/web dev`
- Landing: `pnpm --filter @prevntiv/landing dev`
- Mobile: `pnpm --filter @prevntiv/mobile dev` then use Expo Go or `expo run:ios` / `expo run:android` (ensure API URL points to your LAN IP for devices).

## Database migrations & seed
- Run Flyway migrations: `make migrate` (uses `infra/postgres/migrations`).
- Seed dev data: `make seed` (executes `V4__seed_dev.sql`).

## Testing, linting, typechecking, build
- Repo-wide: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- Service/app specifics:
  - API: `pnpm --filter @prevntiv/api typecheck` / `build` (tests placeholder currently).
  - Notification: `pnpm --filter @prevntiv/notification build`.
  - Web: `pnpm --filter @prevntiv/web lint` / `typecheck` / `build`.
  - Landing: `pnpm --filter @prevntiv/landing lint` / `typecheck` / `build`.
  - Mobile: `pnpm --filter @prevntiv/mobile build` (Expo export).
  - AI Engine: add `pytest` suite; install dev deps as needed.
  - Load: `k6 run tests/load/vitals-ingest.js`.

## Operations, queues, and observability
- Health: API `/health`, AI Engine `/health`; use Docker healthchecks for Postgres/Redis/MinIO.
- Metrics: `prom-client` in API, `prometheus-fastapi-instrumentator` in AI Engine; scrape from Prometheus.
- Queues: Bull workers rely on Redis; ensure `REDIS_URL` matches compose network; jobs handle retries/backoff.
- File storage: MinIO buckets auto-created by `minio-init` sidecar; access via SDK using `MINIO_*` envs.
- Realtime: Socket.IO namespace/rooms per patient/community to reduce broadcast fan-out.
- Rate limiting and circuit breaking: `express-rate-limit` and `opossum` wrap risky external calls.

## Mobile platform specifics
- iOS/Android via Expo; use LAN URL for API/Socket.IO when testing on devices.
- Push requires Firebase creds and proper config in notification service; Expo notifications can be used during development.

## Deployment considerations (prod)
- Build prod images: adapt `services/api/Dockerfile` to multi-stage; create non-dev Dockerfile for notification; use a slim Python base for AI Engine with pinned versions.
- Use managed Postgres/Redis and S3-compatible storage; configure TLS (HTTPS ingress) and secret management.
- Set strong, unique secrets for JWT, internal keys, SMTP/Firebase credentials; tighten CORS to allowed origins.
- Add CI for lint/typecheck/test; add e2e for web/mobile; publish metrics to Prometheus/Grafana with alerting.

## Known gaps / next steps
- Expand automated tests across services and UI e2e.
- Production-grade Dockerfiles for notification and AI Engine; optimize API build.
- Harden auth flows (refresh token rotation, revocation lists), rate limits, and CORS policies.
- Add Grafana dashboards and alert rules on latency, error rate, queue depth, and DB/Redis saturation.
- Flesh out ingestion service for wearable/batch data pipelines.
