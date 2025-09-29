import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitHubRepositoryForm } from './GitHubRepositoryForm';
import { GitHubCommitTimeline } from './GitHubCommitTimeline';
import { GitHubCommitCharts } from './GitHubCommitCharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { GitBranch, Clock, BarChart3 } from 'lucide-react';

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