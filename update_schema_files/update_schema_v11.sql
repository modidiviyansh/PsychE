-- Clear the library to load the V2.2 massive enriched modules
TRUNCATE TABLE "PsychE_Assessment_Master" CASCADE;

INSERT INTO "PsychE_Assessment_Master" (title, type, keywords, schema) VALUES 
-- 1. EMOTIONAL REGULATION (30 Questions)
(
    'Module 1: Emotional Regulation',
    'COMPE',
    ARRAY['emotional', 'crying', 'outburst', 'unstable', 'angry', 'sad', 'regulation', 'mood', 'temper'],
    '{
        "questions": [
            { "question_text": "Student demonstrates age-appropriate emotional regulation", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student has frequent emotional outbursts or crying spells", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student recovers quickly from emotional setbacks", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student appears easily frustrated by minor inconveniences", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can articulate feelings rather than acting out", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student holds onto anger or grudges for long periods", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student responds well to comforting from adults", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student exhibits extreme mood swings within a single day", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can identify triggers that cause emotional distress", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student breaks or throws objects when upset", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student utilizes coping strategies (e.g., deep breathing)", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student becomes overly anxious about changes in routine", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student shows empathy when peers are distressed", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student struggles to calm down without external intervention", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student accepts disappointment gracefully", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student appears sad or withdrawn for extended periods", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student asks for help when feeling overwhelmed", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student overreacts to perceived criticism", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can compromise during disagreements", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student experiences physical symptoms (stomach ache) when upset", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student maintains a generally positive disposition", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student is easily provoked by peers", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can self-soothe after a minor injury", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student requires constant reassurance from teachers", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student takes ownership of their emotional responses", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student exhibits rigid or inflexible thinking when emotional", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student participates willingly in mindfulness activities", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student attempts to manipulate others using intense emotions", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can reflect on an outburst after calming down", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student seems emotionally detached or blunted", "scale_type": "4_point_likert", "is_reverse_scored": true }
        ]
    }'::jsonb
),
-- 2. COGNITIVE FOCUS (25 Questions)
(
    'Module 2: Cognitive Focus & Attention',
    'COMPE',
    ARRAY['cognitive', 'focus', 'attention', 'adhd', 'distracted', 'hyperactive', 'task'],
    '{
        "questions": [
            { "question_text": "Student sustains attention during lengthy instructional periods", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student is easily distracted by extraneous noise or movement", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student completes multi-step tasks without needing reminders", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student frequently misplaces necessary school materials", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student organizes their desk and backpack effectively", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student blurts out answers before a question is completed", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student waits patiently for their turn during group activities", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student appears to be daydreaming or ''zoned out''", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can transition smoothly between different subjects", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student requires constant redirection to stay on task", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student follows complex verbal instructions accurately", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student fidgets constantly or struggles to remain seated", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student checks their work for errors before submitting", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student makes careless mistakes due to rushing", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can filter out background noise to focus on a speaker", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student struggles to organize ideas when writing", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student demonstrates sustained effort on challenging tasks", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student gives up easily when a task requires sustained mental effort", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student successfully manages their time during independent work", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student interrupts others frequently during conversations", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can recall information from previous lessons accurately", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student forgets daily routines or schedules", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student utilizes planners or checklists effectively", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student hyper-focuses on preferred activities but ignores non-preferred ones", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can break down large projects into manageable steps", "scale_type": "4_point_likert", "is_reverse_scored": false }
        ]
    }'::jsonb
),
-- 3. SOCIAL & PEER DYNAMICS (25 Questions)
(
    'Module 3: Social & Peer Dynamics',
    'COMPE',
    ARRAY['social', 'friend', 'peer', 'isolated', 'lonely', 'bullied', 'bullying', 'conflict', 'sharing'],
    '{
        "questions": [
            { "question_text": "Student initiates positive interactions with peers", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student appears isolated or withdrawn during group activities", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student shares materials and takes turns willingly", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student engages in aggressive behavior (hitting, pushing) with peers", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student understands and respects personal space boundaries", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student makes inappropriate or offensive comments to peers", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can successfully join a game already in progress", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student is frequently the target of teasing or bullying", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student demonstrates sportsmanship during competitive games", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student acts bossy or attempts to control peer activities", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can interpret non-verbal social cues accurately", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student struggles to maintain a reciprocal conversation", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student defends peers who are being treated unfairly", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student excludes others from their social group", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student apologizes when they realize they have hurt someone", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student spreads rumors or engages in relational aggression", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student can identify a core group of supportive friends", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student complains frequently about having no friends", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student adapts their behavior to fit different social contexts", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student misinterprets neutral peer actions as hostile", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student resolves peer conflicts through discussion", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student holds grudges after minor social infractions", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student celebrates the successes of their peers", "scale_type": "4_point_likert", "is_reverse_scored": false },
            { "question_text": "Student appears overly dependent on one specific friend", "scale_type": "4_point_likert", "is_reverse_scored": true },
            { "question_text": "Student expresses comfort interacting with diverse groups", "scale_type": "4_point_likert", "is_reverse_scored": false }
        ]
    }'::jsonb
),
-- 4. FORMAL TEST: WISC-V
(
    'PsycheSPA: WISC-V',
    'PsycheSPA',
    ARRAY['wisc', 'intelligence', 'iq', 'cognitive', 'test', 'wisc-v'],
    '{
        "questions": [
            { "question_text": "Verbal Comprehension Index (VCI)", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Visual Spatial Index (VSI)", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Fluid Reasoning Index (FRI)", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Working Memory Index (WMI)", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Processing Speed Index (PSI)", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Full Scale IQ (FSIQ)", "scale_type": "custom_mcq", "is_reverse_scored": false }
        ]
    }'::jsonb
),
-- 5. FORMAL TEST: Vineland-3
(
    'PsycheSPA: Vineland-3',
    'PsycheSPA',
    ARRAY['vineland', 'adaptive', 'behavior', 'daily living', 'socialization'],
    '{
        "questions": [
            { "question_text": "Communication Domain Standard Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Daily Living Skills Domain Standard Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Socialization Domain Standard Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Motor Skills Domain Standard Score", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Adaptive Behavior Composite (ABC)", "scale_type": "custom_mcq", "is_reverse_scored": false }
        ]
    }'::jsonb
),
-- 6. FORMAL TEST: Conners 3
(
    'PsycheSPA: Conners 3 (ADHD)',
    'PsycheSPA',
    ARRAY['conners', 'adhd', 'attention', 'hyperactivity', 'impulsivity', 'assessment'],
    '{
        "questions": [
            { "question_text": "Inattention (T-Score)", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Hyperactivity/Impulsivity (T-Score)", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Learning Problems (T-Score)", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Executive Functioning (T-Score)", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Defiance/Aggression (T-Score)", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Peer Relations (T-Score)", "scale_type": "custom_mcq", "is_reverse_scored": false }
        ]
    }'::jsonb
),
-- 7. FORMAL TEST: PHQ-9
(
    'PsycheSPA: PHQ-9 (Depression)',
    'PsycheSPA',
    ARRAY['phq9', 'phq', 'depression', 'mood', 'sadness', 'screening'],
    '{
        "questions": [
            { "question_text": "Item 1: Little interest or pleasure", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 2: Feeling down, depressed", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 3: Trouble falling or staying asleep", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 4: Feeling tired or little energy", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 5: Poor appetite or overeating", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 6: Feeling bad about yourself", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 7: Trouble concentrating", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 8: Moving or speaking slowly/fast", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 9: Thoughts that you would be better off dead", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Total PHQ-9 Score (0-27)", "scale_type": "custom_mcq", "is_reverse_scored": false }
        ]
    }'::jsonb
),
-- 8. FORMAL TEST: GAD-7
(
    'PsycheSPA: GAD-7 (Anxiety)',
    'PsycheSPA',
    ARRAY['gad7', 'gad', 'anxiety', 'worry', 'stress', 'screening'],
    '{
        "questions": [
            { "question_text": "Item 1: Feeling nervous, anxious or on edge", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 2: Not being able to stop or control worrying", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 3: Worrying too much about different things", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 4: Trouble relaxing", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 5: Being so restless that it is hard to sit still", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 6: Becoming easily annoyed or irritable", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Item 7: Feeling afraid as if something awful might happen", "scale_type": "custom_mcq", "is_reverse_scored": false },
            { "question_text": "Total GAD-7 Score (0-21)", "scale_type": "custom_mcq", "is_reverse_scored": false }
        ]
    }'::jsonb
);
