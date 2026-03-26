# Prevntiv — Complete Build Prompt Sequence
## Market-Ready & Production-Ready | 100% Free / Open-Source Tech Stack

---

## Master Tech Stack (Zero Paid Dependencies)

| Layer | Technology | Why |
|---|---|---|
| Mobile App | React Native (Expo) | Free, cross-platform iOS + Android |
| Web Dashboard | Next.js 14 + TailwindCSS | Free, SSR, professional dashboard |
| Backend API | Node.js + Express + TypeScript | Free, scalable REST + WebSocket |
| AI/ML Engine | Python + FastAPI + scikit-learn | Free, local model inference |
| Primary Database | PostgreSQL (self-hosted) | Free, HIPAA-friendly, relational |
| Cache / Queues | Redis (free, self-hosted) | Sessions, real-time, job queues |
| Auth | Supabase Auth (free tier) OR Keycloak | Role-based, OTP, JWT |
| File Storage | MinIO (self-hosted S3-compatible) | Lab PDFs, profile images |
| Real-time | Socket.io | Live vitals, alerts |
| Notifications | Firebase FCM (free) + Nodemailer | Push + email |
| PDF Parsing | pdf-parse (npm) + PyMuPDF | Lab report extraction |
| Charts (Web) | Recharts | Vitals trends, risk scores |
| Charts (Mobile) | Victory Native | Wearable data |
| Wearables | Google Fit REST API + Apple HealthKit | Free tier |
| Containerization | Docker + Docker Compose | Portable, production-ready |
| Reverse Proxy | Nginx (free) | TLS, load balancing |
| CI/CD | GitHub Actions (free tier) | Automated build + deploy |
| Monitoring | Grafana + Prometheus | Free observability stack |
| Logging | Winston + Loki (free) | Structured logs |
| Secret Management | dotenv + Docker secrets | Secure config |
| Testing | Jest + Supertest + Pytest | Unit + integration |

---

## Project Architecture Overview

```
prevntiv/
├── apps/
│   ├── mobile/          → React Native (Expo) — Patient App
│   ├── web/             → Next.js — Professional + Admin Dashboard
│   └── landing/         → Next.js — Marketing site
├── services/
│   ├── api/             → Node.js/Express — Core REST API
│   ├── ai-engine/       → Python/FastAPI — ML Risk Engine
│   ├── notification/    → Node.js — Push + Email service
│   └── ingestion/       → Node.js — Wearable + lab data pipeline
├── packages/
│   ├── shared-types/    → TypeScript interfaces shared across apps
│   ├── ui-components/   → Shared React component library
│   └── validators/      → Zod schemas shared across services
├── infra/
│   ├── docker/          → Docker Compose files
│   ├── nginx/           → Reverse proxy config
│   ├── postgres/        → DB migrations (using Flyway/pg-migrate)
│   └── monitoring/      → Grafana + Prometheus configs
└── docs/
    ├── api/             → OpenAPI spec
    └── architecture/    → ADRs
```

---

# PHASE 0 — Architecture Blueprint & Design System

---

## Prompt 0.1 — Monorepo Scaffold

```
Set up a production-grade monorepo for a healthcare platform called Prevntiv using pnpm workspaces.

Structure:
- apps/mobile (React Native + Expo)
- apps/web (Next.js 14 with App Router)
- apps/landing (Next.js 14)
- services/api (Node.js + Express + TypeScript)
- services/ai-engine (Python + FastAPI)
- services/notification (Node.js)
- packages/shared-types (TypeScript interfaces)
- packages/ui-components (React component library)
- packages/validators (Zod schemas)

Requirements:
- pnpm-workspace.yaml with all packages listed
- Root package.json with dev, build, test, lint scripts
- TypeScript 5.x base tsconfig.json that all packages extend
- ESLint + Prettier config at root
- .gitignore for Node, Python, Expo, Next.js
- .env.example with all env variable placeholders (no values)
- GitHub Actions workflow: lint + typecheck on every PR

Output every file in full. Explain the monorepo dependency resolution strategy.
```

---

## Prompt 0.2 — Database Schema Design

```
Design the complete PostgreSQL database schema for Prevntiv, a preventive healthcare platform.

User roles: Patient, Doctor, Dietician, Physiotherapist, Hospital/Clinic Admin, Platform Admin.

Tables required:

USERS & AUTH:
- users (id, email, phone, role, is_verified, created_at)
- user_profiles (user_id, name, dob, gender, avatar_url, address)
- professional_verifications (user_id, license_no, specialization, verified_at)
- organizations (id, name, type: hospital|clinic, address, admin_user_id)
- org_memberships (org_id, user_id, role)

HEALTH DATA:
- patient_baselines (patient_id, height, weight, blood_type, chronic_conditions[], allergies[], medications[])
- vitals (id, patient_id, type: bp|glucose|hr|spo2|weight|steps|hrv|sleep, value jsonb, source: wearable|manual|lab, timestamp, is_anomaly)
- lab_reports (id, patient_id, file_url, extracted_data jsonb, uploaded_by, uploaded_at)
- health_timeline (id, patient_id, event_type, summary, related_record_id, occurred_at)

CARE:
- consultations (id, patient_id, professional_id, notes, diagnosis, occurred_at)
- care_plans (id, patient_id, created_by, type: medical|nutrition|rehab, title, status: active|completed|paused)
- care_plan_items (id, care_plan_id, action, frequency, instructions, due_date)
- care_plan_acknowledgments (care_plan_id, patient_id, acknowledged_at)
- appointments (id, patient_id, professional_id, scheduled_at, status, outcome_notes)
- follow_ups (id, appointment_id, due_date, completed_at, notes)

AI & ALERTS:
- risk_scores (id, patient_id, category: cardiovascular|glycemic|lifestyle, score: low|moderate|high, computed_at)
- anomalies (id, patient_id, vital_id, description, severity, is_resolved, detected_at)
- alerts (id, patient_id, professional_id, type, message, is_read, created_at)

COMMUNITY:
- community_posts (id, author_id, category, content, is_verified_professional, created_at)
- community_comments (id, post_id, author_id, content, created_at)
- community_reactions (post_id, user_id, type)

Write:
1. Full SQL CREATE TABLE statements with proper types, constraints, indexes
2. Foreign key relationships
3. Row-level security policies (Postgres RLS) for role-based access
4. Indexes for all commonly-queried columns (patient_id, timestamp ranges, org_id)
5. A Flyway migration file naming strategy
6. Seed SQL for development (3 patients, 2 doctors, 1 dietician, 1 org)
```

---

## Prompt 0.3 — Shared Types & Validators Package

```
Build the packages/shared-types and packages/validators packages for Prevntiv.

shared-types must export TypeScript interfaces for every entity in the database:
- User, UserProfile, Organization, OrgMembership
- PatientBaseline, Vital, VitalType enum, LabReport
- CarePlan, CarePlanItem, Consultation, Appointment
- RiskScore, RiskCategory enum, Anomaly, Alert
- CommunityPost, CommunityComment

validators must export Zod schemas that:
- Mirror every shared-type interface
- Add input validation (email format, phone format, date ranges, enum checks)
- Export both schema and inferred type from each schema
- Include create schemas (for POST) and update schemas (for PATCH, all fields optional)

Also export:
- APIResponse<T> generic type: { success: boolean, data: T, error?: string, meta?: PaginationMeta }
- PaginationMeta: { page, limit, total, totalPages }
- All enums as const objects (so they work in both TS runtime and type system)

Output full package.json, tsconfig.json, index.ts and all type files. Show how another service imports from this package.
```

---

# PHASE 1 — Core API Infrastructure

---

## Prompt 1.1 — Express API Server Foundation

