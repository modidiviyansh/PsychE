-- PsychE Version 3.0: Comprehensive Test Library Seeding
-- This script safely injects 32 distinct questions (8 per module) to rigorously test
-- randomization, pagination limits, and reverse scoring logic.

DO $$
DECLARE
    mod1_id UUID;
    mod2_id UUID;
    mod3_id UUID;
    spa_id UUID;
BEGIN
    -- 1. Dynamically retrieve UUIDs for the 4 core modules
    SELECT id INTO mod1_id FROM "PsychE_Modules" WHERE name = 'Emotional Stability Baseline' LIMIT 1;
    SELECT id INTO mod2_id FROM "PsychE_Modules" WHERE name = 'Cognitive Problem Solving' LIMIT 1;
    SELECT id INTO mod3_id FROM "PsychE_Modules" WHERE name = 'Family Dynamics Index' LIMIT 1;
    SELECT id INTO spa_id FROM "PsychE_Modules" WHERE name = 'PHQ-9 Depression Screener' LIMIT 1;

    -- Safety Check: Ensure modules exist before inserting
    IF mod1_id IS NULL OR mod2_id IS NULL OR mod3_id IS NULL OR spa_id IS NULL THEN
        RAISE EXCEPTION 'One or more required PsychE_Modules were not found. Ensure update_schema_v12.sql has been run.';
    END IF;

    -- 2. Clear existing questions for these modules to prevent duplicates during testing
    DELETE FROM "PsychE_Questions" WHERE module_id IN (mod1_id, mod2_id, mod3_id, spa_id);

    -- 3. Seed Emotional Stability Baseline (COMPE)
    -- JSON Label: Agreement
    INSERT INTO "PsychE_Questions" (module_id, prompt_text, is_reverse_scored, custom_labels) VALUES
    (mod1_id, 'I can quickly calm down after being upset.', false, '{"1": "Strongly Disagree", "2": "Disagree", "3": "Agree", "4": "Strongly Agree"}'),
    (mod1_id, 'I easily get overwhelmed by my feelings.', true, '{"1": "Strongly Disagree", "2": "Disagree", "3": "Agree", "4": "Strongly Agree"}'),
    (mod1_id, 'I am able to express my emotions clearly to others.', false, '{"1": "Strongly Disagree", "2": "Disagree", "3": "Agree", "4": "Strongly Agree"}'),
    (mod1_id, 'I find it difficult to bounce back from disappointment.', true, '{"1": "Strongly Disagree", "2": "Disagree", "3": "Agree", "4": "Strongly Agree"}'),
    (mod1_id, 'I maintain a positive attitude during stressful situations.', false, '{"1": "Strongly Disagree", "2": "Disagree", "3": "Agree", "4": "Strongly Agree"}'),
    (mod1_id, 'I often feel emotionally drained by minor events.', true, '{"1": "Strongly Disagree", "2": "Disagree", "3": "Agree", "4": "Strongly Agree"}'),
    (mod1_id, 'I can recognize when I am feeling frustrated.', false, '{"1": "Strongly Disagree", "2": "Disagree", "3": "Agree", "4": "Strongly Agree"}'),
    (mod1_id, 'I struggle to control my temper when provoked.', true, '{"1": "Strongly Disagree", "2": "Disagree", "3": "Agree", "4": "Strongly Agree"}');

    -- 4. Seed Cognitive Problem Solving (COMPE)
    -- JSON Label: Frequency
    INSERT INTO "PsychE_Questions" (module_id, prompt_text, is_reverse_scored, custom_labels) VALUES
    (mod2_id, 'I approach complex tasks in a logical, step-by-step manner.', false, '{"1": "Never", "2": "Rarely", "3": "Often", "4": "Always"}'),
    (mod2_id, 'I give up quickly when a problem seems too difficult.', true, '{"1": "Never", "2": "Rarely", "3": "Often", "4": "Always"}'),
    (mod2_id, 'I evaluate multiple solutions before making a decision.', false, '{"1": "Never", "2": "Rarely", "3": "Often", "4": "Always"}'),
    (mod2_id, 'I find it hard to adapt when my initial plan fails.', true, '{"1": "Never", "2": "Rarely", "3": "Often", "4": "Always"}'),
    (mod2_id, 'I actively seek out information to resolve uncertainties.', false, '{"1": "Never", "2": "Rarely", "3": "Often", "4": "Always"}'),
    (mod2_id, 'I act impulsively without considering the consequences.', true, '{"1": "Never", "2": "Rarely", "3": "Often", "4": "Always"}'),
    (mod2_id, 'I am able to break down large tasks into manageable parts.', false, '{"1": "Never", "2": "Rarely", "3": "Often", "4": "Always"}'),
    (mod2_id, 'I struggle to see alternative perspectives when problem-solving.', true, '{"1": "Never", "2": "Rarely", "3": "Often", "4": "Always"}');

    -- 5. Seed Family Dynamics Index (COMPE)
    -- JSON Label: Truth/Accuracy
    INSERT INTO "PsychE_Questions" (module_id, prompt_text, is_reverse_scored, custom_labels) VALUES
    (mod3_id, 'I feel supported and encouraged by my family members.', false, '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod3_id, 'Disagreements at home frequently escalate into shouting.', true, '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod3_id, 'My family spends meaningful time together on a regular basis.', false, '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod3_id, 'I feel uncomfortable discussing my problems with my caregivers.', true, '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod3_id, 'My caregivers show active interest in my daily life.', false, '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod3_id, 'Expectations at home are unclear and constantly changing.', true, '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod3_id, 'My family is able to resolve conflicts peacefully.', false, '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}'),
    (mod3_id, 'I often feel isolated or ignored when at home.', true, '{"1": "Not True", "2": "A little true", "3": "Pretty true", "4": "Very true"}');

    -- 6. Seed PHQ-9 Depression Screener (PsycheSPA)
    -- JSON Label: Severity/Time
    -- Note: Added reverse-scored positive frames to ensure logic testing requirements are met.
    INSERT INTO "PsychE_Questions" (module_id, prompt_text, is_reverse_scored, custom_labels) VALUES
    (spa_id, 'Feeling down, depressed, or hopeless.', false, '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}'),
    (spa_id, 'Little interest or pleasure in doing things.', false, '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}'),
    (spa_id, 'Trouble falling or staying asleep, or sleeping too much.', false, '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}'),
    (spa_id, 'Feeling tired or having little energy.', false, '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}'),
    (spa_id, 'Poor appetite or overeating.', false, '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}'),
    (spa_id, 'Feeling bad about yourself or that you are a failure.', false, '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}'),
    (spa_id, 'Feeling optimistic and hopeful about the future.', true, '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}'),
    (spa_id, 'Feeling full of energy and motivation to take on the day.', true, '{"1": "Not at all", "2": "Several days", "3": "More than half the days", "4": "Nearly every day"}');

END $$;
