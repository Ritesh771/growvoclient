-- Test data for freelancer access functionality

-- Insert test user (this will be handled by auth, but for testing we'll simulate)
-- Note: In production, users are created through Supabase Auth

-- Insert test profile
INSERT INTO profiles (user_id, email) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'test@example.com')
ON CONFLICT (user_id) DO NOTHING;

-- Insert test project code
INSERT INTO project_codes (id, code, created_by, is_active, expires_at, allows_freelancer_access, created_at, updated_at) VALUES
('660e8400-e29b-41d4-a716-446655440001', '072807', '550e8400-e29b-41d4-a716-446655440000', true, NOW() + INTERVAL '30 days', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test repository
INSERT INTO github_repositories (id, user_id, owner, repo, repo_url, created_at, updated_at) VALUES
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'testowner', 'testrepo', 'https://github.com/testowner/testrepo', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test commits
INSERT INTO github_commits (repo_id, commit_date, enhanced_category, author_name) VALUES
('770e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '1 day', 'feature', 'Test Author'),
('770e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '2 days', 'bugfix', 'Test Author'),
('770e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '3 days', 'docs', 'Another Author')
ON CONFLICT (repo_id, commit_date, author_name) DO NOTHING;