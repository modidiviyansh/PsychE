-- Create PsychE_Settings table
CREATE TABLE IF NOT EXISTS "PsychE_Settings" (
    id INT PRIMARY KEY DEFAULT 1,
    daily_session_capacity INT DEFAULT 7
);

-- Insert default row if not exists
INSERT INTO "PsychE_Settings" (id, daily_session_capacity)
VALUES (1, 7)
ON CONFLICT (id) DO NOTHING;

-- Update PsychE_Counseling_Logs with scheduling fields
ALTER TABLE "PsychE_Counseling_Logs"
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS session_status VARCHAR(20) DEFAULT 'Scheduled';

-- Update existing logs to have a scheduled_date based on their session_date
UPDATE "PsychE_Counseling_Logs" 
SET scheduled_date = CAST(session_date AS DATE) 
WHERE scheduled_date IS NULL;
