-- Extend vital enum for temperature support

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'vital_type' AND e.enumlabel = 'temperature'
  ) THEN
    ALTER TYPE vital_type ADD VALUE 'temperature';
  END IF;
END $$;