```
Build the foundation of the Prevntiv core API using Node.js + Express + TypeScript.

Stack: Express 4, TypeScript 5, pg (node-postgres), Redis (ioredis), Zod, Winston logger, helmet, cors, express-rate-limit.

Implement:

1. Server setup (src/server.ts):
   - Helmet for security headers
   - CORS with whitelist
   - JSON body parser with 10mb limit (for lab PDF base64)
   - Rate limiter: 100 req/15min general, 10 req/15min for auth routes
   - Request ID middleware (uuid per request)
   - Morgan HTTP logger piped to Winston

2. Database connection (src/db/pool.ts):
   - pg Pool with max 20 connections
   - Retry logic on startup (5 retries, exponential backoff)
   - Health check query on connect

3. Redis connection (src/cache/client.ts):
   - ioredis with reconnect strategy
   - Typed wrapper: get<T>, set<T> with TTL, del, hget, hset

4. Error handling (src/middleware/errorHandler.ts):
   - Zod validation errors → 400 with field-level messages
   - Custom AppError class with statusCode
   - Uncaught errors → 500 with request ID in response
   - Never leak stack traces in production

5. Response helpers (src/utils/response.ts):
   - success<T>(res, data, statusCode?)
   - paginated<T>(res, data, meta)
   - error(res, message, statusCode?)

6. Health check route: GET /health → { status, db, redis, uptime }

7. Graceful shutdown: SIGTERM drains in-flight requests, closes DB pool and Redis

Output all files in full. Show the folder structure.
```

---

## Prompt 1.2 — Authentication System

```
Build the complete authentication system for Prevntiv API.

Use: JWT (jsonwebtoken), bcrypt, Supabase Auth client OR custom OTP with Redis.

Implement these flows:

1. POST /auth/register
   - Validate with Zod (name, email, phone, password, role)
   - Hash password with bcrypt (12 rounds)
   - Insert user + user_profile in a DB transaction
   - Send verification email via Nodemailer (template: welcome + verify link)
   - Return sanitized user (no password)

2. POST /auth/login
   - Email+password login
   - Issue access token (15min) + refresh token (7 days, stored in Redis as hash against user_id)
   - Set refresh token as HttpOnly cookie
   - Return user object + access token in body

3. POST /auth/refresh
   - Read refresh token from HttpOnly cookie
   - Validate against Redis
   - Issue new access token (rotate refresh token)

4. POST /auth/logout
   - Delete refresh token from Redis
   - Clear cookie

5. POST /auth/otp/send
   - Generate 6-digit OTP
   - Store in Redis with 10min TTL: key = otp:{phone}
   - Send via console.log (simulate SMS — replace with free Twilio trial or MSG91)

6. POST /auth/otp/verify
   - Verify OTP from Redis
   - If valid, mark phone as verified

7. Middleware: authenticate
   - Verify JWT, attach req.user = { id, role, orgId }
   - Role guard factory: requireRole(...roles)

8. Professional verification flag:
   - is_verified defaults to false for doctors/dieticians/physios
   - Routes can require requireRole + requireVerified

Output all route files, middleware, and token utility functions.
```

---

## Prompt 1.3 — Docker Compose Development Environment

```
Write a complete Docker Compose setup for local Prevntiv development.

Services:
1. postgres:15 — port 5432, named volume, health check
2. redis:7-alpine — port 6379, password via env
3. minio/minio — port 9000 (API) + 9001 (console), two buckets: lab-reports, avatars
4. api (Node.js) — built from services/api/Dockerfile.dev, hot reload with ts-node-dev, port 3001
5. ai-engine (Python) — built from services/ai-engine/Dockerfile.dev, hot reload with uvicorn --reload, port 8000
6. notification (Node.js) — port 3002
7. pgadmin (dpage/pgadmin4) — port 5050, for dev database inspection
8. redis-commander — port 8081, for dev Redis inspection

Also write:
- services/api/Dockerfile.dev (multi-stage aware, dev target)
- services/api/Dockerfile (production multi-stage: build → slim runtime)
- services/ai-engine/Dockerfile.dev
- services/ai-engine/Dockerfile (production)
- .env.example with every variable

Networking: all services on a "prevntiv-net" bridge network. No ports exposed except what's needed.

Include a Makefile with:
- make dev (start all)
- make migrate (run Flyway migrations)
- make seed (run seed SQL)
- make test-api (run Jest tests in api container)
- make logs service=api
- make shell service=postgres
```

---

# PHASE 2 — Patient Health Profile & EHR

---

## Prompt 2.1 — Patient Profile API

```
Build the Patient Profile module for Prevntiv API.

Routes (all require authenticate middleware):

1. POST /patients/onboarding
   - Creates PatientBaseline record
   - Fields: height (cm), weight (kg), blood_type, chronic_conditions (string[]), allergies (string[]), medications (array of {name, dosage, frequency}), lifestyle: {smoking, alcohol, exercise_frequency, diet_type}
   - Validates with Zod
   - Returns baseline_id

2. GET /patients/:patientId/profile
   - Returns merged user + user_profile + patient_baseline
   - Patients can only see their own; professionals see assigned patients; admins see all
   - Implement the access control logic as a helper: canAccessPatient(requestingUser, patientId)

3. PATCH /patients/:patientId/profile
   - Update user_profile fields (name, dob, gender, avatar_url)
   - Partial update with Zod .partial()

4. PATCH /patients/:patientId/baseline
   - Update baseline health data
   - Version the old record (store in a patient_baseline_history table) before updating

5. GET /patients/:patientId/ehr
   - Returns full EHR view:
     - Profile + baseline
     - Last 30 vitals per type
     - All lab reports (metadata only, not file content)
     - All care plans (active)
     - All consultations (last 5)
     - Current risk scores
     - Unresolved anomalies
   - Cache in Redis for 5min with key: ehr:{patientId}
   - Invalidate cache whenever any sub-entity changes (implement cache tags pattern)

Implement a middleware: requirePatientAccess that handles the role-based access control for all patient routes.

Output all route handlers, service functions (business logic separate from route handlers), and type definitions.
```

---

## Prompt 2.2 — Vitals Data Ingestion

```
Build the vitals ingestion module for Prevntiv.

Routes:

1. POST /vitals/manual
   - Patient submits a manual reading
   - Validate: type (enum: bp|glucose|hr|spo2|weight|steps|hrv|sleep|temperature), value (jsonb varies by type), timestamp
   - Value schema per type:
     * bp: { systolic: number, diastolic: number }
     * glucose: { value: number, unit: 'mg/dL'|'mmol/L', context: 'fasting'|'post_meal'|'random' }
     * hr: { bpm: number }
     * spo2: { percent: number }
     * sleep: { duration_minutes: number, deep_sleep_minutes: number, rem_minutes: number, quality_score: number }
     * steps: { count: number }
     * hrv: { ms: number }
   - After insert, call the AI Engine asynchronously (via internal HTTP or job queue) for anomaly detection
   - Return inserted vital with is_anomaly field

2. POST /vitals/sync/google-fit
   - Accepts access_token and date range
   - Fetches steps, HR, sleep from Google Fit Data Sources API
   - Normalizes to internal schema
   - Bulk upsert (ON CONFLICT DO NOTHING for duplicate timestamps)
   - Returns { synced_count, skipped_count }

3. POST /vitals/sync/apple-health
   - Accepts a JSON payload exported from HealthKit (React Native expo-health)
   - Normalizes and bulk inserts

4. GET /vitals/:patientId
   - Query params: type, from (ISO date), to (ISO date), limit, page
   - Returns paginated vitals with trend metadata:
     * 7-day average for the type
     * Change vs previous 7-day average (delta %)
     * Is current trending up, down, or stable

5. GET /vitals/:patientId/summary
   - Returns latest reading per type + 7-day averages for dashboard display

Implement a VitalsNormalizer class that handles unit conversion and schema standardization across all sources.
```

---

## Prompt 2.3 — Lab Report Upload & Extraction

