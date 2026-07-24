-- Add assessment_data column to Counseling Logs to store dynamic assessment results
ALTER TABLE "PsychE_Counseling_Logs"
ADD COLUMN IF NOT EXISTS assessment_data JSONB;

-- Create PsychE_Assessment_Master table
CREATE TABLE IF NOT EXISTS "PsychE_Assessment_Master" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('COMPE', 'PsycheSPA')),
    keywords TEXT[] NOT NULL,
    schema JSONB NOT NULL
);

-- RLS Policies
ALTER TABLE "PsychE_Assessment_Master" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on PsychE_Assessment_Master" ON "PsychE_Assessment_Master";
CREATE POLICY "Allow public read access on PsychE_Assessment_Master" ON "PsychE_Assessment_Master" FOR SELECT USING (true);

-- Insert Sample Assessments
INSERT INTO "PsychE_Assessment_Master" (title, type, keywords, schema) VALUES 
(
    'General Anxiety Screener (COMPE)',
    'COMPE',
    ARRAY['anxious', 'stress', 'panic', 'worry', 'anxiety', 'nervous', 'overwhelmed'],
    '{
        "questions": [
            "Feeling nervous, anxious, or on edge",
            "Not being able to stop or control worrying",
            "Trouble relaxing"
        ]
    }'::jsonb
),
(
    'Focus Metrics (PsycheSPA)',
    'PsycheSPA',
    ARRAY['focus', 'distracted', 'hyperactive', 'attention', 'adhd', 'fidgeting'],
    '{
        "fields": [
            "Observed Disruptions (Count)",
            "Task Completion Estimate (%)"
        ]
    }'::jsonb
)
ON CONFLICT DO NOTHING;
