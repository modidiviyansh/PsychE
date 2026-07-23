-- Update PsychE_Students with risk_level
ALTER TABLE "PsychE_Students" 
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'Low';

-- Update PsychE_Counseling_Logs with new fields
ALTER TABLE "PsychE_Counseling_Logs"
ADD COLUMN IF NOT EXISTS interaction_type VARCHAR(50) DEFAULT 'Session',
ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS follow_up_status VARCHAR(20) DEFAULT 'Pending';

-- Optional: Update existing logs if needed
UPDATE "PsychE_Counseling_Logs" SET interaction_type = 'Session' WHERE interaction_type IS NULL;
UPDATE "PsychE_Counseling_Logs" SET follow_up_status = 'Pending' WHERE follow_up_date IS NOT NULL AND follow_up_status IS NULL;
