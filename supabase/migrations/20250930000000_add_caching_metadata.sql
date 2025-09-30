-- Add caching metadata columns to github_repositories table
ALTER TABLE public.github_repositories
ADD COLUMN last_fetched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_commit_sha TEXT,
ADD COLUMN fetch_status TEXT DEFAULT 'never_fetched',
ADD COLUMN last_error_message TEXT,
ADD COLUMN fetch_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.github_repositories.last_fetched_at IS 'Timestamp of the last successful commit fetch from GitHub API';
COMMENT ON COLUMN public.github_repositories.last_commit_sha IS 'SHA hash of the most recent commit that was fetched';
COMMENT ON COLUMN public.github_repositories.fetch_status IS 'Status of last fetch attempt: never_fetched, success, error, rate_limited';
COMMENT ON COLUMN public.github_repositories.last_error_message IS 'Error message from the last failed fetch attempt';
COMMENT ON COLUMN public.github_repositories.fetch_count IS 'Number of successful fetch operations performed';

-- Create index for performance on frequently queried columns
CREATE INDEX idx_github_repositories_last_fetched_at ON public.github_repositories(last_fetched_at);
CREATE INDEX idx_github_repositories_fetch_status ON public.github_repositories(fetch_status);