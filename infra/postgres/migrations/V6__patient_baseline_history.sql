-- Store immutable snapshots before baseline updates

CREATE TABLE IF NOT EXISTS patient_baseline_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_baseline_history_patient_changed_at
  ON patient_baseline_history (patient_id, changed_at DESC);
