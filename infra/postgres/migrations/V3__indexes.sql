-- Prevntiv performance indexes

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_name ON user_profiles(name);

CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON org_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_vitals_patient_type_time ON vitals(patient_id, type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_time ON vitals(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_type_time ON vitals(type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_anomaly ON vitals(is_anomaly) WHERE is_anomaly = TRUE;

CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_uploaded ON lab_reports(patient_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_timeline_patient_time ON health_timeline(patient_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultations_patient_time ON consultations(patient_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_professional_time ON consultations(professional_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_care_plans_patient_status ON care_plans(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_care_plans_created_by ON care_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_care_plan_items_plan_id ON care_plan_items(care_plan_id);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_scheduled ON appointments(patient_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_scheduled ON appointments(professional_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_risk_scores_patient_category_time ON risk_scores(patient_id, category, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_patient_detected ON anomalies(patient_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_unresolved ON anomalies(patient_id, is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_alerts_patient_created ON alerts(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_professional_created ON alerts(professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, created_at DESC) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_posts_category_created ON community_posts(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status_created ON community_posts(moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON community_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON community_reactions(post_id);
