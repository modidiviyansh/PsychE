-- PsychE Version 3.0: Add Keywords to Modules
-- This script adds the description column to PsychE_Modules and populates it 
-- with the legacy V2.0 keywords to restore "Smart Suggestions" test functionality.

ALTER TABLE "PsychE_Modules" ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE "PsychE_Modules" 
SET description = 'emotional crying outburst unstable mood angry sad regulation' 
WHERE name = 'Emotional Stability Baseline';

UPDATE "PsychE_Modules" 
SET description = 'cognitive problem solving logic puzzle challenge frustration' 
WHERE name = 'Cognitive Problem Solving';

UPDATE "PsychE_Modules" 
SET description = 'family parent sibling home conflict divorce abuse' 
WHERE name = 'Family Dynamics Index';

UPDATE "PsychE_Modules" 
SET description = 'phq9 depression phq-9 depressed mood sad suicidal' 
WHERE name = 'PHQ-9 Depression Screener';
