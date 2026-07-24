-- Update PsychE_Students to include behavioral tracking engine field
ALTER TABLE "PsychE_Students"
ADD COLUMN IF NOT EXISTS engagement_modifier INT DEFAULT 0;

-- Ensure existing rows have the default value
UPDATE "PsychE_Students"
SET engagement_modifier = 0
WHERE engagement_modifier IS NULL;

-- If RLS is enabled on PsychE_Students, ensure update access is permitted
-- (Assuming public access for the internal CRM as per previous updates)
ALTER TABLE "PsychE_Students" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on PsychE_Students" ON "PsychE_Students";
CREATE POLICY "Allow public read access on PsychE_Students" ON "PsychE_Students" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access on PsychE_Students" ON "PsychE_Students";
CREATE POLICY "Allow public insert access on PsychE_Students" ON "PsychE_Students" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on PsychE_Students" ON "PsychE_Students";
CREATE POLICY "Allow public update access on PsychE_Students" ON "PsychE_Students" FOR UPDATE USING (true);
