import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GitCommit, Calendar, User, Loader2, RefreshCw } from 'lucide-react';

interface Commit {
  id: string;
  sha: string;
  message: string;
  author_name: string;
  author_email: string;
  commit_date: string;
  enhanced_category: string;
}

interface Repository {
  id: string;
  owner: string;
  repo: string;
  repo_url: string;
  created_at: string;
}

interface GitHubCommitTimelineProps {
  repositories: Repository[];
}

export const GitHubCommitTimeline: React.FC<GitHubCommitTimelineProps> = ({ repositories }) => {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  useEffect(() => {
    if (repositories.length > 0 && !selectedRepo) {
      setSelectedRepo(repositories[0]);
    }
  }, [repositories, selectedRepo]);

  useEffect(() => {
    if (selectedRepo) {
      loadCommits(selectedRepo.id);
    }
  }, [selectedRepo]);

  const loadCommits = async (repoId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('github_commits')
        .select('*')
        .eq('repo_id', repoId)
        .order('commit_date', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      setCommits(data || []);
    } catch (error: any) {
      console.error('Error loading commits:', error);
      toast({
        title: "Error",
        description: "Failed to load commits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestCommits = async () => {
    if (!selectedRepo) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('github-integration', {
        body: {
          action: 'fetch-commits',
          repoId: selectedRepo.id,
        },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Commits Updated",
          description: data.message,
        });
        await loadCommits(selectedRepo.id);
      } else {
        throw new Error(data.error || 'Failed to fetch commits');
      }
    } catch (error: any) {
      console.error('Error fetching commits:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch commits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Feature': return 'bg-blue-500';
      case 'Bugfix': return 'bg-red-500';
      case 'Documentation': return 'bg-green-500';
      case 'Refactor': return 'bg-purple-500';
      case 'Test': return 'bg-yellow-500';
      case 'Style': return 'bg-pink-500';
      case 'Chore': return 'bg-gray-500';
      default: return 'bg-slate-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (repositories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <GitCommit className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No repositories added yet</p>
          <p className="text-sm text-muted-foreground">Add a GitHub repository to view commit history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Repository Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Repository Timeline</span>
            <Button
              onClick={fetchLatestCommits}
              disabled={loading || !selectedRepo}
              size="sm"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Commits
            </Button>
          </CardTitle>
          <CardDescription>
            Select a repository to view its commit history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {repositories.map((repo) => (
              <Button
                key={repo.id}
                variant={selectedRepo?.id === repo.id ? "default" : "outline"}
                onClick={() => setSelectedRepo(repo)}
                size="sm"
              >
                {repo.owner}/{repo.repo}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commit Timeline */}
      {selectedRepo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="h-5 w-5" />
              Commits for {selectedRepo.owner}/{selectedRepo.repo}
            </CardTitle>
            <CardDescription>
              {commits.length} commits loaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading commits...
              </div>
            ) : commits.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No commits found. Click "Refresh Commits" to fetch from GitHub.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {commits.map((commit, index) => (
                  <div key={commit.id} className="relative">
                    {index < commits.length - 1 && (
                      <div className="absolute left-3 top-8 bottom-0 w-px bg-border" />
                    )}
                    <div className="flex gap-4">
                      <div className={`w-6 h-6 rounded-full ${getCategoryColor(commit.enhanced_category)} flex-shrink-0 relative z-10`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {commit.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{commit.author_name}</span>
                              <Calendar className="h-3 w-3 ml-2" />
                              <span>{formatDate(commit.commit_date)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {commit.enhanced_category}
                            </Badge>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {commit.sha.substring(0, 7)}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};