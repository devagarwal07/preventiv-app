-- Support ON CONFLICT dedupe for sync endpoints

CREATE UNIQUE INDEX IF NOT EXISTS uq_vitals_patient_type_source_recorded_at
  ON vitals (patient_id, type, source, recorded_at);