```
Build the lab report ingestion module for Prevntiv.

Requirements:

1. POST /labs/upload
   - Multipart form: PDF or image file + patient_id
   - Validate file type (application/pdf, image/jpeg, image/png), max 10MB
   - Upload to MinIO bucket "lab-reports" with key: {patient_id}/{uuid}.{ext}
   - Save metadata to lab_reports table (file_url, patient_id, uploaded_by)
   - Enqueue extraction job to Redis Bull queue
   - Return { report_id, status: 'processing' }

2. Lab Report Extraction Worker (src/workers/labExtractor.ts):
   - Uses Bull queue "lab-extraction"
   - For PDFs: use pdf-parse to extract raw text
   - Pattern match using regex to extract common Indian lab values:
     * HbA1c: /HbA1c[\s:]*([0-9.]+)\s*%/i
     * Fasting Glucose: /Fasting[\s\w]*Glucose[\s:]*([0-9.]+)/i
     * Total Cholesterol: /Total[\s]*Cholesterol[\s:]*([0-9.]+)/i
     * HDL, LDL, Triglycerides, Creatinine, Hemoglobin, TSH, Vitamin D, B12
   - Store extracted_data jsonb in lab_reports
   - Create vitals records for extracted values (source: 'lab')
   - Update report status: 'processed' or 'extraction_failed'
   - Notify patient via socket: lab-report-processed event

3. GET /labs/:patientId
   - Paginated list of lab reports with status
   - Sorted by uploaded_at desc

4. GET /labs/:patientId/:reportId
   - Returns metadata + extracted_data + signed MinIO URL (valid 1hr)

5. POST /labs/:reportId/manual-values
   - Professional can manually add/correct extracted values
   - Audit log the change (who, what, when)

Build the Bull queue setup with concurrency 3, retry on failure 3 times with exponential backoff.
```

---

# PHASE 3 — AI & Preventive Intelligence Engine

---

## Prompt 3.1 — Python FastAPI AI Engine Foundation

```
Build the AI Engine service for Prevntiv using Python 3.11 + FastAPI + scikit-learn.

Project structure:
services/ai-engine/
├── main.py
├── models/
│   ├── risk_scorer.py
│   ├── anomaly_detector.py
│   └── insight_generator.py
├── schemas/
│   ├── vitals.py
│   └── risk.py
├── utils/
│   ├── db.py (asyncpg connection pool)
│   └── normalization.py
├── routers/
│   ├── risk.py
│   └── anomaly.py
└── requirements.txt

Dependencies (all free): fastapi, uvicorn, scikit-learn, numpy, pandas, asyncpg, pydantic, python-dotenv

Implement:

1. POST /ai/risk-score/{patient_id}
   - Pull last 30 days vitals from DB via asyncpg
   - Pull patient_baseline
   - Compute 3 risk scores:

   CARDIOVASCULAR RISK:
   - Inputs: avg systolic BP, avg HR, HbA1c (from labs), age, smoking, exercise_frequency
   - Algorithm: rule-based scoring with weighted factors
     * BP >= 140 → +3 points, 130-139 → +2, 120-129 → +1
     * HR resting > 100 → +2, 80-100 → +1
     * HbA1c > 6.5 → +3, 5.7-6.5 → +2
     * Age > 50 → +2, 40-50 → +1
     * Smoker → +3
     * Exercise < 2x/week → +2
   - Score 0-3: Low, 4-7: Moderate, 8+: High

   GLYCEMIC INSTABILITY:
   - Inputs: fasting glucose readings (last 14 days), post-meal glucose, HbA1c
   - CV (coefficient of variation) of glucose > 36% → High
   - Mean fasting glucose > 126 mg/dL → High
   - Mean fasting glucose 100-125 → Moderate

   LIFESTYLE DETERIORATION:
   - Inputs: avg steps/day (last 7d vs previous 7d), avg sleep quality, avg sleep duration
   - Steps trending down > 20% → +2
   - Sleep quality avg < 60 → +2
   - Sleep duration avg < 6h → +2

   Return: { patient_id, scores: [...], computed_at, explanations: { [category]: string[] } }
   Store results in risk_scores table.

2. POST /ai/anomaly-detect
   - Accepts single vital reading
   - Implements Z-score anomaly detection against patient's own 30-day baseline (not population norms)
   - Thresholds:
     * BP systolic > 180 or < 80 → immediate alert
     * HR > 150 or < 40 → immediate alert
     * SpO2 < 90% → immediate alert
     * Z-score > 2.5 compared to personal baseline → flag as anomaly
   - Return: { is_anomaly, severity: 'low'|'medium'|'critical', explanation }

3. POST /ai/insights/{patient_id}
   - Generate 3-5 human-readable insight strings based on data trends
   - Examples: "Your average BP has been trending higher than your personal baseline over the past 5 days", "Sleep debt detected for 4 consecutive nights"
   - Templates are rule-based (not LLM) for cost-free operation
   - Return: { insights: [{ message, category, severity, data_points }] }

Include Pydantic schemas for all inputs/outputs. Add basic auth (shared secret header X-Service-Key) for service-to-service calls.
```

---

## Prompt 3.2 — Risk Trend Engine & Insight Templates

```
Extend the Prevntiv AI Engine with trend analysis and a full insight template library.

Build src/models/trend_analyzer.py:

Classes:
1. TrendAnalyzer
   - compute_trend(values: List[float], timestamps: List[datetime]) → TrendResult
   - Uses linear regression (numpy) to compute slope
   - Classifies as: rapidly_increasing | slowly_increasing | stable | slowly_decreasing | rapidly_decreasing
   - Returns: { direction, slope, r_squared, change_percent_7d, change_percent_30d }

2. ConsecutivePatternDetector
   - detect_consecutive_nights_poor_sleep(sleep_records, threshold=60, min_consecutive=3) → bool
   - detect_elevated_bp_days(bp_records, threshold=130, min_days=3) → { detected, count, avg_value }
   - detect_step_deficit_week(step_records, patient_target=8000) → { detected, avg_steps, deficit_percent }

3. InsightTemplateEngine
   - Full library of insight templates (at least 20) keyed by condition:
   ```python
   TEMPLATES = {
     "bp_trending_high": "Your average blood pressure has been {change}% higher than your baseline over the past {days} days.",
     "sleep_debt": "Sleep debt detected for {consecutive} consecutive nights. Average sleep duration is {avg}h, below your {target}h target.",
     "steps_declining": "Your daily step count has decreased by {percent}% compared to last week.",
     "glucose_spikes": "Post-meal glucose spikes detected on {count} occasions this week. Consider reviewing your diet.",
     "low_hrv": "Your HRV has been trending lower than baseline, which can indicate recovery stress.",
     "good_streak_bp": "Great news — your blood pressure has been within healthy range for {days} consecutive days.",
     "lab_due": "Based on your health profile, your next HbA1c check is recommended within {days} days.",
     # ... add 14 more covering sleep, steps, HR, SpO2, weight trends, lab timing
   }
   ```
   - generate_insights(patient_id, vitals_data, baseline) → List[Insight]
   - Returns max 5 insights sorted by severity (critical first)
   - Never returns the same insight type twice per day (dedup in Redis)

Build an endpoint POST /ai/full-analysis/{patient_id} that:
1. Runs trend analysis on all available vitals
2. Computes all 3 risk scores
3. Runs anomaly detection on latest readings
4. Generates insights
5. Returns all in one response
6. Stores results with computed_at timestamp
7. Returns 304 if analysis is less than 6 hours old (check Redis cache)
```

---

# PHASE 4 — Alerts & Notifications

---

## Prompt 4.1 — Notification Service

```
Build the Notification Service for Prevntiv as a standalone Node.js service.

Stack: Node.js + TypeScript + Firebase Admin SDK (FCM, free tier) + Nodemailer + Redis Bull queue.

Structure:
services/notification/
├── src/
│   ├── index.ts
│   ├── channels/
│   │   ├── push.ts        (Firebase FCM)
│   │   ├── email.ts       (Nodemailer with Gmail SMTP free)
│   │   └── inApp.ts       (writes to alerts table + emits socket event)
│   ├── templates/
│   │   ├── email/         (HTML email templates)
│   │   └── push/          (push notification copy)
│   ├── workers/
│   │   └── notificationWorker.ts
│   └── router.ts          (internal API for other services to call)

Implement:

1. FCM Push Notifications (push.ts):
   - Initialize Firebase Admin with service account JSON (free)
   - sendPush(userId, { title, body, data }) → looks up FCM token from DB
   - sendBulkPush(userIds[], notification) → batched FCM multicast
   - Store FCM tokens: POST /devices/register { userId, fcmToken, platform }

2. Email Notifications (email.ts):
   - Nodemailer with Gmail SMTP (free, 500/day)
   - sendEmail(to, subject, htmlTemplate, variables)
   - Templates to build:
     * welcome.html (signup)
     * critical-alert.html (anomaly detected)
     * care-plan-update.html
     * follow-up-reminder.html
     * weekly-health-summary.html (digest)

3. Notification Queue Worker:
   - Bull queue "notifications"
   - Job types: immediate | scheduled | digest
   - Process push + email in parallel
   - Retry 3 times on failure
   - Log delivery status to notifications_log table

4. Alert Rules Engine (src/rules/alertRules.ts):
   - evaluateVital(vital, baseline, riskScores) → Alert[]
   - Rule definitions:
     * CRITICAL_BP: systolic > 180 → immediate push to patient + ALL assigned professionals
     * CRITICAL_SPO2: < 90% → same
     * HIGH_RISK_SCORE: any category = High → push to assigned doctor
     * MISSED_MEASUREMENT: no vitals in 24h (cron) → reminder push to patient
     * CARE_PLAN_DUE: upcoming care plan actions → reminder
     * LAB_PROCESSED: → notify patient
   - Dedup: don't re-alert same rule within cooldown period (stored in Redis SET)

5. POST /internal/notify (service-to-service, requires X-Service-Key header)
   - Accepts { userId, type, channels: ['push','email','inApp'], payload }
   - Enqueues to Bull

6. GET /notifications (patient/professional)
   - Returns paginated in-app alerts for the authenticated user
   - Supports mark-as-read (PATCH /notifications/:id/read) and mark-all-read

Output all files in full.
```

