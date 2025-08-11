-- Insert demo company
INSERT INTO companies (id, name, email, subscription_plan) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Demo Tech Company', 'demo@company.com', 'premium');

-- Insert demo user (this would normally be handled by Supabase Auth)
-- Note: In a real setup, the user ID would come from Supabase Auth
INSERT INTO users (id, company_id, email, name, role) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'demo@company.com', 'Demo User', 'company_admin');

-- Insert demo job descriptions
INSERT INTO job_descriptions (id, company_id, title, description, requirements, location, salary_range, employment_type, status, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Senior Software Engineer', 
'We are looking for a Senior Software Engineer to join our growing team. You will be responsible for designing, developing, and maintaining scalable web applications using modern technologies.',
'5+ years of experience in software development, Strong knowledge of JavaScript/TypeScript, Experience with React and Node.js, Familiarity with cloud platforms (AWS/GCP), Strong problem-solving skills',
'San Francisco, CA', '$120,000 - $160,000', 'full-time', 'active', '550e8400-e29b-41d4-a716-446655440001'),

('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Frontend Developer', 
'Join our frontend team to build beautiful and responsive user interfaces. You will work closely with designers and backend developers to create amazing user experiences.',
'3+ years of frontend development experience, Expert knowledge of React, HTML5, CSS3, Experience with modern build tools, Understanding of responsive design principles',
'Remote', '$80,000 - $110,000', 'full-time', 'active', '550e8400-e29b-41d4-a716-446655440001');

-- Insert demo candidates
INSERT INTO candidates (id, job_id, name, email, phone, source_platform, current_stage, qualification_status) VALUES 
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'John Smith', 'john.smith@email.com', '+1-555-0123', 'linkedin', 'screening', 'qualified'),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', 'sarah.johnson@email.com', '+1-555-0124', 'indeed', 'technical_1', 'qualified'),
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', 'Mike Davis', 'mike.davis@email.com', '+1-555-0125', 'monster', 'applied', 'pending');

-- Insert demo interview rounds
INSERT INTO interview_rounds (id, candidate_id, job_id, round_type, scheduled_at, status, result) VALUES 
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'screening', NOW() + INTERVAL '2 days', 'scheduled', NULL),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'technical_1', NOW() + INTERVAL '3 days', 'scheduled', NULL);

-- Insert demo activity logs
INSERT INTO activity_logs (company_id, job_id, candidate_id, action, details) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'Candidate Applied', '{"source": "linkedin", "status": "new"}'),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005', 'Interview Scheduled', '{"round": "technical_1", "status": "scheduled"}'),
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440003', NULL, 'Job Posted', '{"platforms": ["linkedin", "indeed"], "status": "active"}');
