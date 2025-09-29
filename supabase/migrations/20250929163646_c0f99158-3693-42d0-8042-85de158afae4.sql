-- Create table for storing GitHub repositories per user
CREATE TABLE public.github_repositories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, owner, repo)
);

-- Enable Row Level Security
ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own repositories" 
ON public.github_repositories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own repositories" 
ON public.github_repositories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own repositories" 
ON public.github_repositories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own repositories" 
ON public.github_repositories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_github_repositories_updated_at
BEFORE UPDATE ON public.github_repositories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for storing commit data
CREATE TABLE public.github_commits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_id UUID NOT NULL REFERENCES public.github_repositories(id) ON DELETE CASCADE,
  sha TEXT NOT NULL,
  message TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  commit_date TIMESTAMP WITH TIME ZONE NOT NULL,
  enhanced_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(repo_id, sha)
);

-- Enable Row Level Security for commits
ALTER TABLE public.github_commits ENABLE ROW LEVEL SECURITY;

-- Create policies for commit access (through repository ownership)
CREATE POLICY "Users can view commits for their repositories" 
ON public.github_commits 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.github_repositories 
    WHERE id = repo_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert commits for their repositories" 
ON public.github_commits 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.github_repositories 
    WHERE id = repo_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update commits for their repositories" 
ON public.github_commits 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.github_repositories 
    WHERE id = repo_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete commits for their repositories" 
ON public.github_commits 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.github_repositories 
    WHERE id = repo_id AND user_id = auth.uid()
  )
);

-- Enable real-time for both tables
ALTER TABLE public.github_repositories REPLICA IDENTITY FULL;
ALTER TABLE public.github_commits REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.github_repositories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.github_commits;