---

## Prompt 4.2 — Real-time WebSocket Layer

```
Add real-time capabilities to the Prevntiv API using Socket.io.

Implement in services/api/src/realtime/:

1. Socket Server Setup (socketServer.ts):
   - Attach Socket.io to existing Express HTTP server
   - Authenticate connections: middleware validates JWT from auth handshake query param
   - Attach user { id, role } to socket
   - Rooms strategy:
     * patient room: "patient:{patientId}" — patient joins their own room
     * professional room: "professional:{professionalId}"
     * org room: "org:{orgId}" — org admins see org-wide events

2. Events — Server → Client:
   - vital:added — { vital } — emitted to patient room when new vital saved
   - anomaly:detected — { anomaly, vital } — patient room + all assigned professionals
   - alert:new — { alert } — recipient's personal room
   - care-plan:updated — { carePlan } — patient room
   - lab-report:processed — { reportId, extractedData } — patient room
   - risk-score:updated — { riskScores } — patient room + assigned doctor
   - follow-up:reminder — { appointment } — patient room

3. Events — Client → Server:
   - vital:submit — patient submits real-time reading (processed same as REST POST)
   - notification:read — marks notification read

4. Presence System:
   - Track connected users in Redis HSET: "online:{userId}" → last_seen timestamp
   - Professional dashboard shows which patients are currently active
   - GET /presence/patients/:professionalId → list of assigned patients with online status

5. Integration points:
   - After any vital insert in VitalsService → emit to socket room
   - After AI Engine anomaly detect → emit anomaly event
   - After notification delivery → emit alert:new

Show the full typing for all socket events using TypeScript declaration merging on Socket.io's types.
```

---

# PHASE 5 — Care Plans & Appointments

---

## Prompt 5.1 — Care Plans Module

```
Build the Care Plans module for Prevntiv.

Routes:

1. POST /care-plans
   - Only doctors, dieticians, physiotherapists can create
   - Validate: patient_id, type (medical|nutrition|rehab), title, items[]
   - Each item: { action, frequency (daily|weekly|monthly), instructions, due_date, reminder: bool }
   - On create: notify patient via notification service
   - Emit: care-plan:updated socket event

2. GET /care-plans/:patientId
   - Returns all care plans with items and current completion status
   - Shows last acknowledgment timestamp per plan

3. PATCH /care-plans/:planId
   - Professional can update title, add/remove items, change status
   - Version history: store old version in care_plan_versions table before update
   - Notify patient of changes

4. POST /care-plans/:planId/acknowledge
   - Patient acknowledges they've read/understood the plan
   - Stores in care_plan_acknowledgments

5. POST /care-plans/:planId/items/:itemId/complete
   - Patient marks a care plan action as completed for today
   - Stores in care_plan_completions (item_id, patient_id, completed_at, notes)

6. GET /care-plans/:patientId/adherence
   - Returns adherence metrics:
     * Per-plan: completion rate % for last 7d, 30d
     * Per-item: streak (consecutive days completed)
     * Overall adherence score (0-100)
   - Cache for 1hr

7. Collaboration rules:
   - A patient can have care plans from multiple professionals (doctor + dietician + physio)
   - Each professional can only edit their own plan
   - Patients can view all plans consolidated

Also implement a daily cron job (node-cron) that:
- Runs at 8am local time per patient (based on timezone in profile)
- Checks for due care plan items today
- Enqueues reminder notifications for items with reminder: true

Output full route handlers + service layer.
```

---

## Prompt 5.2 — Appointments & Follow-ups

```
Build the Appointments and Follow-ups module for Prevntiv.

Routes:

1. POST /appointments
   - Book a follow-up: { patient_id, professional_id, scheduled_at, type: 'in-person'|'follow-up', notes }
   - Validate: professional must be accessible to patient (via org membership or previous consultation)
   - Creates appointment record
   - Schedules reminder notifications: 24hr before + 1hr before (using Bull delayed jobs)
   - Returns appointment with professional details

2. GET /appointments
   - For patient: their upcoming + past appointments
   - For professional: their schedule (today, this week, all)
   - Supports ?from=&to= date filter, ?status=

3. PATCH /appointments/:id
   - Update: status (confirmed|cancelled|completed), outcome_notes, rescheduled_at
   - If cancelled: cancel queued reminder notifications
   - If completed: auto-create a follow-up suggestion based on care plan

4. POST /appointments/:id/follow-up
   - Creates follow_up linked to appointment
   - Sets due_date
   - Schedules due-date reminder

5. GET /follow-ups/professional/:professionalId
   - Dashboard view: overdue follow-ups, due today, upcoming week
   - Sorted by risk level of patient

6. POST /appointments/:id/notes
   - Professional adds consultation notes
   - These go into the health_timeline as an event
   - Encrypted at rest (use pgp_sym_encrypt from pgcrypto extension for sensitive notes)

7. GET /appointments/professional/:id/availability
   - Returns available slots based on professional's set schedule
   - Professional sets availability: POST /professionals/:id/availability { weekdays, hours_from, hours_to, slot_duration_minutes }
   - System generates available time slots excluding existing bookings

Output all files. Include the reminder job scheduling logic in detail.
```

---

# PHASE 6 — Professional & Admin Dashboards (Web)

---

## Prompt 6.1 — Next.js Web App Foundation

```
Set up the Next.js 14 web dashboard for Prevntiv (apps/web).

Stack: Next.js 14 App Router, TypeScript, TailwindCSS, shadcn/ui, Recharts, React Query (TanStack Query v5), Axios, Socket.io-client, next-auth (for session management).

Setup:
1. next.config.js with env variables, image domains (MinIO), strict mode
2. tailwind.config.ts with custom Prevntiv design tokens:
   - Colors: primary (#0B6E4F — teal-green), secondary (#F0F7F4), accent (#E8A917 — amber)
   - Typography: Inter for body, Sora for headings
   - Custom shadows, border-radius scale

3. Folder structure (App Router):
   app/
   ├── (auth)/
   │   ├── login/page.tsx
   │   └── register/page.tsx
   ├── (dashboard)/
   │   ├── layout.tsx          ← sidebar + topbar shell
   │   ├── overview/page.tsx   ← home dashboard
   │   ├── patients/
   │   │   ├── page.tsx        ← patient list
   │   │   └── [patientId]/
   │   │       ├── page.tsx    ← patient EHR view
   │   │       ├── vitals/page.tsx
   │   │       ├── labs/page.tsx
   │   │       ├── care-plans/page.tsx
   │   │       └── alerts/page.tsx
   │   ├── appointments/page.tsx
   │   ├── community/page.tsx
   │   └── settings/page.tsx
   ├── (admin)/
   │   └── ... (org admin + platform admin views)
   └── api/                    ← Next.js API routes for BFF pattern

4. Auth:
   - next-auth with credentials provider calling Prevntiv API
   - Session stores { id, role, orgId, name, accessToken }
   - Middleware.ts: protect (dashboard) and (admin) routes, redirect to login

5. API client (lib/api.ts):
   - Axios instance with baseURL, auth header injection from session
   - Auto-refresh token on 401
   - Typed API functions for every endpoint

6. React Query setup:
   - QueryClientProvider in root layout
   - Custom hooks: usePatients(), usePatientEHR(patientId), useVitals(patientId, options), etc.

7. Socket.io client (lib/socket.ts):
   - Singleton socket instance
   - useSocket() hook that subscribes to events and updates React Query cache

Output all setup files, layout components, and the auth flow.
```

