CREATE TABLE IF NOT EXISTS lab_manual_value_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES lab_reports(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES users(id),
  before_data JSONB NOT NULL,
  after_data JSONB NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_manual_value_audit_report
  ON lab_manual_value_audit (report_id, changed_at DESC);
