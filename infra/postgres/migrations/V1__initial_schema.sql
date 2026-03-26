-- Prevntiv initial schema
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'patient',
      'doctor',
      'dietician',
      'physiotherapist',
      'org_admin',
      'platform_admin'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_type') THEN
    CREATE TYPE organization_type AS ENUM ('hospital', 'clinic');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vital_type') THEN
    CREATE TYPE vital_type AS ENUM ('bp', 'glucose', 'hr', 'spo2', 'weight', 'steps', 'hrv', 'sleep');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vital_source') THEN
    CREATE TYPE vital_source AS ENUM ('wearable', 'manual', 'lab');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'care_plan_type') THEN
    CREATE TYPE care_plan_type AS ENUM ('medical', 'nutrition', 'rehab');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'care_plan_status') THEN
    CREATE TYPE care_plan_status AS ENUM ('active', 'completed', 'paused');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_category') THEN
    CREATE TYPE risk_category AS ENUM ('cardiovascular', 'glycemic', 'lifestyle');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
    CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'community_category') THEN
    CREATE TYPE community_category AS ENUM (
      'general',
      'nutrition',
      'mental_health',
      'chronic_disease',
      'fitness',
      'symptoms'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_type') THEN
    CREATE TYPE reaction_type AS ENUM ('helpful', 'not_alone', 'important');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  role user_role NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dob DATE,
  gender TEXT,
  avatar_url TEXT,
  address TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professional_verifications (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  license_no TEXT NOT NULL,
  specialization TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type organization_type NOT NULL,
  address TEXT,
  admin_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_memberships (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

CREATE TABLE IF NOT EXISTS patient_baselines (
  patient_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  height_cm NUMERIC(5,2),
  weight_kg NUMERIC(6,2),
  blood_type TEXT,
  chronic_conditions TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  lifestyle JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type vital_type NOT NULL,
  value JSONB NOT NULL,
  source vital_source NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'processing',
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_lab_report_status CHECK (status IN ('processing', 'processed', 'extraction_failed'))
);

CREATE TABLE IF NOT EXISTS health_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  related_record_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  diagnosis TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  type care_plan_type NOT NULL,
  title TEXT NOT NULL,
  status care_plan_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS care_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  frequency TEXT NOT NULL,
  instructions TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_care_plan_frequency CHECK (frequency IN ('daily', 'weekly', 'monthly'))
);

CREATE TABLE IF NOT EXISTS care_plan_acknowledgments (
  care_plan_id UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (care_plan_id, patient_id)
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  outcome_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_appointments_status CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed'))
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category risk_category NOT NULL,
  score risk_level NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL,
  explanation JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vital_id UUID REFERENCES vitals(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  detected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_anomalies_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category community_category NOT NULL,
  content TEXT NOT NULL,
  optional_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified_professional BOOLEAN NOT NULL DEFAULT FALSE,
  moderation_status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_posts_moderation_status CHECK (moderation_status IN ('published', 'flagged', 'removed'))
);

CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_verified_professional BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_reactions (
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type reaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