---

## Prompt 6.2 — Professional Dashboard UI

```
Build the Professional Dashboard for Prevntiv web app.

Build these pages:

1. Overview Page (app/(dashboard)/overview/page.tsx):
   - Cards row: Total patients, High-risk patients, Today's appointments, Pending follow-ups
   - Risk Distribution Chart (Recharts PieChart): Low/Moderate/High split
   - Alert Feed: last 10 unread alerts across all patients with patient name, severity badge, time
   - Today's Schedule: appointment timeline
   - Quick actions: "Book follow-up", "Create care plan"

2. Patient List Page:
   - Search + filter by risk level, condition, last active
   - Table with: avatar, name, age, risk badges (3 categories), last vital date, assigned since
   - Risk badges: color coded (green/amber/red)
   - Clicking a row → patient EHR

3. Patient EHR Page (the core view):
   LEFT PANEL (30%):
   - Avatar, name, age, blood type
   - Chronic conditions chips
   - Medications list
   - Assigned care plans summary
   - Action buttons: Create Care Plan, Book Appointment, Send Alert

   RIGHT PANEL (70%):
   TABS: Vitals | Labs | Care Plans | Consultations | Alerts

   Vitals Tab:
   - Vital selector (BP, Glucose, HR, SpO2, Weight, Steps, Sleep)
   - Recharts LineChart for selected vital (30d default, time range selector)
   - Baseline reference line on chart
   - Table of recent readings

   Labs Tab:
   - Timeline of lab reports with extracted key values
   - View PDF link

   Care Plans Tab:
   - All care plans with adherence bars
   - Create new care plan button → side drawer form

   AI Insights Panel (always visible, collapsible):
   - Risk score gauges for 3 categories
   - Insight chips from AI engine
   - "Refresh Analysis" button

4. Alerts Page:
   - Grouped by: Critical → Moderate → Low
   - Mark resolved button per alert
   - Clicking alert → deep link to relevant patient vital

All components must use shadcn/ui + TailwindCSS. Use React Query for all data fetching. Show loading skeletons for every data section.

Output all page components and any shared components created.
```

---

## Prompt 6.3 — Vitals Charts & Analytics Components

```
Build the vitals visualization components for Prevntiv web dashboard.

Build these reusable components in packages/ui-components/src/charts/:

1. VitalsLineChart component:
   Props: { data: Vital[], vitalType: VitalType, baseline?: BaselineValue, dateRange: '7d'|'30d'|'90d' }
   - Recharts ComposedChart
   - Line for actual values
   - ReferenceLine for baseline
   - ReferenceBand for normal range (e.g., BP 120/80 range shaded green)
   - Anomaly dots: red dot on points where is_anomaly = true
   - Tooltip: shows exact value, time, source (wearable/manual/lab)
   - Responsive container
   - Color coded: blue for in-range, amber for borderline, red for out-of-range

2. RiskScoreGauge component:
   Props: { category: RiskCategory, score: 'low'|'moderate'|'high', trend: 'up'|'down'|'stable' }
   - SVG arc gauge (0-180 degrees)
   - Animated needle
   - Color gradient: green → amber → red
   - Trend arrow below
   - "Last updated X hrs ago" caption

3. VitalsSummaryGrid component:
   Props: { summary: VitalsSummary }
   - 6-card grid showing latest reading per vital type
   - Each card: icon, type name, current value, unit, trend (up/down/stable arrow), change % vs 7d avg
   - Color: green if normal, amber if borderline, red if abnormal vs the type's normal thresholds

4. AdherenceBar component:
   Props: { carePlan: CarePlan, adherenceData: AdherenceData }
   - Horizontal bar: filled % = adherence last 7d
   - Streak fire icon if > 5 consecutive days
   - Per-item breakdown expandable

5. HealthTimeline component:
   Props: { patientId: string }
   - Vertical timeline
   - Events: vital anomalies, lab uploads, consultations, care plan changes, risk score changes
   - Icons per event type
   - Paginated / infinite scroll (load more on scroll)

Also build a DateRangePicker component that emits { from, to } ISO strings.

All charts must be responsive (use ResponsiveContainer from Recharts). Export all from packages/ui-components/index.ts.
```

---

# PHASE 7 — Patient Mobile App

---

## Prompt 7.1 — React Native Expo App Foundation

```
Set up the Prevntiv Patient mobile app using React Native with Expo SDK 51.

Stack: Expo, TypeScript, Expo Router (file-based routing), NativeWind (TailwindCSS for RN), TanStack Query, Zustand (state), Axios, Socket.io-client, Victory Native (charts), expo-notifications, expo-health (HealthKit/Google Fit).

Setup:
1. app.json / app.config.ts:
   - App name: Prevntiv
   - Bundle ID: com.prevntiv.app
   - Permissions: CAMERA, READ_EXTERNAL_STORAGE (lab uploads), ACTIVITY_RECOGNITION (wearables), NOTIFICATIONS

2. Expo Router structure:
   app/
   ├── (auth)/
   │   ├── welcome.tsx      ← onboarding splash
   │   ├── login.tsx
   │   ├── register.tsx
   │   └── onboarding/
   │       ├── step1.tsx    ← personal info
   │       ├── step2.tsx    ← health baseline
   │       └── step3.tsx    ← connect wearables
   ├── (tabs)/
   │   ├── _layout.tsx     ← bottom tab bar
   │   ├── home.tsx        ← daily dashboard
   │   ├── vitals.tsx      ← log vitals
   │   ├── care.tsx        ← care plans
   │   ├── reports.tsx     ← lab reports
   │   └── community.tsx   ← community feed
   └── _layout.tsx         ← root layout + providers

3. Zustand stores:
   - useAuthStore: { user, token, login(), logout() }
   - useVitalsStore: { todaysSummary, addVital() }
   - useNotificationsStore: { unreadCount, markRead() }

4. Design system (NativeWind):
   - Primary color: #0B6E4F
   - Custom component: PrevntivCard (white card, rounded-2xl, shadow)
   - Custom component: RiskBadge
   - Custom component: SectionHeader

5. Expo Notifications setup:
   - Request permission on app launch
   - Register FCM token with backend on login
   - Handle foreground + background notifications
   - Navigate to relevant screen on notification tap

6. Secure storage:
   - Store auth token in expo-secure-store (not AsyncStorage)
   - Clear on logout

Output: all setup files, root layout, tab layout, and auth store.
```

---

## Prompt 7.2 — Patient Home Dashboard Screen

```
Build the Home Dashboard screen for the Prevntiv patient mobile app.

File: app/(tabs)/home.tsx

UI Sections (top to bottom):

1. Greeting Header:
   - "Good morning, [Name]" (time-aware: morning/afternoon/evening)
   - Date subtitle
   - Notification bell icon with unread badge

2. Today's Health Score Card:
   - Large card with gradient background (green if good, amber if moderate, red if risk)
   - Overall wellness score: 0-100 (computed from risk scores + adherence)
   - Subtext: "Based on your vitals and care plan adherence"
   - Animated circular progress ring

3. Quick Log Bar (horizontal scroll):
   - Icon chips: Blood Pressure, Glucose, Weight, Heart Rate, Mood, Symptoms
   - Tap → opens bottom sheet with input form for that vital type
   - BP input: two fields (systolic/diastolic) with number keyboards
   - Glucose: value + context selector (fasting/post-meal)

4. Today's Care Plan Actions:
   - Horizontal cards: "Take morning walk", "Log lunch glucose", "BP measurement"
   - Checkbox on each
   - Completing → updates backend + shows confetti animation (expo-confetti or custom)

5. Latest Insights:
   - 2-3 AI insight cards
   - Swipeable (react-native-reanimated gesture handler)
   - Each: icon + message + severity color border

6. Recent Vitals Mini-Charts:
   - 2 horizontal mini Victory Native SparkLine charts (BP last 7d, Glucose last 7d)
   - Tap → goes to detailed vitals screen

7. Upcoming Appointment Card:
   - If any: shows doctor name, specialty, date/time, directions button

All data from React Query hooks. Loading states use skeleton shimmer (MotiView from moti library).

Implement pull-to-refresh on the scroll view that refetches all queries.

Output full component with all subcomponents inline.
```

