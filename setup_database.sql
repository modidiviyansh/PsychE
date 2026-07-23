-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to ensure a clean slate (optional, but good for testing)
DROP TABLE IF EXISTS "PsychE_Counseling_Logs";
DROP TABLE IF EXISTS "PsychE_Students";

-- Create PsychE_Students table
CREATE TABLE "PsychE_Students" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    fathers_name VARCHAR(255),
    mothers_name VARCHAR(255),
    mobile VARCHAR(20),
    email VARCHAR(255),
    course VARCHAR(100),
    enrolled_date DATE,
    risk_level VARCHAR(20) DEFAULT 'Low',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create PsychE_Settings table
CREATE TABLE "PsychE_Settings" (
    id INT PRIMARY KEY DEFAULT 1,
    daily_session_capacity INT DEFAULT 7
);

INSERT INTO "PsychE_Settings" (id, daily_session_capacity) VALUES (1, 7);

-- Create PsychE_Counseling_Logs table
CREATE TABLE "PsychE_Counseling_Logs" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_uuid UUID NOT NULL REFERENCES "PsychE_Students"(id) ON DELETE CASCADE,
    counselor_name VARCHAR(255) NOT NULL,
    session_date TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_date DATE,
    session_status VARCHAR(20) DEFAULT 'Scheduled',
    interaction_type VARCHAR(50) DEFAULT 'Session',
    reason VARCHAR(255) NOT NULL,
    student_response TEXT,
    recommended_action TEXT,
    file_updated BOOLEAN DEFAULT FALSE,
    notification_sent BOOLEAN DEFAULT FALSE,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    follow_up_status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Dummy Data for GCM Convent School
INSERT INTO "PsychE_Students" (id, student_id, full_name, fathers_name, mothers_name, mobile, email, course, enrolled_date)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'STU-2026-042', 'Alice Johnson', 'Robert Johnson', 'Mary Johnson', '+91 98765 43210', 'alice.j@student.gcm.edu', '10th Grade, Section A', '2024-08-15'),
    ('22222222-2222-2222-2222-222222222222', 'STU-2026-089', 'Michael Smith', 'James Smith', 'Linda Smith', '+91 98765 43211', 'michael.s@student.gcm.edu', '12th Grade, Section B', '2022-08-10'),
    ('33333333-3333-3333-3333-333333333333', 'STU-2026-105', 'Sarah Williams', 'David Williams', 'Susan Williams', '+91 98765 43212', 'sarah.w@student.gcm.edu', '9th Grade, Section C', '2025-08-20');

INSERT INTO "PsychE_Counseling_Logs" (student_uuid, counselor_name, session_date, reason, student_response, recommended_action, file_updated, notification_sent)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Dr. Sarah Smith', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'Academic Stress', 'Student reported feeling overwhelmed with upcoming mid-terms. Discussed time-management strategies.', 'Created a revised study schedule. Scheduled follow-up next week.', TRUE, FALSE),
    ('22222222-2222-2222-2222-222222222222', 'Dr. Sarah Smith', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Career Guidance', 'Explored interests in computer science and engineering. Student was receptive.', 'Shared resources on coding bootcamps and university prerequisites via email.', TRUE, TRUE),
    ('33333333-3333-3333-3333-333333333333', 'Mr. John Doe', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Peer Conflict', 'Discussed a recent disagreement with a classmate. Practiced de-escalation techniques.', 'Mediation session scheduled with both students.', FALSE, FALSE),
    ('11111111-1111-1111-1111-111111111111', 'Dr. Sarah Smith', CURRENT_TIMESTAMP - INTERVAL '30 days', 'Initial Assessment', 'Introductory meeting to baseline student well-being.', 'None. Student is well-adjusted.', TRUE, FALSE);
