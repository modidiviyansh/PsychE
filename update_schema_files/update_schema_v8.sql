-- Create PsychE_Config_KV table for dynamic variables
CREATE TABLE IF NOT EXISTS "PsychE_Config_KV" (
    setting_key VARCHAR(255) PRIMARY KEY,
    setting_value TEXT NOT NULL
);

-- RLS Policies
ALTER TABLE "PsychE_Config_KV" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on PsychE_Config_KV" ON "PsychE_Config_KV";
CREATE POLICY "Allow public access on PsychE_Config_KV" ON "PsychE_Config_KV" FOR ALL USING (true);

-- Insert Default Settings
INSERT INTO "PsychE_Config_KV" (setting_key, setting_value) VALUES 
('assessment_cooldown_days', '30')
ON CONFLICT (setting_key) DO NOTHING;