---

## Prompt 7.3 — Vitals Logging & History Screen

```
Build the Vitals screen for Prevntiv mobile app.

File: app/(tabs)/vitals.tsx

Design:

1. Vital Type Selector (top):
   - Horizontal scroll of pill buttons: BP | Glucose | HR | SpO2 | Weight | Steps | Sleep | HRV
   - Active pill: primary color fill

2. Chart Section (selected vital):
   - Victory Native VictoryChart with VictoryLine
   - Time range selector tabs: 7D | 30D | 3M
   - Baseline reference line
   - Normal range band shaded
   - Anomaly points in red
   - Tap a data point → shows tooltip popup (React Native Modal) with exact value + source

3. Stats Row (for selected vital):
   - 3 mini stats: Avg | Min | Max for selected range
   - Trend indicator: ↑ +5% vs last period

4. Log New Reading button (FAB at bottom right):
   - Opens BottomSheet (gorhom/bottom-sheet)
   - Dynamic form based on selected vital type
   - Submit calls POST /vitals/manual
   - Success: shows brief animated checkmark + updates chart

5. History List (below chart):
   - FlatList of readings: date/time | value | source icon (⌚ wearable / ✏️ manual / 🔬 lab)
   - Anomaly readings: red background row with exclamation icon
   - Paginated with infinite scroll

6. Wearable Sync button (top right):
   - Calls Google Fit / HealthKit sync endpoint
   - Shows last synced timestamp
   - Loading spinner during sync

7. Google Fit Integration:
   - Use expo-health / react-native-google-fit
   - On tap: request permissions if not granted
   - Fetch last 7 days steps + HR + sleep
   - Call POST /vitals/sync/google-fit with the data

Output full screen component + the BottomSheet form components for each vital type.
```

---

## Prompt 7.4 — Lab Report Upload Screen

```
Build the Lab Reports screen for Prevntiv mobile app.

File: app/(tabs)/reports.tsx

Features:

1. Upload Lab Report:
   - "Upload Report" button → action sheet with options: "Take Photo" | "Choose from Gallery" | "Upload PDF"
   - Use expo-image-picker for photos/gallery
   - Use expo-document-picker for PDF
   - Preview before upload (image thumbnail or PDF icon with filename)
   - POST to /labs/upload as multipart form
   - Upload progress bar (Axios onUploadProgress)
   - After upload: show "Processing..." card with animated pulse

2. Reports List:
   - FlatList of reports
   - Each report card:
     * Icon (PDF or photo)
     * Upload date
     * Status badge: Processing | Processed | Failed
     * If processed: show key extracted values as chips (e.g., "HbA1c: 6.2%", "Cholesterol: 185")

3. Report Detail Screen (app/reports/[reportId].tsx):
   - Full extracted values in a table
   - View original file button (opens PDF viewer using expo-file-system + expo-sharing or WebView for PDF)
   - Values colored: green = normal, amber = borderline, red = abnormal (using standard reference ranges)
   - Share report button (generates a formatted text summary)

4. Smart Prompts:
   - If a value is flagged abnormal → show "Discuss with your doctor" CTA
   - If no reports in 90+ days → show "Time for your regular labs" reminder card

5. Reference Ranges:
   - Implement a local reference_ranges.json:
     { HbA1c: { min: 4, max: 5.6, borderline_max: 6.4, unit: '%' }, ... }
   - Used to color-code extracted lab values

Output full screen + reference ranges JSON for 15 common Indian lab tests.
```

---

# PHASE 8 — Community Health Layer

---

## Prompt 8.1 — Community Module Backend

```
Build the Community Health module for Prevntiv.

Routes:

1. POST /community/posts
   - Authenticated users can post
   - Fields: category (enum: general|nutrition|mental_health|chronic_disease|fitness|symptoms), content, optional_anonymous: bool
   - Content moderation: basic keyword filter (block explicit harmful content)
   - Professionals: is_verified_professional flag auto-set from role
   - Verified professional posts get a badge in the UI

2. GET /community/posts
   - Paginated feed
   - Filter by category
   - Sort by: trending (reaction count last 24h) | recent | verified_only
   - Trending algorithm: (reactions + comments) / hours_since_post^1.5

3. POST /community/posts/:postId/comments
   - Comment on a post
   - If commenter is a verified professional: comment gets professional badge
   - Notify post author (if not anonymous): new comment on your post

4. POST /community/posts/:postId/react
   - Reactions: helpful | not_alone | important
   - Upsert: one reaction per user per post (change type or remove)

5. POST /community/posts/:postId/escalate
   - Patient can escalate a community thread to a private consultation
   - Creates a consultation request sent to the verified professional who commented
   - Or allows booking an appointment with a tagged professional

6. GET /community/professionals
   - Lists verified professionals active in community
   - Their specialty, recent helpful posts count
   - "Ask them" CTA → posts tagged at them

7. Content moderation:
   - Simple keyword blocklist (src/moderation/keywords.ts)
   - Flag posts with blocked keywords → status: 'flagged'
   - Flagged posts not shown until platform admin reviews (GET /admin/flagged-posts)

8. Privacy:
   - Anonymous posts: author_id stored in DB but not returned in API response
   - User can see their own anonymous posts in profile

Output all routes + the trending score computation logic.
```

---

# PHASE 9 — Admin Consoles

---

## Prompt 9.1 — Hospital/Clinic Admin Dashboard

```
Build the Hospital/Clinic Admin module for Prevntiv.

Backend routes (prefix: /org):

1. GET /org/:orgId/overview
   - Returns: total patients, active patients (vitals in last 7d), professionals count, avg risk distribution, care plan adherence rate, alerts resolved rate

2. GET /org/:orgId/patients
   - All patients under this org
   - Filterable by professional, risk level, last active, condition

3. POST /org/:orgId/assign
   - Assign patient to professional: { patientId, professionalId }
   - Validates both belong to the org
   - Notifies professional

4. GET /org/:orgId/professionals
   - List professionals, their patient counts, alert response time avg

5. GET /org/:orgId/risk-distribution
   - Risk score data for all org patients
   - Suitable for Recharts pie/bar chart

Frontend (apps/web/app/(dashboard)/admin/org/):

1. Org Overview Page:
   - KPI cards: patients, professionals, high-risk count, avg adherence
   - Risk distribution donut chart
   - Recent alerts feed
   - Professional performance table: { name, patients, avg response time, care plans active }

2. Patient Assignment UI:
   - Drag-drop or select-dropdown to assign patients to professionals
   - Visual: professional cards with patient chips

3. Usage Analytics:
   - Line chart: new patients per week (last 12 weeks)
   - Bar chart: vitals logged per day
   - Table: most common conditions in patient pool

Use Next.js server components for initial data load + client components for interactive charts.
```

---

## Prompt 9.2 — Platform Admin Console (Prevntiv Team)

```
Build the Platform Admin Console for Prevntiv (internal use by the Prevntiv team).

Backend routes (prefix: /platform-admin, requires role: platform_admin):

1. User management:
   - GET /platform-admin/users (search, filter by role, paginated)
   - PATCH /platform-admin/users/:id/status (active|suspended)
   - POST /platform-admin/professionals/:id/verify (set is_verified = true)
   - GET /platform-admin/professionals/pending (not yet verified)

2. Organization management:
   - GET /platform-admin/orgs
   - POST /platform-admin/orgs (create new org)
   - PATCH /platform-admin/orgs/:id (update name, plan)
   - GET /platform-admin/orgs/:id/stats

3. Threshold configuration:
   - GET/PUT /platform-admin/thresholds
   - Stores in a platform_config table: { key, value_json, updated_by, updated_at }
   - Example keys: bp_critical_threshold, anomaly_zscore_threshold, max_insights_per_day

4. Audit logs:
   - GET /platform-admin/audit-logs (searchable, filterable by user, action, date)
   - Every sensitive action logged: professional verification, threshold change, user suspension

5. AI Model tuning:
   - GET/PUT /platform-admin/risk-model-weights
   - Adjust weights for cardiovascular/glycemic/lifestyle scoring rules
   - Changes propagate to AI engine via Redis pub/sub

6. Content moderation:
   - GET /platform-admin/flagged-posts
   - POST /platform-admin/posts/:id/approve
   - POST /platform-admin/posts/:id/remove

Frontend: Build a clean admin panel in apps/web/app/(admin)/ with:
- Sidebar with above sections
- Data tables with server-side pagination
- Professional verification queue with approve/reject buttons
- Config editor for thresholds (JSON editor with schema validation)

Output all routes + the frontend admin layout.
```

