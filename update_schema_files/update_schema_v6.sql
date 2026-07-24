-- Create PsychE_Question_Library table
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "PsychE_Question_Library" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pillar VARCHAR(50) NOT NULL,
    question_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Create PsychE_Assessments table
CREATE TABLE IF NOT EXISTS "PsychE_Assessments" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_uuid UUID REFERENCES "PsychE_Students"(id) ON DELETE CASCADE,
    counsellor_name VARCHAR(100),
    date_taken TIMESTAMP DEFAULT NOW(),
    overall_score NUMERIC(4,2),
    assessment_data JSONB
);

-- RLS Policies
ALTER TABLE "PsychE_Question_Library" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on PsychE_Question_Library" ON "PsychE_Question_Library";
CREATE POLICY "Allow public read access on PsychE_Question_Library" ON "PsychE_Question_Library" FOR SELECT USING (true);

ALTER TABLE "PsychE_Assessments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access on PsychE_Assessments" ON "PsychE_Assessments";
CREATE POLICY "Allow public access on PsychE_Assessments" ON "PsychE_Assessments" FOR ALL USING (true);

-- Insert Sample Questions to feed the generator
INSERT INTO "PsychE_Question_Library" (pillar, question_text) VALUES 
('Cognitive', 'You discover you missed a major assignment deadline. Walk me through your immediate next steps to resolve it.'),
('Cognitive', 'You receive conflicting advice from two teachers on a project. How do you decide which path to follow?'),
('Emotional', 'A close friend suddenly stops talking to you without explanation. How do you process this emotionally and what do you do?'),
('Emotional', 'You receive a lower grade than expected on a test you studied hard for. Describe your initial reaction and how you cope.'),
('Family', 'Your parents disagree with a major academic or extracurricular choice you want to make. How do you approach the conversation?'),
('Family', 'You are expected to attend a family event, but have an important exam the next day. How do you balance these obligations?'),
('Career', 'You realize the career path you have been aiming for no longer interests you. What is your strategy to pivot?'),
('Career', 'You are asked to lead a group project but you feel underqualified. Do you accept? Why or why not?'),
('Personality', 'Describe a situation where you had to work with someone you strongly disliked. How did you handle the dynamic?'),
('Personality', 'You witness a peer taking credit for someone else''s work. What action, if any, do you take?'),
('Skills', 'You are given a complex task with no instructions and a tight deadline. How do you begin?'),
('Skills', 'How do you prioritize your time when you have three urgent tasks due on the exact same day?'),
('Cognitive', 'You read an article that completely challenges a deeply held belief you have. How do you evaluate the new information?'),
('Emotional', 'Describe a time you felt overwhelmed by expectations. How did you ground yourself?'),
('Career', 'Where do you see the most significant gap in your current skill set, and how do you plan to address it?')
ON CONFLICT DO NOTHING;
