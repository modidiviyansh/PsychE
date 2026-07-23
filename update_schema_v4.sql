-- Update PsychE_Settings to include PINs and Version Tracking
ALTER TABLE "PsychE_Settings"
ADD COLUMN IF NOT EXISTS allowed_pins TEXT DEFAULT '2001,0987,0999,2580',
ADD COLUMN IF NOT EXISTS app_version VARCHAR(20) DEFAULT '2.0.0';

-- Set default values for the existing row if they are null
UPDATE "PsychE_Settings"
SET allowed_pins = '2001,0987,0999,2580'
WHERE allowed_pins IS NULL;

UPDATE "PsychE_Settings"
SET app_version = '2.0.0'
WHERE app_version IS NULL;

-- Fix the Row-Level Security (RLS) violation error
-- This allows the frontend (using the anon key) to read, insert, and update the settings.
ALTER TABLE "PsychE_Settings" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on PsychE_Settings" ON "PsychE_Settings";
CREATE POLICY "Allow public read access on PsychE_Settings" ON "PsychE_Settings" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access on PsychE_Settings" ON "PsychE_Settings";
CREATE POLICY "Allow public insert access on PsychE_Settings" ON "PsychE_Settings" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on PsychE_Settings" ON "PsychE_Settings";
CREATE POLICY "Allow public update access on PsychE_Settings" ON "PsychE_Settings" FOR UPDATE USING (true);
