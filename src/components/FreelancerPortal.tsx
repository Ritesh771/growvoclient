import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { GitHubCommitCharts } from './GitHubCommitCharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, GitBranch, Clock, User, Zap, RefreshCw, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface Repository {
  id: string;
  owner: string;
  repo: string;
  repo_url: string;
  created_at: string;
  updated_at: string;
  last_fetched_at: string | null;
  last_commit_sha: string | null;
  fetch_status: string | null;
  last_error_message: string | null;
  fetch_count: number | null;
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
  onSwitchProject?: () => void; // Add this prop for switching projects
}

export const FreelancerPortal = ({ codeId, freelancerName, onBack, onSwitchProject }: FreelancerPortalProps) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [projectCode, setProjectCode] = useState<ProjectCode | null>(null);
  const [clientName, setClientName] = useState<string>('');
  const [clientColor, setClientColor] = useState<string>('blue');
  const [loading, setLoading] = useState(true);

  // Generate consistent color based on client identifier
  const generateClientColor = (identifier: string): string => {
    const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'indigo', 'teal', 'cyan'];
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [cacheStatus, setCacheStatus] = useState<{[repoId: string]: {
    lastFetchedAt: string | null;
    fetchStatus: string | null;
    fetchCount: number | null;
    errorMessage: string | null;
    nextFetchAt: string | null;
  }}>({});

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
      console.log('FreelancerPortal: Loading project data for codeId:', codeId);

      // Get project code details
      const { data: codeData, error: codeError } = await supabase
        .from('project_codes')
        .select('*')
        .eq('id', codeId)
        .single();

      console.log('FreelancerPortal: Project code query result:', { codeData, codeError });

      if (codeError || !codeData) {
        toast({
          title: "Error",
          description: "Could not load project details",
          variant: "destructive",
        });
        return;
      }

      setProjectCode(codeData);

      // Get repositories associated with this project/user (only repositories owned by the code creator)
      console.log('FreelancerPortal: Calling freelancer-access function with codeId:', codeId);
      const { data: repoData, error: repoError } = await supabase.functions.invoke('freelancer-access', {
        body: {
          action: 'get-repositories',
          codeId: codeId,
        },
      });

      console.log('FreelancerPortal: Freelancer-access function result:', { repoData, repoError });

      if (repoError) {
        throw repoError;
      }

      if (repoData.success) {
        setRepositories(repoData.repositories || []);
        // Use the client name from the function response
        const clientName = repoData.clientName || `Client ${codeData.code.slice(-4)}`;
        setClientName(clientName);
        setClientColor(generateClientColor(clientName));
        console.log('FreelancerPortal: Set client name to:', clientName);
        console.log('FreelancerPortal: Set repositories to:', repoData.repositories);
      } else {
        throw new Error(repoData.error || 'Failed to load repositories');
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

  const loadCacheStatus = () => {
    const status: {[repoId: string]: {
      lastFetchedAt: string | null;
      fetchStatus: string | null;
      fetchCount: number | null;
      errorMessage: string | null;
      nextFetchAt: string | null;
    }} = {};
    repositories.forEach(repo => {
      status[repo.id] = {
        lastFetchedAt: repo.last_fetched_at,
        fetchStatus: repo.fetch_status,
        fetchCount: repo.fetch_count,
        errorMessage: repo.last_error_message,
        nextFetchAt: null
      };
    });
    setCacheStatus(status);
  };

  useEffect(() => {
    if (repositories.length > 0) {
      loadCacheStatus();
    }
  }, [repositories]);

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
                
                <div className="p-2 rounded-lg bg-primary/10 overflow-hidden">
                  <img 
                    src="/growvo.png" 
                    alt="Growvo Logo" 
                    className="h-6 w-6 object-contain"
                  />
                </div>
                <div>
                  <CardTitle className="brand-logo gradient-text text-xl md:text-2xl">
                    Freelancer Portal
                  </CardTitle>
                  <div className="text-muted-foreground text-sm space-y-1">
                    <p>Welcome, {freelancerName}</p>
                    {clientName && (
                      <p className="text-primary font-medium">
                        Viewing project by: 
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ml-1 ${
                          clientColor === 'blue' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          clientColor === 'green' ? 'bg-green-100 text-green-800 border border-green-200' :
                          clientColor === 'purple' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          clientColor === 'orange' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          clientColor === 'pink' ? 'bg-pink-100 text-pink-800 border border-pink-200' :
                          clientColor === 'indigo' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                          clientColor === 'teal' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                          clientColor === 'cyan' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            clientColor === 'blue' ? 'bg-blue-500' :
                            clientColor === 'green' ? 'bg-green-500' :
                            clientColor === 'purple' ? 'bg-purple-500' :
                            clientColor === 'orange' ? 'bg-orange-500' :
                            clientColor === 'pink' ? 'bg-pink-500' :
                            clientColor === 'indigo' ? 'bg-indigo-500' :
                            clientColor === 'teal' ? 'bg-teal-500' :
                            clientColor === 'cyan' ? 'bg-cyan-500' :
                            'bg-gray-500'
                          }`} />
                          {clientName}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Freelancer Access
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Code: {projectCode?.code}
                </Badge>
                {timeLeft && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeLeft}
                  </Badge>
                )}
                {onSwitchProject && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 hover:bg-primary/10 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Switch Project
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Switch to Different Client Project?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will end your current session with <strong>{clientName || 'this client'}</strong> and return you to the access code entry screen. 
                          You'll need to enter a new 6-digit code to access a different client's project.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Stay Here</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={onSwitchProject}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Switch Project
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
              
              {/* Cache Status */}
              {repositories.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Data Freshness Status</h4>
                  <div className="space-y-2">
                    {repositories.map((repo) => {
                      const status = cacheStatus[repo.id];
                      if (!status) return null;
                      
                      return (
                        <div key={repo.id} className="flex items-center justify-between text-xs">
                          <span className="font-medium truncate mr-2">{repo.owner}/{repo.repo}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full ${
                              status.fetchStatus === 'success' ? 'bg-green-500' :
                              status.fetchStatus === 'error' ? 'bg-red-500' :
                              status.fetchStatus === 'rate_limited' ? 'bg-yellow-500' :
                              'bg-gray-400'
                            }`} />
                            <span className="text-muted-foreground">
                              {status.lastFetchedAt
                                ? `Updated ${new Date(status.lastFetchedAt).toLocaleDateString()}`
                                : 'Never updated'
                              }
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
                <GitHubCommitCharts repositories={repositories} codeId={codeId} />
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