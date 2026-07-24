-- Drop the redundant Key-Value table
DROP TABLE IF EXISTS "PsychE_Config_KV";

-- Consolidate into PsychE_Settings
ALTER TABLE "PsychE_Settings"
ADD COLUMN IF NOT EXISTS assessment_cooldown_days INT DEFAULT 30;

-- Ensure existing rows have the default
UPDATE "PsychE_Settings"
SET assessment_cooldown_days = 30
WHERE assessment_cooldown_days IS NULL;

-- Populate the massive Assessment Library
-- Clear existing samples to ensure a clean slate if needed, or just rely on UPSERT/DO NOTHING.
-- We will use DO NOTHING on conflict, assuming IDs were generated automatically, so we don't conflict on ID.
-- Since title is not unique, we can just insert.

INSERT INTO "PsychE_Assessment_Master" (title, type, keywords, schema) VALUES 
-- COMPE Tests (Likert 1-5)
(
    'Emotional Stability Baseline',
    'COMPE',
    ARRAY['emotional', 'crying', 'outburst', 'unstable', 'mood', 'angry', 'sad', 'regulation'],
    '{
        "questions": [
            "Student demonstrates age-appropriate emotional regulation",
            "Student recovers quickly from emotional setbacks",
            "Student can articulate their feelings accurately",
            "Student shows appropriate emotional responses to peers"
        ]
    }'::jsonb
),
(
    'Cognitive Problem Solving',
    'COMPE',
    ARRAY['cognitive', 'problem', 'solving', 'logic', 'puzzle', 'challenge', 'frustration'],
    '{
        "questions": [
            "Approaches new problems logically",
            "Persists when faced with a difficult task",
            "Asks for help when appropriate",
            "Learns from mistakes and adapts strategy"
        ]
    }'::jsonb
),
(
    'Family Dynamics Index',
    'COMPE',
    ARRAY['family', 'parent', 'sibling', 'home', 'conflict', 'divorce', 'abuse'],
    '{
        "questions": [
            "Student reports feeling safe at home",
            "Student describes positive interactions with caregivers",
            "Student shows signs of adequate physical care and sleep",
            "Caregivers are responsive to school communication"
        ]
    }'::jsonb
),
(
    'Social Competency Screener',
    'COMPE',
    ARRAY['social', 'friend', 'peer', 'isolated', 'lonely', 'bullied', 'bullying', 'competency'],
    '{
        "questions": [
            "Initiates positive interactions with peers",
            "Resolves peer conflicts without aggression",
            "Understands social cues and boundaries",
            "Maintains healthy friendships"
        ]
    }'::jsonb
),
(
    'Anxiety & Stress Marker',
    'COMPE',
    ARRAY['anxiety', 'stress', 'worry', 'panic', 'nervous', 'overwhelmed', 'test-anxiety'],
    '{
        "questions": [
            "Exhibits physical signs of anxiety (fidgeting, sweating)",
            "Expresses excessive worry about performance",
            "Avoids tasks due to fear of failure",
            "Struggles to transition between activities"
        ]
    }'::jsonb
),
(
    'Academic Resilience Scale',
    'COMPE',
    ARRAY['academic', 'grades', 'failing', 'resilience', 'homework', 'study', 'give up'],
    '{
        "questions": [
            "Bounces back from a poor grade",
            "Takes ownership of academic mistakes",
            "Seeks out academic resources/tutoring",
            "Sets realistic academic goals"
        ]
    }'::jsonb
),
-- PsycheSPA Tests (Numeric Inputs)
(
    'WISC-V Cognitive Assessment',
    'PsycheSPA',
    ARRAY['wisc', 'intelligence', 'iq', 'cognitive', 'test', 'wisc-v'],
    '{
        "fields": [
            "Verbal Comprehension Index (VCI)",
            "Visual Spatial Index (VSI)",
            "Fluid Reasoning Index (FRI)",
            "Working Memory Index (WMI)",
            "Processing Speed Index (PSI)",
            "Full Scale IQ (FSIQ)"
        ]
    }'::jsonb
),
(
    'Woodcock-Johnson IV Achievement',
    'PsycheSPA',
    ARRAY['wj', 'wjiv', 'achievement', 'academic', 'test', 'woodcock'],
    '{
        "fields": [
            "Broad Reading Score",
            "Broad Mathematics Score",
            "Broad Written Language Score",
            "Academic Applications"
        ]
    }'::jsonb
),
(
    'Vineland-3 Adaptive Behavior',
    'PsycheSPA',
    ARRAY['vineland', 'adaptive', 'behavior', 'daily living', 'socialization'],
    '{
        "fields": [
            "Communication Domain",
            "Daily Living Skills Domain",
            "Socialization Domain",
            "Motor Skills Domain"
        ]
    }'::jsonb
),
(
    'PHQ-9 Depression Screener',
    'PsycheSPA',
    ARRAY['phq9', 'depression', 'phq-9', 'depressed', 'mood', 'sad', 'suicidal'],
    '{
        "fields": [
            "Total PHQ-9 Score (0-27)"
        ]
    }'::jsonb
);
