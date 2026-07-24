-- PsychE Version 3.0 Relational Assessment Schema

CREATE TABLE IF NOT EXISTS "PsychE_Modules" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('COMPE', 'PsycheSPA')),
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PsychE_Questions" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES "PsychE_Modules"(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    is_reverse_scored BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    custom_labels JSONB DEFAULT '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PsychE_Responses" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id UUID NOT NULL REFERENCES "PsychE_Counseling_Logs"(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES "PsychE_Questions"(id) ON DELETE CASCADE,
    score_value INTEGER CHECK (score_value >= 1 AND score_value <= 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data for Initial Modules and Questions
DO $$
DECLARE
    mod1_id UUID;
    mod2_id UUID;
    mod3_id UUID;
    spa_id UUID;
BEGIN
    -- Insert 3 COMPE Modules
    INSERT INTO "PsychE_Modules" (name, type, is_locked) 
    VALUES ('Emotional Stability Baseline', 'COMPE', false) 
    RETURNING id INTO mod1_id;

    INSERT INTO "PsychE_Modules" (name, type, is_locked) 
    VALUES ('Cognitive Problem Solving', 'COMPE', false) 
    RETURNING id INTO mod2_id;

    INSERT INTO "PsychE_Modules" (name, type, is_locked) 
    VALUES ('Family Dynamics Index', 'COMPE', false) 
    RETURNING id INTO mod3_id;

    -- Insert 1 PsycheSPA Module
    INSERT INTO "PsychE_Modules" (name, type, is_locked) 
    VALUES ('PHQ-9 Depression Screener', 'PsycheSPA', true) 
    RETURNING id INTO spa_id;

    -- Seed Questions for Emotional Stability Baseline
    INSERT INTO "PsychE_Questions" (module_id, prompt_text, custom_labels) VALUES
    (mod1_id, 'Student demonstrates age-appropriate emotional regulation', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod1_id, 'Student recovers quickly from emotional setbacks', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod1_id, 'Student can articulate their feelings accurately', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod1_id, 'Student shows appropriate emotional responses to peers', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}');

    -- Seed Questions for Cognitive Problem Solving
    INSERT INTO "PsychE_Questions" (module_id, prompt_text, custom_labels) VALUES
    (mod2_id, 'Approaches new problems logically', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod2_id, 'Persists when faced with a difficult task', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod2_id, 'Asks for help when appropriate', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod2_id, 'Learns from mistakes and adapts strategy', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}');

    -- Seed Questions for Family Dynamics Index
    INSERT INTO "PsychE_Questions" (module_id, prompt_text, custom_labels) VALUES
    (mod3_id, 'Student reports feeling safe at home', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod3_id, 'Student describes positive interactions with caregivers', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod3_id, 'Student shows signs of adequate physical care and sleep', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod3_id, 'Caregivers are responsive to school communication', '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}');

    -- Seed Questions for PHQ-9 Depression Screener (Custom Labels)
    INSERT INTO "PsychE_Questions" (module_id, prompt_text, custom_labels) VALUES
    (spa_id, 'Little interest or pleasure in doing things', '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}'),
    (spa_id, 'Feeling down, depressed, or hopeless', '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}'),
    (spa_id, 'Trouble falling or staying asleep, or sleeping too much', '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}'),
    (spa_id, 'Feeling tired or having little energy', '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}');
END $$;