---

# PHASE 10 — Production Infrastructure

---

## Prompt 10.1 — Production Docker & Nginx

```
Write the complete production infrastructure setup for Prevntiv.

1. docker-compose.prod.yml:
   - All services: api, ai-engine, notification, web, postgres, redis, minio, nginx
   - No dev tools (no pgadmin, redis-commander)
   - All services: restart: unless-stopped
   - Health checks on all services
   - Named volumes for postgres data, minio data, redis data
   - Environment via .env file (not hard-coded)
   - Resource limits: api (512m RAM, 0.5 CPU), ai-engine (1g RAM, 1.0 CPU)
   - Logging driver: json-file with max-size 10m, max-file 5

2. Nginx config (infra/nginx/nginx.conf):
   - Upstream blocks for: api (port 3001), web (port 3000), ai-engine (port 8000)
   - Server block for api.prevntiv.com:
     * SSL with Let's Encrypt (certbot, free)
     * HTTP → HTTPS redirect
     * Proxy to api service
     * WebSocket upgrade headers (for Socket.io)
     * Rate limiting: 100 req/s per IP
   - Server block for app.prevntiv.com:
     * Proxy to Next.js web service
   - Security headers: HSTS, X-Frame-Options, CSP, X-Content-Type-Options
   - Gzip compression

3. SSL with Let's Encrypt (free):
   - certbot docker-compose service
   - Auto-renewal cron via certbot --renew
   - Volume mount for certs shared with nginx

4. Production Dockerfiles (multi-stage):
   api/Dockerfile:
   - Stage 1: node:20-alpine as builder, pnpm install --frozen-lockfile, tsc build
   - Stage 2: node:20-alpine slim, copy /dist only, NODE_ENV=production

   ai-engine/Dockerfile:
   - Stage 1: python:3.11-slim, pip install --no-cache-dir
   - Stage 2: same slim image, copy app only

5. GitHub Actions (/.github/workflows/deploy.yml):
   - Trigger: push to main
   - Steps: checkout → pnpm install → lint → test → docker build → push to GitHub Container Registry (free) → SSH to server and docker compose pull + up

Output all configuration files in full.
```

---

## Prompt 10.2 — Monitoring Stack (Grafana + Prometheus)

```
Set up the free monitoring stack for Prevntiv production.

Stack: Prometheus + Grafana + node_exporter + postgres_exporter + Redis exporter — all free, self-hosted.

1. Docker Compose additions (infra/monitoring/docker-compose.monitoring.yml):
   - prometheus:latest — port 9090, scrape config
   - grafana/grafana — port 3030, pre-configured dashboards
   - prom/node-exporter — system metrics
   - prometheuscommunity/postgres-exporter — DB metrics
   - oliver006/redis_exporter — Redis metrics

2. Prometheus config (prometheus.yml):
   - Scrape jobs:
     * node_exporter: system CPU/RAM/disk
     * postgres_exporter: query performance, connections, table sizes
     * redis_exporter: memory, hit rate, queue depths
     * api (custom metrics via prom-client): request duration histogram, error rate, active WS connections
     * ai-engine (custom metrics via prometheus-fastapi-instrumentator): inference latency, queue length

3. Custom metrics in API (src/metrics.ts):
   - Use prom-client
   - Expose GET /metrics endpoint
   - Track:
     * http_requests_total (method, route, status)
     * http_request_duration_seconds histogram
     * ws_connections_active gauge
     * vitals_ingested_total counter
     * ai_analysis_requests_total
     * notification_sent_total (channel label)
     * lab_extraction_duration_seconds histogram

4. Grafana dashboards (JSON config files to import):
   - API Health: request rate, error rate, p50/p95/p99 latency
   - System: CPU, RAM, disk usage
   - Database: connections, query time, replication lag
   - Business: vitals logged/day, new patients/day, alerts triggered
   - AI Engine: inference latency, anomalies detected/day

5. Alerting rules (Prometheus alertmanager config):
   - Alert if API error rate > 5% for 5min
   - Alert if DB connections > 80% of max_connections
   - Alert if Redis memory > 80%
   - Alert if disk > 85%
   - Notifications: free Grafana alerting to email or free Slack webhook

Output all configuration files.
```

---

## Prompt 10.3 — Security Hardening

```
Implement production security hardening for Prevntiv.

1. Database security:
   - Enable pgcrypto extension
   - Encrypt sensitive columns at rest using pgp_sym_encrypt:
     * consultation notes
     * medication names
     * user addresses
   - Row-level security policies (implement per-table using session_user variable)
   - Create separate DB roles: api_role (SELECT/INSERT/UPDATE), readonly_role, migration_role
   - Never connect from app as postgres superuser

2. API security:
   - Helmet.js full config (CSP, HSTS, referrer-policy)
   - Input sanitization middleware (DOMPurify equivalent for server: sanitize-html)
   - SQL injection: use parameterized queries everywhere (pg client does this by default, add ESLint rule to flag raw string concatenation)
   - File upload validation: check file magic bytes not just MIME type (use file-type library)
   - Rate limiting per user for sensitive endpoints (not just by IP):
     * POST /vitals/manual: 30/hour per user
     * POST /labs/upload: 10/hour per user
     * POST /auth/otp/send: 5/hour per phone

3. HIPAA-Aligned Practices (no paid compliance tools needed):
   - Audit log every access to patient data (log to DB: who, what, patientId, timestamp, IP)
   - Implement data export: GET /patients/:id/export → full JSON of all patient data
   - Implement data deletion: DELETE /patients/:id → soft delete + anonymize PII in 30d
   - Consent tracking: patient_consents table (terms_accepted, data_sharing, marketing) with timestamps

4. Secret management:
   - All secrets in environment variables, never committed
   - Docker secrets for production (not --env-file in production, use Docker swarm secrets or Vault free tier)
   - Rotate JWT secret: support multiple valid secrets during rotation window (array of secrets)

5. MinIO security:
   - Disable public bucket access
   - All file access via pre-signed URLs (1hr expiry)
   - Separate IAM-like policies per bucket

6. CORS:
   - Strict whitelist: only app.prevntiv.com and localhost in dev
   - No wildcard origin ever

Output the security middleware, audit log implementation, and data export/delete routes.
```

---

## Prompt 10.4 — Testing Suite

```
Write the complete testing suite for Prevntiv.

1. API Unit Tests (Jest + Supertest):

   Test files:
   - tests/auth.test.ts:
     * Test register, login, refresh, logout happy paths
     * Test invalid password returns 401
     * Test rate limiting kicks in after 10 failed logins
     * Test OTP expires after 10 min

   - tests/vitals.test.ts:
     * Test manual vital submission with valid/invalid types
     * Test anomaly detection called after submission
     * Test pagination of vitals list
     * Test canAccessPatient authorization

   - tests/carePlan.test.ts:
     * Test professional can create plan for their patient
     * Test professional cannot create plan for unassigned patient
     * Test patient acknowledgment flow
     * Test adherence score computation

   - tests/ai-engine.test.ts (pytest):
     * Test cardiovascular risk score for known inputs
     * Test Z-score anomaly detection with a synthetic baseline
     * Test insight template rendering
     * Test trend analyzer slope computation

2. Integration Tests:
   - tests/integration/vitals-to-alert.test.ts:
     * Submit critical BP reading → verify anomaly created → verify alert enqueued → verify notification worker picks it up

3. Test Infrastructure:
   - Use Docker test containers (testcontainers-node) for PostgreSQL in tests
   - Seed test database with factories (use fishery or custom factory functions)
   - Mock external services: Firebase FCM, MinIO (mock S3), AI engine (mock HTTP server)

4. E2E tests (Playwright for web):
   - tests/e2e/professional-flow.spec.ts:
     * Login as professional
     * Navigate to patient EHR
     * Create a care plan
     * Verify it appears in patient view

5. Load Testing (k6 — free):
   - tests/load/vitals-ingest.js:
     * Simulate 100 concurrent patients submitting vitals
     * Target: < 500ms p95 response time
     * Output report with pass/fail

Output all test files. Show how to run the full suite with a single make test command.
```

