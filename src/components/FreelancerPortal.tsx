import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitHubCommitCharts } from './GitHubCommitCharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, GitBranch, Clock, User, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface Repository {
  id: string;
  owner: string;
  repo: string;
  repo_url: string;
  created_at: string;
}

interface ProjectCode {
  id: string;
  code: string;
  expires_at: string;
  is_active: boolean;
  allows_freelancer_access: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  generated_at: string;
  used_count: number;
}

interface FreelancerPortalProps {
  codeId: string;
  freelancerName: string;
  onBack: () => void;
}

export const FreelancerPortal = ({ codeId, freelancerName, onBack }: FreelancerPortalProps) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [projectCode, setProjectCode] = useState<ProjectCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    loadProjectData();
  }, [codeId]);

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (projectCode) {
        const now = new Date();
        const expiresAt = new Date(projectCode.expires_at);
        const timeRemaining = expiresAt.getTime() - now.getTime();
        
        if (timeRemaining <= 0) {
          setTimeLeft('Expired');
          return;
        }

        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [projectCode]);

  const loadProjectData = async () => {
    try {
      setLoading(true);

      // Get project code details
      const { data: codeData, error: codeError } = await supabase
        .from('project_codes')
        .select('*')
        .eq('id', codeId)
        .single();

      if (codeError || !codeData) {
        toast({
          title: "Error",
          description: "Could not load project details",
          variant: "destructive",
        });
        return;
      }

      setProjectCode(codeData);

      // Get repositories associated with this project/user
      const { data: repoData, error: repoError } = await supabase
        .from('github_repositories')
        .select('*')
        .order('created_at', { ascending: false });

      if (repoError) {
        console.error('Error loading repositories:', repoError);
        toast({
          title: "Warning",
          description: "Could not load repository data",
          variant: "destructive",
        });
      } else {
        setRepositories(repoData || []);
      }

    } catch (error) {
      console.error('Error loading project data:', error);
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <Card className="w-full max-w-md card-glass">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-lg font-medium text-muted-foreground">Loading project data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="card-glass">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onBack}
                  className="p-2 hover:bg-primary/10 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-primary" />
                </Button>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="brand-logo gradient-text text-xl md:text-2xl">
                    Freelancer Portal
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Welcome, {freelancerName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Freelancer Access
                </Badge>
                {timeLeft && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeLeft}
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Project Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{repositories.length}</p>
                  <p className="text-xs text-muted-foreground">Repositories</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-500">{projectCode?.code}</p>
                  <p className="text-xs text-muted-foreground">Access Code</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-medium text-orange-500">Expires</p>
                  <p className="text-xs text-muted-foreground">
                    {projectCode ? formatDate(projectCode.expires_at) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* GitHub Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Repository Analytics
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                View commit activity and contributor insights for project repositories
              </p>
            </CardHeader>
            <CardContent>
              {repositories.length > 0 ? (
                <GitHubCommitCharts repositories={repositories} />
              ) : (
                <div className="text-center py-8">
                  <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No repositories available</p>
                  <p className="text-sm text-muted-foreground">
                    The project owner hasn't added any GitHub repositories yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};