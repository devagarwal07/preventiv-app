-- Prevntiv row-level security policies

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION app_current_user_role() RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_role', true), '');
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION app_is_platform_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN app_current_user_role() = 'platform_admin';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION app_is_patient_owner(target_patient_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN app_current_user_id() = target_patient_id AND app_current_user_role() = 'patient';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION app_is_professional() RETURNS BOOLEAN AS $$
BEGIN
  RETURN app_current_user_role() IN ('doctor', 'dietician', 'physiotherapist', 'org_admin');
END;
$$ LANGUAGE plpgsql STABLE;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_or_admin_select ON users
  FOR SELECT
  USING (id = app_current_user_id() OR app_is_platform_admin());

CREATE POLICY user_profiles_self_or_admin_rw ON user_profiles
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_platform_admin())
  WITH CHECK (user_id = app_current_user_id() OR app_is_platform_admin());

CREATE POLICY baselines_patient_or_professional_select ON patient_baselines
  FOR SELECT
  USING (app_is_patient_owner(patient_id) OR app_is_professional() OR app_is_platform_admin());

CREATE POLICY baselines_patient_or_professional_update ON patient_baselines
  FOR UPDATE
  USING (app_is_patient_owner(patient_id) OR app_is_professional() OR app_is_platform_admin())
  WITH CHECK (app_is_patient_owner(patient_id) OR app_is_professional() OR app_is_platform_admin());

CREATE POLICY vitals_patient_or_professional_select ON vitals
  FOR SELECT
  USING (app_is_patient_owner(patient_id) OR app_is_professional() OR app_is_platform_admin());

CREATE POLICY vitals_patient_insert ON vitals
  FOR INSERT
  WITH CHECK (app_is_patient_owner(patient_id) OR app_is_professional() OR app_is_platform_admin());

CREATE POLICY lab_reports_patient_or_professional_select ON lab_reports
  FOR SELECT
  USING (app_is_patient_owner(patient_id) OR app_is_professional() OR app_is_platform_admin());

CREATE POLICY consultations_patient_or_professional_select ON consultations
  FOR SELECT
  USING (
    app_is_patient_owner(patient_id)
    OR professional_id = app_current_user_id()
    OR app_is_platform_admin()
  );

CREATE POLICY care_plans_patient_or_professional_select ON care_plans
  FOR SELECT
  USING (
    app_is_patient_owner(patient_id)
    OR created_by = app_current_user_id()
    OR app_is_professional()
    OR app_is_platform_admin()
  );

CREATE POLICY appointments_patient_or_professional_rw ON appointments
  FOR ALL
  USING (
    app_is_patient_owner(patient_id)
    OR professional_id = app_current_user_id()
    OR app_is_platform_admin()
  )
  WITH CHECK (
    app_is_patient_owner(patient_id)
    OR professional_id = app_current_user_id()
    OR app_is_platform_admin()
  );

CREATE POLICY risk_scores_patient_or_professional_select ON risk_scores
  FOR SELECT
  USING (app_is_patient_owner(patient_id) OR app_is_professional() OR app_is_platform_admin());

CREATE POLICY anomalies_patient_or_professional_select ON anomalies
  FOR SELECT
  USING (app_is_patient_owner(patient_id) OR app_is_professional() OR app_is_platform_admin());

CREATE POLICY alerts_recipient_select ON alerts
  FOR SELECT
  USING (
    patient_id = app_current_user_id()
    OR professional_id = app_current_user_id()
    OR app_is_platform_admin()
  );

CREATE POLICY community_posts_visible ON community_posts
  FOR SELECT
  USING (moderation_status = 'published' OR app_is_platform_admin());

CREATE POLICY community_posts_authored_rw ON community_posts
  FOR ALL
  USING (author_id = app_current_user_id() OR app_is_platform_admin())
  WITH CHECK (author_id = app_current_user_id() OR app_is_platform_admin());

CREATE POLICY community_comments_read_all ON community_comments
  FOR SELECT
  USING (TRUE);

CREATE POLICY community_comments_authored_rw ON community_comments
  FOR ALL
  USING (author_id = app_current_user_id() OR app_is_platform_admin())
  WITH CHECK (author_id = app_current_user_id() OR app_is_platform_admin());

CREATE POLICY community_reactions_rw ON community_reactions
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_platform_admin())
  WITH CHECK (user_id = app_current_user_id() OR app_is_platform_admin());