---

# PHASE 11 — Awareness & Growth Layer

---

## Prompt 11.1 — Landing Page

```
Build the Prevntiv marketing landing page (apps/landing) using Next.js 14 + TailwindCSS.

Design direction: Clean, trustworthy healthcare — deep teal (#0B6E4F) primary, warm white backgrounds, Sora headings, Inter body. Medical credibility with human warmth.

Sections to build:

1. Hero:
   - Headline: "Your Health. Before it Becomes a Crisis."
   - Subheadline: "Prevntiv is a continuous health monitoring platform that gives you and your doctor a complete picture — not just when you're sick."
   - CTA buttons: "Get Started Free" + "For Healthcare Professionals"
   - Animated mockup: phone showing Prevntiv app with live BP chart

2. Problem Section ("The Old Way"):
   - Visual comparison timeline: "Symptom → Visit → Prescription → Forget → Repeat" (animated) vs Prevntiv's continuous model
   - Pain points as cards with icons

3. How It Works:
   - 3-step visual: Connect & Track → AI Detects Patterns → Act Before It's Urgent
   - Simple SVG illustration per step

4. Features Grid:
   - 6 feature cards: Unified Health Record, AI Risk Scores, Multi-professional Care Plans, Lab Report Extraction, Community Support, Wearable Sync

5. For Professionals Section:
   - Split layout: web dashboard mockup on left, benefits list on right
   - "Full patient history at a glance" bullet points

6. Trust Section:
   - "We don't sell your data. Ever." — data privacy callouts
   - HIPAA-aligned badge, encrypted data badge, doctor-verified content badge

7. Pricing (free-first):
   - Patient: Free forever (basic tracking) | Premium ₹199/mo (AI insights + care plans)
   - Professionals: Free trial 30 days | ₹499/mo per seat

8. Footer: Links, social (Twitter, LinkedIn), "Made for India's healthcare system"

Build with Next.js static export. Fully responsive. Use Framer Motion for scroll animations. SEO meta tags. Output all page sections as components.
```

---

# PHASE 12 — Final Integration & Launch Checklist

---

## Prompt 12.1 — End-to-End Integration

```
Write the end-to-end integration code connecting all Prevntiv services.

Implement the complete happy path flow and ensure all services communicate correctly:

FLOW 1: Patient submits a blood pressure reading via mobile app
1. Mobile POST /vitals/manual → API validates + inserts vital
2. API emits socket event vital:added to patient room
3. API publishes Redis message: "vital:new" with { vitalId, patientId }
4. Notification service (Redis subscriber) receives event
5. Notification service calls AI Engine POST /ai/anomaly-detect with the vital
6. AI Engine returns { is_anomaly: true, severity: 'medium', explanation: 'BP 148/92 is elevated vs your 30-day baseline' }
7. Anomaly record created, alert record created
8. Notification service sends push to patient + HTTP to all assigned professionals
9. Socket event anomaly:detected emitted to patient room + professional rooms
10. If severity = critical: immediately elevate to professional dashboard alert feed

Write the full integration code for this flow including:
- Redis pub/sub setup between API and Notification service
- Service-to-service HTTP calls with shared X-Service-Key header
- Error handling if AI engine is unavailable (graceful degradation: still save vital, queue anomaly check for retry)
- Circuit breaker pattern for AI engine calls (use opossum library)

FLOW 2: Professional creates a care plan
1. POST /care-plans → API creates plan + items
2. Invalidate patient EHR cache
3. Emit care-plan:updated socket event
4. Notification service sends push to patient

FLOW 3: Lab report upload → extraction → insights
1. Patient uploads PDF from mobile
2. API saves to MinIO, creates DB record, enqueues Bull job
3. Worker downloads from MinIO, parses PDF, extracts values
4. Values saved as vitals (source: lab)
5. Trigger full AI analysis for patient
6. Push notification to patient with extracted values summary

Write all the integration code, queue consumers, and error handling for all 3 flows.
```

---

## Prompt 12.2 — Production Launch Checklist Implementation

```
Implement the final production readiness checklist for Prevntiv.

1. Database Migrations (Flyway via Docker):
   - Write V1__initial_schema.sql (all tables from Phase 0.2)
   - Write V2__rls_policies.sql (row-level security)
   - Write V3__seed_reference_data.sql (vital type metadata, reference ranges)
   - Write V4__indexes.sql (all performance indexes)
   - flyway.conf pointing to production DB

2. Environment Validation on Startup:
   - api/src/config/env.ts using Zod to validate all required env vars on startup
   - If any required var missing: log clearly and process.exit(1)
   - Required vars: DATABASE_URL, REDIS_URL, JWT_SECRET, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, FIREBASE_SERVICE_ACCOUNT_JSON, INTERNAL_SERVICE_KEY, AI_ENGINE_URL

3. API Rate Limit Configuration (production values):
   - General: 200 req/15min per IP
   - Auth endpoints: 10 req/15min per IP
   - Vitals: 30 req/hour per user
   - File upload: 10 req/hour per user

4. Database Connection Pooling:
   - PgBouncer config (free) in front of Postgres for connection pooling
   - pool_mode = transaction, max_client_conn = 1000, default_pool_size = 20

5. Backup Strategy (free):
   - Daily cron: pg_dump to MinIO bucket "backups"
   - Retention: keep last 7 daily backups
   - Test restore: monthly restore test in staging
   - Write the backup script: infra/scripts/backup.sh

6. Log Aggregation:
   - All services log to stdout in JSON format
   - Docker logging driver ships to Loki (free, self-hosted)
   - Grafana Loki datasource for log search

7. Cron Jobs Summary (all via node-cron in API or standalone cron service):
   - Every 6hr: re-run AI analysis for all patients with new vitals
   - Daily 8am: send care plan reminder push notifications
   - Daily midnight: check for missed measurements → send reminder
   - Weekly Sunday: send weekly health digest email to all patients
   - Monthly: generate lab test due reminders based on last lab date

8. API Documentation:
   - Use swagger-autogen or tsoa to auto-generate OpenAPI 3.0 spec
   - Host Swagger UI at GET /docs (disable in production or behind admin auth)

9. Graceful Degradation:
   - If AI Engine is down: vitals still save, anomaly detection skipped, queued for retry
   - If Notification service is down: alerts still written to DB, push delivery retried
   - If MinIO is down: lab upload returns 503 with clear message

Output all scripts, configurations, and implementation code.
```

---

## Quick Reference: Free Service Alternatives

| Feature | Free Solution | Notes |
|---|---|---|
| SMS OTP | MSG91 free trial / Twilio trial | 10 free SMS/day on trials |
| Email | Gmail SMTP (500/day) | Upgrade to Brevo free (300/day) |
| Push Notifications | Firebase FCM | Completely free |
| File Storage | MinIO self-hosted | Runs on your own server |
| Database | PostgreSQL self-hosted | Free forever |
| Hosting (VPS) | Oracle Cloud Free Tier | 4 OCPU + 24GB RAM free forever |
| SSL | Let's Encrypt (Certbot) | Free, auto-renewing |
| CI/CD | GitHub Actions | 2000 free minutes/month |
| Monitoring | Grafana + Prometheus | Free, self-hosted |
| Error Tracking | Sentry free tier | 5000 errors/month free |
| Search | PostgreSQL full-text search | Built-in, no Elasticsearch needed |
| Background Jobs | Bull (Redis-based) | Free |
| Wearables | Google Fit API | Free |
| AI/ML | scikit-learn local | No API costs |

---

*Total estimated prompts: 28 major prompts covering 12 phases. Run them sequentially. Each prompt builds on the previous. Start with Phase 0 and work through to Phase 12.*
