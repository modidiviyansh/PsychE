-- Clear the old assessment master to ensure clean schema structure for V2.2
TRUNCATE TABLE "PsychE_Assessment_Master" CASCADE;

-- Insert 10-Module Objective Question Bank & Formal Tests
INSERT INTO "PsychE_Assessment_Master" (title, type, keywords, schema) VALUES 
-- 10-Module Bank (4-Point Likert)
(
    'Module 1: Emotional Regulation',
    'COMPE',
    ARRAY['emotional', 'crying', 'outburst', 'unstable', 'angry', 'sad', 'regulation'],
    '{
        "questions": [
            { "question_text": "Student demonstrates age-appropriate emotional regulation", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student has frequent emotional outbursts or crying spells", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student recovers quickly from emotional setbacks", "scale_type": "4_point_likert", "is_reverse_scored": false }
        ]
    }'::jsonb
),
(
    'Module 2: Cognitive Problem Solving',
    'COMPE',
    ARRAY['cognitive', 'problem', 'solving', 'logic', 'puzzle', 'challenge', 'frustration'],
    '{
        "questions": [
            { "question_text": "Approaches new problems logically", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Gives up easily when faced with a challenge", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Learns from mistakes and adapts strategy", "scale_type": "4_point_likert", "is_reverse_scored": false }
        ]
    }'::jsonb
),
(
    'Module 3: Social Connectivity',
    'COMPE',
    ARRAY['social', 'friend', 'peer', 'isolated', 'lonely', 'bullied', 'bullying'],
    '{
        "questions": [
            { "question_text": "Initiates positive interactions with peers", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Appears isolated or withdrawn during group activities", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Maintains healthy friendships", "scale_type": "4_point_likert", "is_reverse_scored": false }
        ]
    }'::jsonb
),
(
    'Module 4: Academic Resilience',
    'COMPE',
    ARRAY['academic', 'grades', 'failing', 'resilience', 'homework', 'study', 'give up'],
    '{
        "questions": [
            { "question_text": "Takes ownership of academic mistakes", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Avoids academic tasks for fear of failure", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Sets realistic academic goals", "scale_type": "4_point_likert", "is_reverse_scored": false }
        ]
    }'::jsonb
),
(
    'Module 5: Family/Home Environment',
    'COMPE',
    ARRAY['family', 'parent', 'sibling', 'home', 'conflict', 'divorce', 'abuse'],
    '{
        "questions": [
            { "question_text": "Student reports feeling safe and supported at home", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student expresses distress regarding family conflict", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Caregivers are responsive to school communication", "scale_type": "4_point_likert", "is_reverse_scored": false }
        ]
    }'::jsonb
),
(
    'Module 6: Attention & Focus',
    'COMPE',
    ARRAY['focus', 'distracted', 'hyperactive', 'adhd', 'attention', 'fidgeting'],
    '{
        "questions": [
            { "question_text": "Can sustain attention on a task for appropriate durations", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Is easily distracted by extraneous stimuli", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Completes multi-step instructions without reminders", "scale_type": "4_point_likert", "is_reverse_scored": false }
        ]
    }'::jsonb
),
(
    'Module 7: Anxiety & Stress',
    'COMPE',
    ARRAY['anxiety', 'stress', 'worry', 'panic', 'nervous', 'overwhelmed', 'test-anxiety'],
    '{
        "questions": [
            { "question_text": "Appears relaxed in standard academic settings", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Exhibits physical signs of anxiety (fidgeting, sweating)", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Expresses excessive worry about performance", "scale_type": "4_point_likert", "is_reverse_scored": true }
        ]
    }'::jsonb
),
(
    'Module 8: Self-Esteem & Confidence',
    'COMPE',
    ARRAY['self-esteem', 'confidence', 'worth', 'failure', 'doubt', 'shy'],
    '{
        "questions": [
            { "question_text": "Expresses a positive sense of self-worth", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Makes self-deprecating remarks frequently", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Is willing to try new things and take healthy risks", "scale_type": "4_point_likert", "is_reverse_scored": false }
        ]
    }'::jsonb
),
(
    'Module 9: Behavioral Compliance',
    'COMPE',
    ARRAY['behavior', 'rule', 'defiance', 'compliance', 'authority', 'listening'],
    '{
        "questions": [
            { "question_text": "Follows classroom rules and routines", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Argues with or defies adult authority", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Accepts redirection gracefully", "scale_type": "4_point_likert", "is_reverse_scored": false }
        ]
    }'::jsonb
),
(
    'Module 10: Motivation & Drive',
    'COMPE',
    ARRAY['motivation', 'drive', 'lazy', 'care', 'goal', 'future'],
    '{
        "questions": [
            { "question_text": "Shows interest in future goals and aspirations", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Appears apathetic toward schoolwork and activities", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Takes initiative in personal or academic projects", "scale_type": "4_point_likert", "is_reverse_scored": false }
        ]
    }'::jsonb
),
-- Formal Custom MCQ Tests
(
    'PsycheSPA: WISC-V',
    'PsycheSPA',
    ARRAY['wisc', 'intelligence', 'iq', 'cognitive', 'test', 'wisc-v'],
    '{
        "questions": [
            { "question_text": "Verbal Comprehension Index (VCI) Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Visual Spatial Index (VSI) Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Fluid Reasoning Index (FRI) Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Working Memory Index (WMI) Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Processing Speed Index (PSI) Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Full Scale IQ (FSIQ) Score", "scale_type": "custom_mcq", "is_reverse_scored": false }
        ]
    }'::jsonb
),
(
    'PsycheSPA: Vineland-3',
    'PsycheSPA',
    ARRAY['vineland', 'adaptive', 'behavior', 'daily living', 'socialization'],
    '{
        "questions": [
            { "question_text": "Communication Domain Standard Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Daily Living Skills Domain Standard Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Socialization Domain Standard Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Motor Skills Domain Standard Score", "scale_type": "custom_mcq", "is_reverse_scored": false }
        ]
    }'::jsonb
);
