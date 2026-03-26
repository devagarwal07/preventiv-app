-- Development seed data

-- users
INSERT INTO users (id, email, phone, role, is_verified)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'patient.one@prevntiv.local', '+910000000001', 'patient', true),
  ('11111111-1111-1111-1111-111111111112', 'patient.two@prevntiv.local', '+910000000002', 'patient', true),
  ('11111111-1111-1111-1111-111111111113', 'patient.three@prevntiv.local', '+910000000003', 'patient', true),
  ('22222222-2222-2222-2222-222222222221', 'doctor.one@prevntiv.local', '+910000000101', 'doctor', true),
  ('22222222-2222-2222-2222-222222222222', 'doctor.two@prevntiv.local', '+910000000102', 'doctor', true),
  ('33333333-3333-3333-3333-333333333331', 'dietician.one@prevntiv.local', '+910000000201', 'dietician', true),
  ('44444444-4444-4444-4444-444444444441', 'org.admin@prevntiv.local', '+910000000301', 'org_admin', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_profiles (user_id, name, dob, gender, address)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Riya Shah', '1993-04-12', 'female', 'Mumbai'),
  ('11111111-1111-1111-1111-111111111112', 'Ankit Verma', '1989-11-03', 'male', 'Pune'),
  ('11111111-1111-1111-1111-111111111113', 'Neha Iyer', '1978-01-29', 'female', 'Bengaluru'),
  ('22222222-2222-2222-2222-222222222221', 'Dr. Kavya Menon', '1985-07-15', 'female', 'Mumbai'),
  ('22222222-2222-2222-2222-222222222222', 'Dr. Arjun Rao', '1981-03-20', 'male', 'Pune'),
  ('33333333-3333-3333-3333-333333333331', 'Dt. Meera Das', '1990-09-08', 'female', 'Bengaluru'),
  ('44444444-4444-4444-4444-444444444441', 'Sana Kapoor', '1988-02-17', 'female', 'Mumbai')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO organizations (id, name, type, address, admin_user_id)
VALUES
  ('55555555-5555-5555-5555-555555555551', 'Prevntiv Care Hospital', 'hospital', 'Mumbai', '44444444-4444-4444-4444-444444444441')
ON CONFLICT (id) DO NOTHING;

INSERT INTO org_memberships (org_id, user_id, role)
VALUES
  ('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444441', 'org_admin'),
  ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222221', 'doctor'),
  ('55555555-5555-5555-5555-555555555551', '22222222-2222-2222-2222-222222222222', 'doctor'),
  ('55555555-5555-5555-5555-555555555551', '33333333-3333-3333-3333-333333333331', 'dietician'),
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'patient'),
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111112', 'patient'),
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111113', 'patient')
ON CONFLICT (org_id, user_id) DO NOTHING;

INSERT INTO patient_baselines (patient_id, height_cm, weight_kg, blood_type, chronic_conditions, allergies, medications, lifestyle)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    164,
    64,
    'B+',
    ARRAY['prediabetes'],
    ARRAY['penicillin'],
    '[{"name":"Metformin","dosage":"500mg","frequency":"daily"}]'::jsonb,
    '{"smoking":false,"alcohol":"occasional","exercise_frequency":"3x_week","diet_type":"mixed"}'::jsonb
  ),
  (
    '11111111-1111-1111-1111-111111111112',
    176,
    82,
    'O+',
    ARRAY['hypertension'],
    ARRAY[]::text[],
    '[{"name":"Telmisartan","dosage":"40mg","frequency":"daily"}]'::jsonb,
    '{"smoking":true,"alcohol":"moderate","exercise_frequency":"1x_week","diet_type":"mixed"}'::jsonb
  ),
  (
    '11111111-1111-1111-1111-111111111113',
    159,
    70,
    'A-',
    ARRAY['thyroid_disorder'],
    ARRAY['shellfish'],
    '[{"name":"Levothyroxine","dosage":"50mcg","frequency":"daily"}]'::jsonb,
    '{"smoking":false,"alcohol":"none","exercise_frequency":"2x_week","diet_type":"vegetarian"}'::jsonb
  )
ON CONFLICT (patient_id) DO NOTHING;

INSERT INTO professional_verifications (user_id, license_no, specialization, verified_at)
VALUES
  ('22222222-2222-2222-2222-222222222221', 'DOC-MH-9001', 'Cardiology', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'DOC-MH-9002', 'Internal Medicine', NOW()),
  ('33333333-3333-3333-3333-333333333331', 'DIET-KA-4401', 'Clinical Nutrition', NOW())
ON CONFLICT (user_id) DO NOTHING;
