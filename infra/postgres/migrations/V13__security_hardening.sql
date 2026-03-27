CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS notes_encrypted BYTEA;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS address_encrypted BYTEA;

ALTER TABLE patient_baselines
  ADD COLUMN IF NOT EXISTS medications_encrypted BYTEA;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'api_role') THEN
    CREATE ROLE api_role LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_role') THEN
    CREATE ROLE readonly_role LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migration_role') THEN
    CREATE ROLE migration_role LOGIN;
  END IF;
END $$;

GRANT CONNECT ON DATABASE current_database() TO api_role, readonly_role, migration_role;
GRANT USAGE ON SCHEMA public TO api_role, readonly_role, migration_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO api_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO migration_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO api_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_role;

CREATE INDEX IF NOT EXISTS idx_users_status_created_at ON users (status, created_at DESC);
