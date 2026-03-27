-- Phase 5 enhancements: care plans, appointments, reminders, encrypted notes

CREATE TABLE IF NOT EXISTS care_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  version_no INT NOT NULL,
  title TEXT NOT NULL,
  status care_plan_status NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_care_plan_versions_plan_changed
  ON care_plan_versions (care_plan_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS care_plan_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_item_id UUID NOT NULL REFERENCES care_plan_items(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_care_plan_completions_item_patient_day
  ON care_plan_completions (care_plan_item_id, patient_id, (DATE(completed_at)));

ALTER TABLE care_plan_items
  ADD COLUMN IF NOT EXISTS reminder BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'follow-up',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS reminder_job_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_appointments_type'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT chk_appointments_type CHECK (type IN ('in-person', 'follow-up'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS professional_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday INT NOT NULL,
  hours_from TIME NOT NULL,
  hours_to TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_prof_availability_weekday CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT chk_prof_availability_hours CHECK (hours_to > hours_from)
);

CREATE INDEX IF NOT EXISTS idx_prof_availability_professional_weekday
  ON professional_availability (professional_id, weekday);

CREATE TABLE IF NOT EXISTS consultation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id),
  encrypted_note BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_notes_appointment
  ON consultation_notes (appointment_id, created_at DESC);
