-- PsychE Version 3.0: Frontend CMS Schema Update
-- Adds soft-deletes, one-time edit locks, smart keywords, and global tags.

-- 1. Update PsychE_Questions for CMS tracking
ALTER TABLE "PsychE_Questions" 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS has_been_edited BOOLEAN DEFAULT FALSE;

-- 2. Update PsychE_Modules for keyword matching
ALTER TABLE "PsychE_Modules"
ADD COLUMN IF NOT EXISTS smart_keywords TEXT[] DEFAULT '{}';

-- Optional: Seed existing keywords into the array format
-- We can migrate the text we just put in `description` into `smart_keywords`
UPDATE "PsychE_Modules" 
SET smart_keywords = ARRAY['emotional', 'crying', 'outburst', 'unstable', 'mood', 'angry', 'sad', 'regulation'] 
WHERE name = 'Emotional Stability Baseline';

UPDATE "PsychE_Modules" 
SET smart_keywords = ARRAY['cognitive', 'problem', 'solving', 'logic', 'puzzle', 'challenge', 'frustration'] 
WHERE name = 'Cognitive Problem Solving';

UPDATE "PsychE_Modules" 
SET smart_keywords = ARRAY['family', 'parent', 'sibling', 'home', 'conflict', 'divorce', 'abuse'] 
WHERE name = 'Family Dynamics Index';

UPDATE "PsychE_Modules" 
SET smart_keywords = ARRAY['phq9', 'depression', 'phq-9', 'depressed', 'mood', 'sad', 'suicidal'] 
WHERE name = 'PHQ-9 Depression Screener';

-- 3. Create PsychE_System_Tags (Global Tag definitions)
CREATE TABLE IF NOT EXISTS "PsychE_System_Tags" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_name VARCHAR(255) NOT NULL UNIQUE,
    tag_category VARCHAR(100) DEFAULT 'General',
    color_hex VARCHAR(20) DEFAULT '#4ade80',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fallback alter if table already exists
ALTER TABLE "PsychE_System_Tags" ADD COLUMN IF NOT EXISTS tag_category VARCHAR(100) DEFAULT 'General';

-- 4. Create PsychE_Student_Tags (Junction table for assigning tags to students)
CREATE TABLE IF NOT EXISTS "PsychE_Student_Tags" (
    student_uuid UUID NOT NULL REFERENCES "PsychE_Students"(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES "PsychE_System_Tags"(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_uuid, tag_id)
);
