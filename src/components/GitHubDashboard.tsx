import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GitHubRepositoryForm } from './GitHubRepositoryForm';
import { GitHubCommitTimeline } from './GitHubCommitTimeline';
import { GitHubCommitCharts } from './GitHubCommitCharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GitBranch, Clock, BarChart3, Settings, Trash2, ExternalLink, Calendar, GitCommit } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Repository {
  id: string;
  owner: string;
  repo: string;
  repo_url: string;
  created_at: string;
}

export const GitHubDashboard: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRepositories();
    
    // Set up real-time subscription for repositories
    const channel = supabase
      .channel('github-repositories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'github_repositories'
        },
        () => {
          loadRepositories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRepositories = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('github-integration', {
        body: {
          action: 'get-repositories',
        },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setRepositories(data.repositories || []);
      } else {
        throw new Error(data.error || 'Failed to load repositories');
      }
    } catch (error: any) {
      console.error('Error loading repositories:', error);
      toast({
        title: "Error",
        description: "Failed to load repositories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRepositoryAdded = () => {
    loadRepositories();
  };

  const handleDeleteRepository = async (repoId: string, repoName: string) => {
    try {
      console.log('Attempting to delete repository:', { repoId, repoName });
      
      // Try using the direct Supabase client delete instead of the Edge Function
      // This bypasses the Edge Function entirely
      const { error: deleteError } = await supabase
        .from('github_repositories')
        .delete()
        .eq('id', repoId);

      if (deleteError) {
        console.error('Direct delete error:', deleteError);
        throw deleteError;
      }

      toast({
        title: "Repository Deleted",
        description: `Repository ${repoName} deleted successfully`,
      });
      
      loadRepositories();
      
    } catch (error: any) {
      console.error('Error deleting repository:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        details: error.details || 'No additional details'
      });
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete repository",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            GitHub Repository Dashboard
          </CardTitle>
          <CardDescription>
            Track and visualize your GitHub repository commits with enhanced analytics
          </CardDescription>
        </CardHeader>
      </Card>

      {repositories.length === 0 ? (
        /* Show repository form when no repos are added */
        <div className="flex justify-center">
          <GitHubRepositoryForm onRepositoryAdded={handleRepositoryAdded} />
        </div>
      ) : (
        /* Show tabs when repositories exist */
        <Tabs defaultValue="timeline" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="charts" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Manage Repositories
              </TabsTrigger>
              <TabsTrigger value="add-repo" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Add Repository
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="timeline">
            <GitHubCommitTimeline repositories={repositories} />
          </TabsContent>

          <TabsContent value="charts">
            <GitHubCommitCharts repositories={repositories} />
          </TabsContent>

          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Manage Repositories
                </CardTitle>
                <CardDescription>
                  View and manage your connected GitHub repositories ({repositories.length} repositories)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {repositories.map((repo) => (
                    <div key={repo.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <GitBranch className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{repo.owner}/{repo.repo}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Added {new Date(repo.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(repo.repo_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View on GitHub
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Repository</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{repo.owner}/{repo.repo}</strong>? 
                                This will remove the repository and all associated commit data from your dashboard. 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteRepository(repo.id, `${repo.owner}/${repo.repo}`)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Repository
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                  
                  {repositories.length === 0 && (
                    <div className="text-center py-8">
                      <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">No repositories added</p>
                      <p className="text-sm text-muted-foreground">Add a repository to start tracking commits</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add-repo">
            <div className="flex justify-center">
              <GitHubRepositoryForm onRepositoryAdded={handleRepositoryAdded} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};